import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Agent } from './agent.entity';
import { ShiftTemplate } from './shift-template.entity';

/**
 * 周期类型
 */
export enum RecurrenceType {
  /**
   * 每日
   */
  DAILY = 'daily',

  /**
   * 每周
   */
  WEEKLY = 'weekly',

  /**
   * 每两周
   */
  BIWEEKLY = 'biweekly',

  /**
   * 每月
   */
  MONTHLY = 'monthly',
}

/**
 * 周期性排班规则实体
 * 自动生成固定模式的排班
 */
@Entity('recurring_schedules')
@Index(['tenantId', 'agentId'])
@Index(['tenantId', 'isActive'])
export class RecurringSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  agentId: string;

  @ManyToOne(() => Agent)
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  /**
   * 规则名称
   */
  @Column()
  name: string;

  /**
   * 周期类型
   */
  @Column({
    type: 'enum',
    enum: RecurrenceType,
    default: RecurrenceType.WEEKLY,
  })
  recurrenceType: RecurrenceType;

  /**
   * 班次模板ID
   */
  @Column()
  shiftTemplateId: string;

  @ManyToOne(() => ShiftTemplate)
  @JoinColumn({ name: 'shiftTemplateId' })
  shiftTemplate: ShiftTemplate;

  /**
   * 适用的星期几（0-6，0为周日）
   * 仅对 weekly/biweekly 类型有效
   */
  @Column({ type: 'jsonb', default: [] })
  daysOfWeek: number[];

  /**
   * 适用的月份日期（1-31）
   * 仅对 monthly 类型有效
   */
  @Column({ type: 'jsonb', default: [] })
  daysOfMonth: number[];

  /**
   * 生效开始日期
   */
  @Column({ type: 'date' })
  effectiveFrom: Date;

  /**
   * 生效结束日期（可选，空表示永久）
   */
  @Column({ type: 'date', nullable: true })
  effectiveUntil: Date;

  /**
   * 排除的日期（如节假日）
   */
  @Column({ type: 'jsonb', default: [] })
  excludeDates: string[];

  /**
   * 是否启用
   */
  @Column({ default: true })
  isActive: boolean;

  /**
   * 最后生成排班的日期
   */
  @Column({ type: 'date', nullable: true })
  lastGeneratedDate: Date;

  /**
   * 创建者
   */
  @Column({ nullable: true })
  createdBy: string;

  /**
   * 备注
   */
  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
