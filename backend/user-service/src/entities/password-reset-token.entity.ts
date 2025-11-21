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
 * 密码重置令牌实体
 *
 * 用于存储密码重置请求的一次性令牌
 * - 令牌在使用后或过期后失效
 * - 每个用户同时只能有一个有效令牌
 */
@Entity('password_reset_tokens')
@Index('IDX_PASSWORD_RESET_TOKEN', ['token'], { unique: true })
@Index('IDX_PASSWORD_RESET_USER', ['userId'])
@Index('IDX_PASSWORD_RESET_EXPIRES', ['expiresAt'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * 重置令牌（哈希存储）
   */
  @Column({ unique: true })
  token: string;

  /**
   * 令牌类型
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'email',
  })
  type: 'email' | 'phone';

  /**
   * 发送目标（邮箱或手机号，脱敏存储）
   */
  @Column()
  target: string;

  /**
   * 是否已使用
   */
  @Column({ default: false })
  used: boolean;

  /**
   * 使用时间
   */
  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt: Date | null;

  /**
   * 过期时间（默认1小时后过期）
   */
  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  /**
   * 请求IP
   */
  @Column({ name: 'request_ip', nullable: true })
  requestIp: string;

  /**
   * User-Agent
   */
  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
