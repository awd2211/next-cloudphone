import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  VIDEO = 'video',
  AUDIO = 'audio',
  SYSTEM = 'system', // 系统消息
  AI = 'ai', // AI 回复
  DEVICE_SCREENSHOT = 'device_screenshot', // 设备截图
  DEVICE_RECORDING = 'device_recording', // 设备录屏
}

export enum MessageSender {
  USER = 'user',
  AGENT = 'agent',
  BOT = 'bot',
  SYSTEM = 'system',
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Entity('messages')
@Index(['conversationId', 'createdAt'])
@Index(['senderId', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({
    type: 'enum',
    enum: MessageSender,
  })
  sender: MessageSender;

  @Column({ name: 'sender_id' })
  senderId: string;

  @Column({ name: 'sender_name', nullable: true })
  senderName: string;

  @Column({ name: 'sender_avatar', nullable: true })
  senderAvatar: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'content_encrypted', type: 'text', nullable: true })
  contentEncrypted: string;

  @Column({ name: 'is_encrypted', default: false })
  isEncrypted: boolean;

  @Column({ name: 'encryption_key_id', nullable: true })
  encryptionKeyId: string;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Column({ type: 'jsonb', nullable: true })
  attachments: MessageAttachment[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'reply_to_id', nullable: true })
  replyToId: string;

  @Column({ name: 'is_edited', default: false })
  isEdited: boolean;

  @Column({ name: 'edited_at', type: 'timestamp', nullable: true })
  editedAt: Date;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ name: 'ai_confidence', type: 'decimal', precision: 5, scale: 4, nullable: true })
  aiConfidence: number;

  @Column({ name: 'ai_model', nullable: true })
  aiModel: string;

  @Column({ name: 'sensitive_word_detected', default: false })
  sensitiveWordDetected: boolean;

  @Column({ name: 'sensitive_words', type: 'jsonb', nullable: true })
  sensitiveWords: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'video' | 'audio';
  name: string;
  url: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
  duration?: number; // 音视频时长
  width?: number;
  height?: number;
}
