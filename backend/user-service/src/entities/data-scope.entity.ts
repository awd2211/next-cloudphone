import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Role } from './role.entity';

/**
 * 数据范围类型
 */
export enum ScopeType {
  ALL = 'all',               // 全部数据（不限制）
  TENANT = 'tenant',         // 本租户数据
  DEPARTMENT = 'department', // 本部门及子部门数据
  DEPARTMENT_ONLY = 'department_only', // 仅本部门数据（不含子部门）
  SELF = 'self',             // 仅本人创建的数据
  CUSTOM = 'custom',         // 自定义过滤条件
}

/**
 * 数据范围实体
 * 用于配置角色对特定资源类型的数据访问范围
 *
 * 使用场景：
 * - 销售角色只能查看本部门的客户数据
 * - 运营角色只能管理本租户的设备
 * - 财务角色可以查看所有租户的账单数据
 */
@Entity('data_scopes')
@Index(['roleId', 'resourceType'], { unique: true }) // 一个角色对一种资源类型只能有一条数据范围规则
export class DataScope {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 关联的角色ID
   */
  @Column({ type: 'uuid' })
  @Index()
  roleId: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  /**
   * 资源类型
   * 例如: 'device', 'user', 'order', 'ticket' 等
   */
  @Column()
  @Index()
  resourceType: string;

  /**
   * 数据范围类型
   */
  @Column({
    type: 'enum',
    enum: ScopeType,
    default: ScopeType.TENANT,
  })
  scopeType: ScopeType;

  /**
   * 自定义过滤条件
   * 当 scopeType 为 'custom' 时使用
   *
   * 示例:
   * {
   *   "status": { "$in": ["active", "pending"] },
   *   "region": "north",
   *   "level": { "$gte": 3 }
   * }
   *
   * 支持的操作符：
   * - $eq: 等于
   * - $ne: 不等于
   * - $in: 在数组中
   * - $nin: 不在数组中
   * - $gt, $gte, $lt, $lte: 大于、大于等于、小于、小于等于
   * - $like: 模糊匹配
   * - $between: 范围
   */
  @Column({ type: 'jsonb', nullable: true })
  filter: Record<string, any>;

  /**
   * 部门ID列表（当 scopeType 为 'department' 时使用）
   * 为空表示使用用户自己的部门
   * 非空表示指定特定部门（支持跨部门数据访问）
   */
  @Column({ type: 'simple-array', nullable: true })
  departmentIds: string[];

  /**
   * 是否包含子部门数据
   * 仅在 scopeType 为 'department' 时有效
   */
  @Column({ default: true })
  includeSubDepartments: boolean;

  /**
   * 描述
   */
  @Column({ nullable: true })
  description: string;

  /**
   * 是否启用
   */
  @Column({ default: true })
  isActive: boolean;

  /**
   * 优先级（数字越小优先级越高）
   * 当一个角色有多个数据范围规则时，使用优先级最高的
   */
  @Column({ default: 100 })
  priority: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
