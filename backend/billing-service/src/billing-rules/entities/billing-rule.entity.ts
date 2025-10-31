import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RuleType {
  FIXED = 'fixed', // 固定价格
  PAY_PER_USE = 'pay_per_use', // 按量计费
  TIERED = 'tiered', // 阶梯定价
  VOLUME = 'volume', // 批量折扣
  TIME_BASED = 'time_based', // 时段定价
}

export enum ResourceType {
  DEVICE = 'device',
  CPU = 'cpu',
  MEMORY = 'memory',
  STORAGE = 'storage',
  BANDWIDTH = 'bandwidth',
  DURATION = 'duration',
}

export enum BillingUnit {
  HOUR = 'hour',
  DAY = 'day',
  MONTH = 'month',
  GB = 'gb',
  UNIT = 'unit',
}

export interface TierConfig {
  from: number; // 起始数量
  to: number; // 结束数量（-1 表示无限制）
  price: number; // 该阶梯的单价
}

export interface TimeBasedConfig {
  startHour: number; // 开始小时 (0-23)
  endHour: number; // 结束小时 (0-23)
  price: number; // 该时段的单价
  days?: number[]; // 星期几 (0-6，0=周日)
}

@Entity('billing_rules')
export class BillingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: RuleType,
  })
  @Index()
  ruleType: RuleType;

  @Column({
    type: 'enum',
    enum: ResourceType,
  })
  @Index()
  resourceType: ResourceType;

  @Column({
    type: 'enum',
    enum: BillingUnit,
  })
  billingUnit: BillingUnit;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  fixedPrice: number; // 固定价格（FIXED 类型使用）

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  unitPrice: number; // 单价（PAY_PER_USE 类型使用）

  @Column({ type: 'jsonb', nullable: true })
  tiers: TierConfig[]; // 阶梯配置（TIERED, VOLUME 类型使用）

  @Column({ type: 'jsonb', nullable: true })
  timeBasedPricing: TimeBasedConfig[]; // 时段定价配置（TIME_BASED 类型使用）

  @Column({ type: 'int', default: 0 })
  priority: number; // 优先级（数字越大优先级越高）

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  validFrom: Date;

  @Column({ type: 'timestamp', nullable: true })
  validUntil: Date;

  @Column({ type: 'jsonb', nullable: true })
  conditions: Record<string, any>; // 附加条件（如用户组、地区等）

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isValid(): boolean {
    const now = new Date();
    if (this.validFrom && now < this.validFrom) return false;
    if (this.validUntil && now > this.validUntil) return false;
    return this.isActive;
  }

  calculatePrice(quantity: number, context?: { hour?: number; day?: number }): number {
    if (!this.isValid()) {
      throw new Error('计费规则无效或已过期');
    }

    switch (this.ruleType) {
      case RuleType.FIXED:
        return Number(this.fixedPrice);

      case RuleType.PAY_PER_USE:
        return Number(this.unitPrice) * quantity;

      case RuleType.TIERED:
        return this.calculateTieredPrice(quantity);

      case RuleType.VOLUME:
        return this.calculateVolumePrice(quantity);

      case RuleType.TIME_BASED:
        if (!context?.hour) {
          throw new Error('TIME_BASED 规则需要提供 hour 参数');
        }
        return this.calculateTimeBasedPrice(quantity, context.hour, context.day);

      default:
        throw new Error(`不支持的规则类型: ${this.ruleType}`);
    }
  }

  private calculateTieredPrice(quantity: number): number {
    if (!this.tiers || this.tiers.length === 0) {
      throw new Error('阶梯定价配置为空');
    }

    let totalPrice = 0;
    let remainingQty = quantity;

    // 按阶梯排序
    const sortedTiers = [...this.tiers].sort((a, b) => a.from - b.from);

    for (const tier of sortedTiers) {
      if (remainingQty <= 0) break;

      const tierSize = tier.to === -1 ? Infinity : tier.to - tier.from + 1;
      const qtyInTier = Math.min(remainingQty, tierSize);

      totalPrice += qtyInTier * tier.price;
      remainingQty -= qtyInTier;
    }

    return totalPrice;
  }

  private calculateVolumePrice(quantity: number): number {
    if (!this.tiers || this.tiers.length === 0) {
      throw new Error('批量折扣配置为空');
    }

    // 找到适用的批量折扣档位
    const sortedTiers = [...this.tiers].sort((a, b) => b.from - a.from);
    const applicableTier = sortedTiers.find(
      (tier) => quantity >= tier.from && (tier.to === -1 || quantity <= tier.to)
    );

    if (!applicableTier) {
      // 使用最低档位
      const lowestTier = sortedTiers[sortedTiers.length - 1];
      return quantity * lowestTier.price;
    }

    return quantity * applicableTier.price;
  }

  private calculateTimeBasedPrice(quantity: number, hour: number, day?: number): number {
    if (!this.timeBasedPricing || this.timeBasedPricing.length === 0) {
      throw new Error('时段定价配置为空');
    }

    // 找到当前时段的价格
    const applicableConfig = this.timeBasedPricing.find((config) => {
      const hourMatch = hour >= config.startHour && hour < config.endHour;
      const dayMatch =
        !config.days ||
        config.days.length === 0 ||
        (day !== undefined && config.days.includes(day));
      return hourMatch && dayMatch;
    });

    if (!applicableConfig) {
      // 如果没有匹配的时段，使用第一个配置
      return quantity * this.timeBasedPricing[0].price;
    }

    return quantity * applicableConfig.price;
  }
}
