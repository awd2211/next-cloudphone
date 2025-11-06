import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Participation } from './participation.entity';

/**
 * 活动类型枚举
 */
export enum ActivityType {
  DISCOUNT = 'discount', // 折扣
  GIFT = 'gift', // 礼包
  FLASH_SALE = 'flash_sale', // 限时秒杀
  NEW_USER = 'new_user', // 新用户专享
}

/**
 * 活动状态枚举
 */
export enum ActivityStatus {
  UPCOMING = 'upcoming', // 即将开始
  ONGOING = 'ongoing', // 进行中
  ENDED = 'ended', // 已结束
}

/**
 * 营销活动实体
 */
@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
    default: ActivityType.DISCOUNT,
  })
  type: ActivityType;

  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.UPCOMING,
  })
  status: ActivityStatus;

  @Column({ type: 'timestamp', name: 'start_time' })
  startTime: Date;

  @Column({ type: 'timestamp', name: 'end_time' })
  endTime: Date;

  @Column({ length: 500, nullable: true, name: 'cover_image' })
  coverImage?: string;

  @Column({ length: 500, nullable: true, name: 'banner_image' })
  bannerImage?: string;

  @Column({ type: 'text', nullable: true })
  rules?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  discount?: number; // 折扣率 (0-100)

  @Column({ type: 'int', nullable: true, name: 'max_participants' })
  maxParticipants?: number; // 最大参与人数

  @Column({ type: 'int', default: 0, name: 'current_participants' })
  currentParticipants: number; // 当前参与人数

  @Column({ type: 'jsonb', nullable: true })
  rewards?: string[]; // 奖励列表

  @Column({ type: 'jsonb', nullable: true })
  conditions?: string[]; // 参与条件

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联：一个活动有多个参与记录
  @OneToMany(() => Participation, (participation) => participation.activity)
  participations: Participation[];

  /**
   * 计算活动状态
   */
  calculateStatus(): ActivityStatus {
    const now = new Date();
    if (now < this.startTime) {
      return ActivityStatus.UPCOMING;
    } else if (now > this.endTime) {
      return ActivityStatus.ENDED;
    } else {
      return ActivityStatus.ONGOING;
    }
  }

  /**
   * 检查是否可以参与
   */
  canParticipate(): boolean {
    if (!this.isActive) {
      return false;
    }
    if (this.status !== ActivityStatus.ONGOING) {
      return false;
    }
    if (this.maxParticipants && this.currentParticipants >= this.maxParticipants) {
      return false;
    }
    return true;
  }
}
