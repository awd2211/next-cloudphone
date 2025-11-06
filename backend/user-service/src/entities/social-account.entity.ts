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
import { User } from './user.entity';

/**
 * 社交账号绑定实体
 *
 * 功能：
 * - 存储用户绑定的社交账号信息
 * - 支持多个社交平台（Google、Facebook、Twitter 等）
 * - 一个用户可以绑定多个社交账号
 * - 一个社交账号只能绑定一个用户
 */
@Entity('social_accounts')
@Index(['provider', 'providerId'], { unique: true }) // 同一平台的同一账号只能绑定一次
export class SocialAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '社交平台类型 (google, facebook, twitter)',
  })
  provider: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'provider_id',
    comment: '社交平台用户ID',
  })
  providerId: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '社交平台邮箱',
  })
  email?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'display_name',
    comment: '社交平台显示名称',
  })
  displayName?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '社交平台头像URL',
  })
  avatar?: string;

  @Column({
    type: 'text',
    nullable: true,
    name: 'access_token',
    comment: '访问令牌（加密存储）',
  })
  accessToken?: string;

  @Column({
    type: 'text',
    nullable: true,
    name: 'refresh_token',
    comment: '刷新令牌（加密存储）',
  })
  refreshToken?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'token_expires_at',
    comment: '令牌过期时间',
  })
  tokenExpiresAt?: Date;

  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'raw_profile',
    comment: '原始用户资料（JSON格式）',
  })
  rawProfile?: Record<string, any>;

  @Column({
    type: 'timestamp',
    name: 'last_login_at',
    nullable: true,
    comment: '最后登录时间',
  })
  lastLoginAt?: Date;

  // 关联用户
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.socialAccounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
