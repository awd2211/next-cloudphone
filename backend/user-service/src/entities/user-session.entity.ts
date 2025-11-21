import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * 用户会话实体
 *
 * 记录用户的活跃会话，支持多设备同时在线
 * - 每次登录创建一个会话
 * - 用户可以查看和终止其他会话
 */
@Entity('user_sessions')
@Index('IDX_SESSION_USER', ['userId'])
@Index('IDX_SESSION_TOKEN', ['tokenHash'], { unique: true })
@Index('IDX_SESSION_EXPIRES', ['expiresAt'])
@Index('IDX_SESSION_ACTIVE', ['userId', 'isActive'])
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * Token 哈希（不存储原始 token）
   */
  @Column({ name: 'token_hash', unique: true })
  tokenHash: string;

  /**
   * 设备类型
   */
  @Column({
    name: 'device_type',
    type: 'varchar',
    length: 20,
    default: 'unknown',
  })
  deviceType: 'web' | 'mobile' | 'desktop' | 'api' | 'unknown';

  /**
   * 设备名称（从 User-Agent 解析）
   */
  @Column({ name: 'device_name', nullable: true })
  deviceName: string;

  /**
   * 浏览器信息
   */
  @Column({ nullable: true })
  browser: string;

  /**
   * 操作系统
   */
  @Column({ nullable: true })
  os: string;

  /**
   * 登录 IP
   */
  @Column({ nullable: true })
  ip: string;

  /**
   * IP 地理位置
   */
  @Column({ nullable: true })
  location: string;

  /**
   * User-Agent 原始值
   */
  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  /**
   * 是否活跃
   */
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /**
   * 是否为当前会话（用于标记）
   */
  @Column({ name: 'is_current', default: false })
  isCurrent: boolean;

  /**
   * 最后活跃时间
   */
  @Column({ name: 'last_active_at', type: 'timestamp', nullable: true })
  lastActiveAt: Date;

  /**
   * 过期时间
   */
  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  /**
   * 终止时间
   */
  @Column({ name: 'terminated_at', type: 'timestamp', nullable: true })
  terminatedAt: Date | null;

  /**
   * 终止原因
   */
  @Column({ name: 'terminated_reason', nullable: true })
  terminatedReason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
