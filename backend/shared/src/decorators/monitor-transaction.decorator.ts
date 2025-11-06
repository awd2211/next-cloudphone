import { Counter, Histogram, register } from 'prom-client';

/**
 * Transaction Performance Monitoring Decorator
 *
 * 自动收集事务性能指标到 Prometheus
 *
 * 使用方法:
 * ```typescript
 * @MonitorTransaction('user-service', 'createUser')
 * @Transaction()
 * async createUser(manager: EntityManager, dto: CreateUserDto) {
 *   return await manager.save(User, dto);
 * }
 * ```
 *
 * 收集的指标:
 * - transaction_duration_seconds - 事务执行时间（直方图）
 * - transaction_total - 事务执行总数（计数器）
 * - transaction_errors_total - 事务错误总数（计数器）
 *
 * Grafana 查询示例:
 * ```promql
 * # P95 延迟
 * histogram_quantile(0.95,
 *   sum(rate(transaction_duration_seconds_bucket[5m]))
 *   by (service, operation, le)
 * )
 *
 * # 错误率
 * rate(transaction_errors_total[5m])
 * / rate(transaction_total[5m])
 * ```
 */

// Prometheus Metrics
const transactionDuration = new Histogram({
  name: 'transaction_duration_seconds',
  help: 'Transaction execution time in seconds',
  labelNames: ['service', 'operation', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10], // 10ms, 50ms, 100ms, ..., 10s
  registers: [register],
});

const transactionTotal = new Counter({
  name: 'transaction_total',
  help: 'Total number of transactions',
  labelNames: ['service', 'operation', 'status'],
  registers: [register],
});

const transactionErrors = new Counter({
  name: 'transaction_errors_total',
  help: 'Total number of transaction errors',
  labelNames: ['service', 'operation', 'error_type'],
  registers: [register],
});

export interface MonitorTransactionOptions {
  /**
   * 服务名（如 'user-service', 'device-service'）
   */
  service: string;

  /**
   * 操作名（如 'createUser', 'deductQuota'）
   */
  operation: string;

  /**
   * 是否启用详细日志（默认 false）
   */
  enableDetailedLogs?: boolean;

  /**
   * 慢查询阈值（毫秒，默认 1000）
   * 超过此阈值会记录 warn 日志
   */
  slowQueryThresholdMs?: number;
}

export function MonitorTransaction(
  service: string,
  operation: string,
  options?: Partial<MonitorTransactionOptions>
): MethodDecorator {
  const config: MonitorTransactionOptions = {
    service,
    operation,
    enableDetailedLogs: options?.enableDetailedLogs ?? false,
    slowQueryThresholdMs: options?.slowQueryThresholdMs ?? 1000,
  };

  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let status = 'success';
      let errorType: string | undefined;

      try {
        // 执行原方法
        const result = await originalMethod.apply(this, args);

        return result;
      } catch (error) {
        status = 'error';
        errorType = error.constructor.name || 'UnknownError';

        // 记录错误指标
        transactionErrors.inc({
          service: config.service,
          operation: config.operation,
          error_type: errorType,
        });

        throw error;
      } finally {
        const duration = (Date.now() - startTime) / 1000; // 转换为秒

        // 记录执行时间
        transactionDuration.observe(
          {
            service: config.service,
            operation: config.operation,
            status,
          },
          duration
        );

        // 记录执行总数
        transactionTotal.inc({
          service: config.service,
          operation: config.operation,
          status,
        });

        // 详细日志（可选）
        if (config.enableDetailedLogs) {
          const logger = this.logger || console;
          logger.debug(`Transaction completed: ${config.service}.${config.operation}`, {
            duration: `${duration.toFixed(3)}s`,
            status,
            errorType,
          });
        }

        // 慢查询警告
        const durationMs = duration * 1000;
        if (durationMs > (config.slowQueryThresholdMs || 1000)) {
          const logger = this.logger || console;
          logger.warn(`Slow transaction detected: ${config.service}.${config.operation}`, {
            duration: `${duration.toFixed(3)}s`,
            threshold: `${config.slowQueryThresholdMs || 1000}ms`,
            status,
          });
        }
      }
    };

    return descriptor;
  };
}

/**
 * 简化版监控装饰器 - 自动从方法名推断 operation
 *
 * 使用方法:
 * ```typescript
 * @MonitorTransactionSimple('user-service')
 * @Transaction()
 * async createUser(manager: EntityManager, dto: CreateUserDto) {
 *   return await manager.save(User, dto);
 * }
 * ```
 */
export function MonitorTransactionSimple(service: string): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const operation = String(propertyKey);
    return MonitorTransaction(service, operation)(target, propertyKey, descriptor);
  };
}

/**
 * Outbox 事件延迟监控
 *
 * 监控 Outbox 事件从写入到投递的延迟
 *
 * 使用方法:
 * ```typescript
 * // 在 EventOutboxService 中集成
 * ```
 */
export const outboxDeliveryDelay = new Histogram({
  name: 'outbox_delivery_delay_seconds',
  help: 'Outbox event delivery delay in seconds',
  labelNames: ['event_type', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60], // 100ms, 500ms, 1s, ..., 60s
  registers: [register],
});

export const outboxBacklog = new Counter({
  name: 'outbox_backlog_total',
  help: 'Total number of pending outbox events',
  labelNames: ['event_type'],
  registers: [register],
});

/**
 * Saga 执行监控
 */
export const sagaDuration = new Histogram({
  name: 'saga_duration_seconds',
  help: 'Saga execution time in seconds',
  labelNames: ['saga_type', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120], // 0.5s, 1s, ..., 120s
  registers: [register],
});

export const sagaStepDuration = new Histogram({
  name: 'saga_step_duration_seconds',
  help: 'Saga step execution time in seconds',
  labelNames: ['saga_type', 'step_name', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10], // 10ms, ..., 10s
  registers: [register],
});

export const sagaTotal = new Counter({
  name: 'saga_total',
  help: 'Total number of saga executions',
  labelNames: ['saga_type', 'status'],
  registers: [register],
});

export const sagaCompensations = new Counter({
  name: 'saga_compensations_total',
  help: 'Total number of saga compensations',
  labelNames: ['saga_type', 'step_name'],
  registers: [register],
});
