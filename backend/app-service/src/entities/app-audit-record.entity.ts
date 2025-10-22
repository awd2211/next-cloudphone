import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Application } from './application.entity';

export enum AuditAction {
  SUBMIT = 'submit',           // 提交审核
  APPROVE = 'approve',         // 批准
  REJECT = 'reject',           // 拒绝
  REQUEST_CHANGES = 'request_changes',  // 要求修改
}

export enum AuditStatus {
  PENDING = 'pending',         // 待审核
  APPROVED = 'approved',       // 已批准
  REJECTED = 'rejected',       // 已拒绝
  CHANGES_REQUESTED = 'changes_requested',  // 要求修改
}

@Entity('app_audit_records')
@Index(['applicationId', 'createdAt'])
export class AppAuditRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditStatus,
  })
  status: AuditStatus;

  @Column({ nullable: true })
  @Index()
  reviewerId: string;  // 审核人员 ID

  @Column({ nullable: true })
  reviewerName: string;  // 审核人员名称

  @Column({ type: 'text', nullable: true })
  comment: string;  // 审核意见

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;  // 额外元数据

  @CreateDateColumn()
  createdAt: Date;
}
