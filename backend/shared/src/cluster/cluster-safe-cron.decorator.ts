import { Cron, CronExpression } from '@nestjs/schedule';
import { ClusterDetector } from './cluster-detector';

/**
 * ClusterSafeCron - 集群安全的定时任务装饰器
 *
 * 用途：替代标准的 @Cron 装饰器，自动适配本地开发和 K8s 集群环境
 *
 * 行为：
 * - 本地开发模式：直接执行定时任务，无任何额外开销（0ms 延迟）
 * - K8s 集群模式：使用分布式锁，确保同一时刻只有一个 Pod 执行任务
 *
 * 使用方法：
 * ```typescript
 * import { ClusterSafeCron } from '@cloudphone/shared';
 *
 * @ClusterSafeCron(CronExpression.EVERY_HOUR)
 * async cleanupExpiredDevices() {
 *   // 业务逻辑
 * }
 * ```
 *
 * 高级用法（自定义锁配置）：
 * ```typescript
 * @ClusterSafeCron(CronExpression.EVERY_5_MINUTES, {
 *   lockKey: 'custom-lock-key',     // 自定义锁键
 *   lockTimeout: 10 * 60 * 1000,    // 锁超时时间（默认 5 分钟）
 *   skipOnLockFailure: true,         // 获取锁失败时跳过本次执行（默认 true）
 * })
 * async heavyTask() {
 *   // 可能执行超过 5 分钟的任务
 * }
 * ```
 */

export interface ClusterSafeCronOptions {
  /**
   * 分布式锁的键名（用于 Redis）
   * 默认值：`cron:{ClassName}:{MethodName}`
   */
  lockKey?: string;

  /**
   * 锁的超时时间（毫秒）
   * 默认值：5 分钟 (300,000ms)
   * 建议：设置为任务最大执行时间的 2 倍
   */
  lockTimeout?: number;

  /**
   * 获取锁失败时是否跳过本次执行
   * 默认值：true（推荐）
   * - true: 静默跳过，由其他 Pod 执行
   * - false: 抛出异常，记录错误日志
   */
  skipOnLockFailure?: boolean;

  /**
   * 任务名称（用于日志输出）
   * 默认值：方法名
   */
  name?: string;

  /**
   * 时区（用于 Cron 表达式解析）
   * 默认值：系统时区
   * 示例：'Asia/Shanghai', 'America/New_York'
   */
  timeZone?: string;

  /**
   * 是否在服务启动时立即执行一次
   * 默认值：false
   */
  immediate?: boolean;

  /**
   * 禁用定时任务
   * 默认值：false
   */
  disabled?: boolean;
}

/**
 * 集群安全的 Cron 装饰器
 *
 * @param cronExpression - Cron 表达式或 CronExpression 枚举值
 * @param options - 可选配置项
 */
export function ClusterSafeCron(
  cronExpression: string | CronExpression,
  options: ClusterSafeCronOptions = {},
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);
    const className = target.constructor.name;

    // 解析配置项
    const lockTimeout = options.lockTimeout ?? 5 * 60 * 1000; // 默认 5 分钟
    const lockKey = options.lockKey ?? `cron:${className}:${methodName}`;
    const skipOnLockFailure = options.skipOnLockFailure ?? true;
    const taskName = options.name ?? methodName;

    // ✅ 本地开发模式：直接使用原始 @Cron 装饰器，零开销
    if (!ClusterDetector.isClusterMode()) {
      // 直接应用 @Cron 装饰器，传递兼容的选项
      const cronOptions: any = {};
      if (options.timeZone) cronOptions.timeZone = options.timeZone;
      if (options.immediate !== undefined) cronOptions.immediate = options.immediate;
      if (options.disabled !== undefined) cronOptions.disabled = options.disabled;
      if (options.name) cronOptions.name = options.name;

      Cron(cronExpression, Object.keys(cronOptions).length > 0 ? cronOptions : undefined)(target, propertyKey, descriptor);

      // 保持原始方法不变
      return descriptor;
    }

    // ✅ K8s 集群模式：包装成带分布式锁的方法
    descriptor.value = async function (...args: any[]) {
      const instance = this;

      // 检查是否注入了 DistributedLockService
      const lockService = instance.lockService || instance['lockService'];

      if (!lockService) {
        console.error(
          `❌ ClusterSafeCron Error: ${className}.${methodName} requires DistributedLockService`,
          `\n   Please inject it in your service constructor:`,
          `\n   constructor(private readonly lockService: DistributedLockService) {}`,
        );
        throw new Error(
          `${className} missing DistributedLockService for @ClusterSafeCron`,
        );
      }

      const replicaId = ClusterDetector.getReplicaId();
      const startTime = Date.now();

      try {
        // 尝试获取分布式锁（非阻塞，立即返回）
        const lockId = await lockService.acquireLock(lockKey, lockTimeout, 0);

        console.log(
          `🔒 [Replica-${replicaId}] Acquired lock for cron task: ${taskName}`,
        );

        try {
          // 执行原始定时任务
          const result = await originalMethod.apply(instance, args);

          const duration = Date.now() - startTime;
          console.log(
            `✅ [Replica-${replicaId}] Cron task completed: ${taskName} (${duration}ms)`,
          );

          return result;
        } finally {
          // 确保释放锁（即使任务执行失败）
          await lockService.releaseLock(lockKey, lockId);
          console.log(
            `🔓 [Replica-${replicaId}] Released lock for cron task: ${taskName}`,
          );
        }
      } catch (error: any) {
        // 获取锁失败（其他 Pod 正在执行）
        if (error.message?.includes('Failed to acquire lock')) {
          if (skipOnLockFailure) {
            // 静默跳过，这是正常情况（其他 Pod 正在执行）
            console.log(
              `⏭️  [Replica-${replicaId}] Skipping cron task: ${taskName} (another pod is executing)`,
            );
            return;
          } else {
            // 记录警告日志
            console.warn(
              `⚠️  [Replica-${replicaId}] Failed to acquire lock for cron task: ${taskName}`,
            );
            throw error;
          }
        }

        // 其他错误（任务执行失败）
        console.error(
          `❌ [Replica-${replicaId}] Cron task failed: ${taskName}`,
          error,
        );
        throw error;
      }
    };

    // 应用 @Cron 装饰器到包装后的方法，传递兼容的选项
    const cronOptions: any = {};
    if (options.timeZone) cronOptions.timeZone = options.timeZone;
    if (options.immediate !== undefined) cronOptions.immediate = options.immediate;
    if (options.disabled !== undefined) cronOptions.disabled = options.disabled;
    if (options.name) cronOptions.name = options.name;

    Cron(cronExpression, Object.keys(cronOptions).length > 0 ? cronOptions : undefined)(target, propertyKey, descriptor);

    return descriptor;
  };
}

/**
 * 常用 Cron 表达式快捷装饰器
 */
export const ClusterSafeCronEveryMinute = (options?: ClusterSafeCronOptions) =>
  ClusterSafeCron(CronExpression.EVERY_MINUTE, options);

export const ClusterSafeCronEvery5Minutes = (
  options?: ClusterSafeCronOptions,
) => ClusterSafeCron(CronExpression.EVERY_5_MINUTES, options);

export const ClusterSafeCronEvery10Minutes = (
  options?: ClusterSafeCronOptions,
) => ClusterSafeCron(CronExpression.EVERY_10_MINUTES, options);

export const ClusterSafeCronEvery30Minutes = (
  options?: ClusterSafeCronOptions,
) => ClusterSafeCron(CronExpression.EVERY_30_MINUTES, options);

export const ClusterSafeCronEveryHour = (options?: ClusterSafeCronOptions) =>
  ClusterSafeCron(CronExpression.EVERY_HOUR, options);

export const ClusterSafeCronEveryDay = (options?: ClusterSafeCronOptions) =>
  ClusterSafeCron(CronExpression.EVERY_DAY_AT_MIDNIGHT, options);
