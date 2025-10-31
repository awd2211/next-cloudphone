import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  Index,
} from 'typeorm';
import { Role } from './role.entity';

/**
 * 数据权限范围类型
 */
export enum DataScopeType {
  ALL = 'all', // 全部数据
  TENANT = 'tenant', // 本租户数据
  DEPARTMENT = 'department', // 本部门数据（含子部门）
  SELF = 'self', // 仅本人创建的数据
  CUSTOM = 'custom', // 自定义范围
}

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  @Index()
  resource: string;

  @Column()
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  conditions: Record<string, any>;

  /**
   * 数据权限范围
   * 定义此权限可以访问的数据范围
   */
  @Column({
    type: 'enum',
    enum: DataScopeType,
    default: DataScopeType.TENANT,
  })
  scope: DataScopeType;

  /**
   * 数据过滤规则
   * 当 scope 为 'custom' 时使用
   * 示例: { "status": "active", "region": ["north", "south"] }
   */
  @Column({ type: 'jsonb', nullable: true })
  dataFilter: Record<string, any>;

  /**
   * 字段级权限规则
   * 定义哪些字段可见、可编辑、隐藏
   * 示例: {
   *   "hidden": ["password", "secretKey"],
   *   "readOnly": ["createdAt", "id"],
   *   "visible": ["name", "email", "status"]
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  fieldRules: {
    hidden?: string[]; // 隐藏字段
    readOnly?: string[]; // 只读字段
    visible?: string[]; // 可见字段（白名单）
    editable?: string[]; // 可编辑字段
  };

  /**
   * 扩展元数据
   * 用于存储额外的权限配置
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
