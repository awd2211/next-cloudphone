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
 * 字段访问级别
 */
export enum FieldAccessLevel {
  HIDDEN = 'hidden',     // 完全隐藏，用户看不到此字段
  READ = 'read',         // 只读，可以查看但不能修改
  WRITE = 'write',       // 可读可写
  REQUIRED = 'required', // 必填字段（写入时必须提供）
}

/**
 * 操作类型
 */
export enum OperationType {
  CREATE = 'create',   // 创建时的字段权限
  UPDATE = 'update',   // 更新时的字段权限
  VIEW = 'view',       // 查看时的字段权限
  EXPORT = 'export',   // 导出时的字段权限
}

/**
 * 字段权限实体
 * 用于精细控制角色对资源特定字段的访问权限
 *
 * 使用场景：
 * - 客服角色不能查看用户的手机号和邮箱
 * - 普通员工不能修改订单的金额字段
 * - 财务角色可以查看所有价格信息
 * - 管理员可以编辑所有字段
 */
@Entity('field_permissions')
@Index(['roleId', 'resourceType', 'operation'], { unique: false })
export class FieldPermission {
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
   * 例如: 'user', 'device', 'order', 'ticket' 等
   */
  @Column()
  @Index()
  resourceType: string;

  /**
   * 操作类型
   * 不同操作可以有不同的字段权限
   */
  @Column({
    type: 'enum',
    enum: OperationType,
    default: OperationType.VIEW,
  })
  operation: OperationType;

  /**
   * 完全隐藏的字段列表
   * 这些字段在任何情况下都不会返回给前端
   */
  @Column({ type: 'simple-array', nullable: true })
  hiddenFields: string[];

  /**
   * 只读字段列表
   * 这些字段可以查看但不能修改
   */
  @Column({ type: 'simple-array', nullable: true })
  readOnlyFields: string[];

  /**
   * 可写字段列表（白名单模式）
   * 如果此字段非空，则只有列表中的字段可以修改
   * 为空表示不使用白名单模式
   */
  @Column({ type: 'simple-array', nullable: true })
  writableFields: string[];

  /**
   * 必填字段列表
   * 在创建或更新时必须提供这些字段
   */
  @Column({ type: 'simple-array', nullable: true })
  requiredFields: string[];

  /**
   * 字段级访问控制映射
   * 更精细的字段权限控制
   *
   * 示例:
   * {
   *   "email": "read",
   *   "phone": "hidden",
   *   "name": "write",
   *   "balance": "read",
   *   "password": "hidden"
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  fieldAccessMap: Record<string, FieldAccessLevel>;

  /**
   * 字段转换规则
   * 对某些字段进行脱敏或转换
   *
   * 示例:
   * {
   *   "phone": { "type": "mask", "pattern": "***-****-{4}" },
   *   "email": { "type": "mask", "pattern": "{3}***@***" },
   *   "idCard": { "type": "mask", "pattern": "{6}********{4}" }
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  fieldTransforms: Record<string, any>;

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
   * 当一个角色有多个字段权限规则时，使用优先级最高的
   */
  @Column({ default: 100 })
  priority: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
