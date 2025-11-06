import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Activity } from './activity.entity';

/**
 * 参与状态枚举
 */
export enum ParticipationStatus {
  PENDING = 'pending', // 待处理
  COMPLETED = 'completed', // 已完成
  FAILED = 'failed', // 失败
}

/**
 * 活动参与记录实体
 */
@Entity('activity_participations')
export class Participation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'activity_id' })
  activityId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'jsonb', nullable: true })
  rewards: string[]; // 获得的奖励

  @Column({
    type: 'enum',
    enum: ParticipationStatus,
    default: ParticipationStatus.PENDING,
  })
  status: ParticipationStatus;

  @CreateDateColumn({ name: 'participated_at' })
  participatedAt: Date;

  // 关联：多个参与记录属于一个活动
  @ManyToOne(() => Activity, (activity) => activity.participations)
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;
}
