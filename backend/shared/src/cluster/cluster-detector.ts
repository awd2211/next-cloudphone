/**
 * ClusterDetector - 集群环境自动检测工具
 *
 * 用途：自动识别当前运行环境（本地开发 vs K8s 集群），无需手动配置
 * 原则：零配置、零侵入、自动降级
 */

export class ClusterDetector {
  /**
   * 检测是否运行在集群模式下
   *
   * 检测优先级（从高到低）：
   * 1. 显式环境变量配置 (CLUSTER_MODE=true)
   * 2. K8s 环境检测 (KUBERNETES_SERVICE_HOST 存在)
   * 3. 副本数检测 (REPLICAS > 1)
   * 4. PM2 集群模式检测 (NODE_APP_INSTANCE 存在)
   *
   * @returns true = 集群模式（需要分布式锁），false = 单机模式（无需分布式锁）
   */
  static isClusterMode(): boolean {
    // 方案 A：显式配置（优先级最高）
    // 用法：在 .env 中设置 CLUSTER_MODE=true 强制启用集群模式
    if (process.env.CLUSTER_MODE === 'true') {
      return true;
    }

    // 方案 B：K8s 环境自动检测
    // K8s 会自动注入 KUBERNETES_SERVICE_HOST 环境变量
    if (process.env.KUBERNETES_SERVICE_HOST) {
      return true;
    }

    // 方案 C：副本数检测
    // 从环境变量读取副本数，> 1 表示集群模式
    const replicas = process.env.REPLICAS;
    if (replicas && parseInt(replicas, 10) > 1) {
      return true;
    }

    // 方案 D：PM2 集群模式检测
    // PM2 集群模式下会设置 NODE_APP_INSTANCE 环境变量
    if (process.env.NODE_APP_INSTANCE !== undefined) {
      return true;
    }

    // 默认：本地开发单机模式
    return false;
  }

  /**
   * 获取当前环境名称（用于日志输出）
   */
  static getEnvironmentName(): string {
    if (process.env.KUBERNETES_SERVICE_HOST) {
      return 'K8s Cluster';
    }
    if (process.env.NODE_APP_INSTANCE !== undefined) {
      return 'PM2 Cluster';
    }
    if (process.env.CLUSTER_MODE === 'true') {
      return 'Cluster (Manual)';
    }
    return 'Local Development';
  }

  /**
   * 获取当前实例的副本编号（用于日志标识）
   *
   * @returns 副本编号，如果是单机模式返回 0
   */
  static getReplicaId(): number {
    // K8s pod 名称格式：service-name-5d7c8b9f4-abc12
    // 从 HOSTNAME 环境变量提取编号
    if (process.env.HOSTNAME) {
      const match = process.env.HOSTNAME.match(/-(\d+)$/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    // PM2 集群模式的实例编号
    if (process.env.NODE_APP_INSTANCE !== undefined) {
      return parseInt(process.env.NODE_APP_INSTANCE, 10);
    }

    // 单机模式
    return 0;
  }

  /**
   * 获取集群总副本数
   *
   * @returns 总副本数，如果是单机模式返回 1
   */
  static getTotalReplicas(): number {
    const replicas = process.env.REPLICAS;
    if (replicas) {
      return parseInt(replicas, 10);
    }

    // K8s 环境下可以从 StatefulSet/Deployment 中读取
    // 这里简化处理，返回默认值
    if (this.isClusterMode()) {
      return 2; // 默认假设 2 个副本
    }

    return 1; // 单机模式
  }

  /**
   * 打印环境信息（用于启动时诊断）
   */
  static logEnvironmentInfo(logger?: any): void {
    const log = logger?.log?.bind(logger) || console.log;

    log(`🔍 Environment Detection:`);
    log(`   - Mode: ${this.getEnvironmentName()}`);
    log(`   - Cluster Mode: ${this.isClusterMode() ? 'ENABLED' : 'DISABLED'}`);
    log(`   - Replica ID: ${this.getReplicaId()}`);
    log(`   - Total Replicas: ${this.getTotalReplicas()}`);

    if (this.isClusterMode()) {
      log(`   ✅ Distributed locking for cron tasks: ENABLED`);
      log(`   ✅ Shared storage (MinIO) for file uploads: ENABLED`);
    } else {
      log(`   ⚡ Distributed locking: SKIPPED (single instance)`);
      log(`   ⚡ Local file storage: ENABLED (development mode)`);
    }
  }
}
