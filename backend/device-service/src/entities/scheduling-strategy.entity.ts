import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 调度策略类型
 */
export enum StrategyType {
  LOAD_BALANCING = 'load_balancing',           // 负载均衡
  RESOURCE_EFFICIENCY = 'resource_efficiency', // 资源效率优先
  LOCALITY_AWARE = 'locality_aware',           // 地理位置感知
  COST_OPTIMIZATION = 'cost_optimization',     // 成本优化
}

/**
 * 调度策略配置接口
 */
export interface StrategyConfig {
  // 负载均衡配置
  algorithm?: 'round_robin' | 'weighted_round_robin' | 'least_connection' | 'random';

  // 资源效率配置
  threshold?: number; // 资源利用率阈值 (0-1)

  // 地理位置配置
  regionWeight?: number; // 地域权重 (0-1)
  preferredRegions?: string[]; // 优先地域列表

  // 成本优化配置
  costMetric?: 'per_hour' | 'per_device' | 'total_cost';
  maxCostPerDevice?: number; // 最大单设备成本

  // 通用配置
  enableFailover?: boolean; // 启用故障转移
  maxRetries?: number; // 最大重试次数
  timeout?: number; // 超时时间(秒)

  // 自定义参数
  [key: string]: any;
}

/**
 * 调度策略实体
 * 用于管理设备调度算法和策略
 */
@Entity('scheduling_strategies')
export class SchedulingStrategy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 策略名称（唯一）
  @Column({ unique: true })
  @Index()
  name: string;

  // 策略类型
  @Column({
    type: 'enum',
    enum: StrategyType,
  })
  @Index()
  type: StrategyType;

  // 策略描述
  @Column({ type: 'text', nullable: true })
  description: string;

  // 策略配置（JSONB）
  @Column({ type: 'jsonb', nullable: true })
  config: StrategyConfig;

  // 是否激活（同时只能有一个策略激活）
  @Column({ type: 'boolean', default: false })
  @Index()
  isActive: boolean;

  // 优先级（数值越小优先级越高）
  @Column({ type: 'int', default: 100 })
  priority: number;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 更新时间
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * 验证策略配置是否有效
   */
  isConfigValid(): boolean {
    if (!this.config) {
      return true; // 空配置也是有效的
    }

    switch (this.type) {
      case StrategyType.LOAD_BALANCING:
        return this.config.algorithm !== undefined;

      case StrategyType.RESOURCE_EFFICIENCY:
        return (
          this.config.threshold !== undefined &&
          this.config.threshold >= 0 &&
          this.config.threshold <= 1
        );

      case StrategyType.LOCALITY_AWARE:
        return (
          this.config.regionWeight !== undefined &&
          this.config.regionWeight >= 0 &&
          this.config.regionWeight <= 1
        );

      case StrategyType.COST_OPTIMIZATION:
        return this.config.costMetric !== undefined;

      default:
        return true;
    }
  }

  /**
   * 获取策略显示名称
   */
  getDisplayName(): string {
    const typeNames = {
      [StrategyType.LOAD_BALANCING]: '负载均衡策略',
      [StrategyType.RESOURCE_EFFICIENCY]: '资源效率策略',
      [StrategyType.LOCALITY_AWARE]: '本地优先策略',
      [StrategyType.COST_OPTIMIZATION]: '成本优化策略',
    };
    return typeNames[this.type] || this.name;
  }
}
