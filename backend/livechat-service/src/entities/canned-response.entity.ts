import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('canned_responses')
@Index(['tenantId', 'category'])
@Index(['agentId'])
export class CannedResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', default: 'default' })
  tenantId: string;

  @Column({ name: 'agent_id', nullable: true })
  agentId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  shortcut: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ name: 'use_count', default: 0 })
  useCount: number;

  @Column({ name: 'is_global', default: false })
  isGlobal: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
