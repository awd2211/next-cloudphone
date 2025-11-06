import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * 收益类型枚举
 */
export enum EarningsType {
  INVITE = 'invite', // 邀请奖励
  BONUS = 'bonus', // 额外奖金
  OTHER = 'other', // 其他
}

/**
 * 收益记录实体
 * 记录所有收益明细
 */
@Entity('earnings_records')
export class EarningsRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId: string; // 用户ID

  @Column({
    type: 'enum',
    enum: EarningsType,
    default: EarningsType.INVITE,
  })
  @Index()
  type: EarningsType; // 收益类型

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number; // 金额

  @Column({ type: 'text' })
  description: string; // 描述

  @Column({ type: 'uuid', nullable: true, name: 'related_id' })
  relatedId?: string; // 关联ID（如邀请记录ID）

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
