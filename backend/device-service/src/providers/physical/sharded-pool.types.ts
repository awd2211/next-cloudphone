/**
 * 分片设备池类型定义
 *
 * Phase 2B: 大规模物理设备支持（1000+ 设备）
 *
 * 架构：
 * - 按设备分组（deviceGroup）分片
 * - 每个分片独立管理
 * - 支持跨分片查询和分配
 */

/**
 * 设备池分片配置
 */
export interface ShardConfig {
  /** 分片 ID */
  shardId: string;

  /** 分片名称 */
  shardName: string;

  /** 设备分组（机房/机架） */
  deviceGroups: string[];

  /** 分片容量（最大设备数） */
  capacity: number;

  /** 区域/位置 */
  region?: string;

  /** 权重（用于负载均衡） */
  weight?: number;

  /** 是否启用 */
  enabled: boolean;
}

/**
 * 分片统计信息
 */
export interface ShardStats {
  /** 分片 ID */
  shardId: string;

  /** 总设备数 */
  total: number;

  /** 可用设备数 */
  available: number;

  /** 已分配设备数 */
  allocated: number;

  /** 离线设备数 */
  offline: number;

  /** 平均健康评分 */
  averageHealthScore: number;

  /** 使用率 */
  utilizationRate: number;

  /** 最后更新时间 */
  updatedAt: Date;
}

/**
 * 设备池全局统计
 */
export interface GlobalPoolStats {
  /** 总设备数 */
  totalDevices: number;

  /** 总分片数 */
  totalShards: number;

  /** 各分片统计 */
  shards: ShardStats[];

  /** 全局平均健康评分 */
  globalAverageHealthScore: number;

  /** 全局使用率 */
  globalUtilizationRate: number;

  /** 按区域统计 */
  byRegion: Record<string, {
    total: number;
    available: number;
    utilizationRate: number;
  }>;

  /** 按状态统计 */
  byStatus: Record<string, number>;
}

/**
 * 分片选择策略
 */
export enum ShardSelectionStrategy {
  /** 最少使用（默认） */
  LEAST_USED = "least_used",

  /** 轮询 */
  ROUND_ROBIN = "round_robin",

  /** 加权轮询 */
  WEIGHTED_ROUND_ROBIN = "weighted_round_robin",

  /** 随机 */
  RANDOM = "random",

  /** 区域亲和性 */
  REGION_AFFINITY = "region_affinity",
}

/**
 * 分片选择请求
 */
export interface ShardSelectionRequest {
  /** 选择策略 */
  strategy?: ShardSelectionStrategy;

  /** 首选区域 */
  preferredRegion?: string;

  /** 首选分片 */
  preferredShardId?: string;

  /** 设备分组要求 */
  deviceGroup?: string;

  /** 最小健康评分 */
  minHealthScore?: number;
}

/**
 * 设备池操作结果
 */
export interface PoolOperationResult<T = any> {
  /** 是否成功 */
  success: boolean;

  /** 结果数据 */
  data?: T;

  /** 错误信息 */
  error?: string;

  /** 操作的分片 ID */
  shardId?: string;

  /** 操作耗时（毫秒） */
  duration?: number;
}
