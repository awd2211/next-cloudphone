import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * 登录历史记录
 */
export enum LoginResult {
  SUCCESS = 'success',
  FAILED_PASSWORD = 'failed_password',
  FAILED_CAPTCHA = 'failed_captcha',
  FAILED_2FA = 'failed_2fa',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_DISABLED = 'account_disabled',
  USER_NOT_FOUND = 'user_not_found',
}

/**
 * 登录历史实体
 *
 * 记录所有登录尝试，用于安全审计
 */
@Entity('login_history')
@Index('IDX_LOGIN_HISTORY_USER', ['userId'])
@Index('IDX_LOGIN_HISTORY_USERNAME', ['username'])
@Index('IDX_LOGIN_HISTORY_RESULT', ['result'])
@Index('IDX_LOGIN_HISTORY_CREATED', ['createdAt'])
@Index('IDX_LOGIN_HISTORY_USER_CREATED', ['userId', 'createdAt'])
export class LoginHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 用户ID（可能为空，如果用户不存在）
   */
  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  /**
   * 登录用户名（即使用户不存在也记录）
   */
  @Column()
  @Index()
  username: string;

  /**
   * 登录结果
   */
  @Column({
    type: 'enum',
    enum: LoginResult,
  })
  result: LoginResult;

  /**
   * 失败原因（详细描述）
   */
  @Column({ name: 'failure_reason', nullable: true })
  failureReason: string;

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
   * User-Agent
   */
  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

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
   * 是否使用了 2FA
   */
  @Column({ name: 'used_2fa', default: false })
  used2FA: boolean;

  /**
   * 关联的会话ID（登录成功时）
   */
  @Column({ name: 'session_id', nullable: true })
  sessionId: string;

  /**
   * 额外元数据
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
