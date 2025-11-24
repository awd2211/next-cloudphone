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
 * 排班状态
 */
export enum ScheduleStatus {
  /**
   * 已排班
   */
  SCHEDULED = 'scheduled',

  /**
   * 已确认
   */
  CONFIRMED = 'confirmed',

  /**
   * 工作中
   */
  WORKING = 'working',

  /**
   * 已完成
   */
  COMPLETED = 'completed',

  /**
   * 缺勤
   */
  ABSENT = 'absent',

  /**
   * 请假
   */
  LEAVE = 'leave',

  /**
   * 已取消
   */
  CANCELLED = 'cancelled',
}

/**
 * 请假类型
 */
export enum LeaveType {
  /**
   * 年假
   */
  ANNUAL = 'annual',

  /**
   * 病假
   */
  SICK = 'sick',

  /**
   * 事假
   */
  PERSONAL = 'personal',

  /**
   * 调休
   */
  COMPENSATORY = 'compensatory',

  /**
   * 其他
   */
  OTHER = 'other',
}

/**
 * 客服排班实体
 */
@Entity('agent_schedules')
@Index(['tenantId', 'agentId', 'scheduleDate'])
@Index(['tenantId', 'scheduleDate'])
@Index(['agentId', 'status'])
export class AgentSchedule {
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
   * 排班日期
   */
  @Column({ type: 'date' })
  scheduleDate: Date;

  /**
   * 班次模板ID（可选，也可自定义时间）
   */
  @Column({ nullable: true })
  shiftTemplateId: string;

  @ManyToOne(() => ShiftTemplate, { nullable: true })
  @JoinColumn({ name: 'shiftTemplateId' })
  shiftTemplate: ShiftTemplate;

  /**
   * 班次名称（从模板复制或自定义）
   */
  @Column({ nullable: true })
  shiftName: string;

  /**
   * 开始时间（HH:mm 格式）
   */
  @Column()
  startTime: string;

  /**
   * 结束时间（HH:mm 格式）
   */
  @Column()
  endTime: string;

  /**
   * 是否跨天
   */
  @Column({ default: false })
  crossDay: boolean;

  /**
   * 排班状态
   */
  @Column({
    type: 'enum',
    enum: ScheduleStatus,
    default: ScheduleStatus.SCHEDULED,
  })
  status: ScheduleStatus;

  /**
   * 实际签到时间
   */
  @Column({ type: 'timestamp', nullable: true })
  actualStartTime: Date;

  /**
   * 实际签退时间
   */
  @Column({ type: 'timestamp', nullable: true })
  actualEndTime: Date;

  /**
   * 请假类型（如果状态为请假）
   */
  @Column({
    type: 'enum',
    enum: LeaveType,
    nullable: true,
  })
  leaveType: LeaveType;

  /**
   * 请假原因
   */
  @Column({ type: 'text', nullable: true })
  leaveReason: string;

  /**
   * 请假审批人
   */
  @Column({ nullable: true })
  leaveApprovedBy: string;

  /**
   * 请假审批时间
   */
  @Column({ type: 'timestamp', nullable: true })
  leaveApprovedAt: Date;

  /**
   * 工作统计
   */
  @Column({ type: 'jsonb', nullable: true })
  workStats: {
    totalChats?: number;
    avgResponseTime?: number;
    avgSatisfaction?: number;
    totalWorkMinutes?: number;
    totalBreakMinutes?: number;
    lateMinutes?: number;
    earlyLeaveMinutes?: number;
    overtimeMinutes?: number;
  };

  /**
   * 备注
   */
  @Column({ type: 'text', nullable: true })
  notes: string;

  /**
   * 排班颜色（继承自模板或自定义）
   */
  @Column({ default: '#1890ff' })
  color: string;

  /**
   * 是否为周期性排班生成
   */
  @Column({ default: false })
  isRecurring: boolean;

  /**
   * 周期性排班规则ID
   */
  @Column({ nullable: true })
  recurringRuleId: string;

  /**
   * 创建者
   */
  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
