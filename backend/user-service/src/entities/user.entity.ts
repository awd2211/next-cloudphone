import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  Index,
  OneToMany,
} from 'typeorm';
import { Role } from './role.entity';
import { SocialAccount } from './social-account.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

@Entity('users')
@Index('IDX_USER_TENANT_STATUS', ['tenantId', 'status']) // 复合索引：按租户和状态查询
@Index('IDX_USER_TENANT_CREATED', ['tenantId', 'createdAt']) // 复合索引：租户列表查询和排序
@Index('IDX_USER_EMAIL_STATUS', ['email', 'status']) // 复合索引：邮箱查找时过滤状态
@Index('IDX_USER_USERNAME_STATUS', ['username', 'status']) // 复合索引：用户名查找时过滤状态
@Index('IDX_USER_LAST_LOGIN', ['lastLoginAt']) // 单列索引：用于活跃用户统计
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  username: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  fullName: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ nullable: true })
  @Index()
  tenantId: string;

  /**
   * 部门ID
   * 支持组织层级结构，用于部门级数据权限控制
   */
  @Column({ nullable: true })
  @Index()
  departmentId: string;

  /**
   * 默认数据权限范围
   * 用户的默认数据可见范围，可被角色权限覆盖
   */
  @Column({
    type: 'enum',
    enum: ['all', 'tenant', 'department', 'self'],
    default: 'tenant',
  })
  dataScope: 'all' | 'tenant' | 'department' | 'self';

  /**
   * 是否为平台超级管理员
   * 超级管理员拥有跨租户访问权限和所有权限
   */
  @Column({ default: false })
  isSuperAdmin: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  loginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  lastLoginIp: string;

  /**
   * 密码修改时间
   * 用于密码重置流程追踪
   */
  @Column({ name: 'password_changed_at', type: 'timestamp', nullable: true })
  passwordChangedAt: Date;

  /**
   * 账号是否激活
   * 与 status 配合使用，便于快速查询
   */
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /**
   * 双因素认证密钥
   * 存储TOTP密钥，用于生成验证码
   */
  @Column({ name: 'two_factor_secret', type: 'varchar', nullable: true })
  twoFactorSecret: string | null;

  /**
   * 是否启用双因素认证
   */
  @Column({ name: 'two_factor_enabled', default: false })
  twoFactorEnabled: boolean;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  /**
   * 用户绑定的社交账号
   */
  @OneToMany(() => SocialAccount, (socialAccount) => socialAccount.user)
  socialAccounts: SocialAccount[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
