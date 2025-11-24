import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// 模板类型
export enum TicketTemplateType {
  CONVERSION = 'conversion',    // 会话转工单
  ESCALATION = 'escalation',    // 升级工单
  FOLLOW_UP = 'follow_up',      // 后续工单
  FEEDBACK = 'feedback',        // 反馈工单
  BUG_REPORT = 'bug_report',    // Bug 报告
  FEATURE_REQUEST = 'feature_request', // 功能请求
}

@Entity('ticket_templates')
@Index(['tenantId', 'type'])
@Index(['tenantId', 'isActive'])
export class TicketTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  // 模板名称
  @Column()
  name: string;

  // 模板描述
  @Column({ type: 'text', nullable: true })
  description: string;

  // 模板类型
  @Column({
    type: 'enum',
    enum: TicketTemplateType,
    default: TicketTemplateType.CONVERSION,
  })
  type: TicketTemplateType;

  // 默认主题模板
  @Column({ nullable: true })
  subjectTemplate: string;

  // 默认描述模板
  @Column({ type: 'text', nullable: true })
  descriptionTemplate: string;

  // 默认优先级
  @Column({ default: 'normal' })
  defaultPriority: string;

  // 默认分类
  @Column({ nullable: true })
  defaultCategory: string;

  // 默认标签
  @Column({ type: 'simple-array', nullable: true })
  defaultTags: string[];

  // 是否包含聊天记录
  @Column({ default: true })
  includeConversationHistory: boolean;

  // 聊天记录条数限制
  @Column({ default: 50 })
  historyLimit: number;

  // 是否包含访客信息
  @Column({ default: true })
  includeVisitorInfo: boolean;

  // 是否包含设备信息
  @Column({ default: false })
  includeDeviceInfo: boolean;

  // 自定义字段
  @Column({ type: 'jsonb', nullable: true })
  customFields: {
    name: string;
    type: 'text' | 'select' | 'number' | 'date';
    required: boolean;
    options?: string[];
    defaultValue?: string;
  }[];

  // 同步设置
  @Column({ type: 'jsonb', nullable: true })
  syncSettings: {
    syncComments: boolean;
    syncStatusChanges: boolean;
    syncPriorityChanges: boolean;
    notifyOnUpdate: boolean;
  };

  // 自动分配设置
  @Column({ type: 'jsonb', nullable: true })
  autoAssignSettings: {
    assignToCurrentAgent: boolean;
    assignToGroup?: string;
    assignToUser?: string;
  };

  // 是否激活
  @Column({ default: true })
  isActive: boolean;

  // 是否为默认模板
  @Column({ default: false })
  isDefault: boolean;

  // 排序
  @Column({ default: 0 })
  sortOrder: number;

  // 创建者
  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
