import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 优惠券类型枚举
 */
export enum CouponType {
  DISCOUNT = 'discount', // 折扣券
  CASH = 'cash', // 现金券
  GIFT = 'gift', // 礼品券
}

/**
 * 优惠券状态枚举
 */
export enum CouponStatus {
  AVAILABLE = 'available', // 可用
  USED = 'used', // 已使用
  EXPIRED = 'expired', // 已过期
}

/**
 * 优惠券实体
 */
@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  @Index()
  code: string; // 优惠券代码

  @Column({ length: 200 })
  name: string; // 优惠券名称

  @Column({
    type: 'enum',
    enum: CouponType,
    default: CouponType.DISCOUNT,
  })
  type: CouponType; // 优惠券类型

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number; // 面额或折扣率

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'min_amount' })
  minAmount?: number; // 最低消费金额

  @Column({
    type: 'enum',
    enum: CouponStatus,
    default: CouponStatus.AVAILABLE,
  })
  @Index()
  status: CouponStatus; // 优惠券状态

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId: string; // 用户ID

  @Column({ type: 'uuid', nullable: true, name: 'activity_id' })
  @Index()
  activityId?: string; // 活动ID（可选）

  @Column({ length: 200, nullable: true, name: 'activity_title' })
  activityTitle?: string; // 活动标题（冗余字段，提高查询性能）

  @Column({ type: 'timestamp', name: 'start_time' })
  startTime: Date; // 生效时间

  @Column({ type: 'timestamp', name: 'end_time' })
  @Index()
  endTime: Date; // 失效时间

  @Column({ type: 'uuid', nullable: true, name: 'order_id' })
  orderId?: string; // 使用的订单ID

  @Column({ type: 'timestamp', nullable: true, name: 'used_at' })
  usedAt?: Date; // 使用时间

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * 检查优惠券是否可用
   */
  isAvailable(): boolean {
    if (this.status !== CouponStatus.AVAILABLE) {
      return false;
    }

    const now = new Date();
    if (now < this.startTime || now > this.endTime) {
      return false;
    }

    return true;
  }

  /**
   * 检查优惠券是否已过期
   */
  isExpired(): boolean {
    const now = new Date();
    return now > this.endTime;
  }

  /**
   * 计算折扣金额
   * @param orderAmount 订单金额
   * @returns 折扣金额
   */
  calculateDiscount(orderAmount: number): number {
    // 检查最低消费金额
    if (this.minAmount && orderAmount < this.minAmount) {
      return 0;
    }

    switch (this.type) {
      case CouponType.CASH:
        // 现金券：直接减免
        return Math.min(this.value, orderAmount);

      case CouponType.DISCOUNT:
        // 折扣券：按比例减免
        // value 表示折扣率，例如 10 表示 9折（打9折）
        return orderAmount * (this.value / 100);

      case CouponType.GIFT:
        // 礼品券：不减免金额
        return 0;

      default:
        return 0;
    }
  }

  /**
   * 更新状态为已过期
   */
  markAsExpired() {
    this.status = CouponStatus.EXPIRED;
  }

  /**
   * 使用优惠券
   * @param orderId 订单ID
   */
  use(orderId: string) {
    if (!this.isAvailable()) {
      throw new Error('Coupon is not available');
    }

    this.status = CouponStatus.USED;
    this.orderId = orderId;
    this.usedAt = new Date();
  }
}
