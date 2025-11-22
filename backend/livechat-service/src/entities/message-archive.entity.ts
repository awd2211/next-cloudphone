import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('message_archives')
@Index(['conversationId'])
@Index(['archivedAt'])
@Index(['tenantId', 'archivedAt'])
export class MessageArchive {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', default: 'default' })
  tenantId: string;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @Column({ name: 'original_message_id' })
  originalMessageId: string;

  @Column({ type: 'jsonb' })
  data: ArchivedMessageData;

  @Column({ name: 'archived_at', type: 'timestamp' })
  archivedAt: Date;

  @Column({ name: 'retention_until', type: 'timestamp', nullable: true })
  retentionUntil: Date;

  @Column({ name: 'storage_location', nullable: true })
  storageLocation: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

export interface ArchivedMessageData {
  conversationId: string;
  type: string;
  sender: string;
  senderId: string;
  senderName?: string;
  content: string;
  contentEncrypted?: string;
  isEncrypted: boolean;
  attachments?: any[];
  metadata?: Record<string, any>;
  createdAt: Date;
}
