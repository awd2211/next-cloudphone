import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 部门实体
 *
 * 用于组织架构和数据权限控制
 */
@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  code: string; // 部门编码

  @Column()
  name: string; // 部门名称

  @Column({ nullable: true })
  @Index()
  parentId: string; // 父部门ID

  @Column({ type: 'text', nullable: true })
  description: string; // 部门描述

  @Column({ nullable: true })
  managerId: string; // 部门负责人ID

  @Column({ type: 'int', default: 0 })
  level: number; // 部门层级（0为顶级）

  @Column({ type: 'text', nullable: true })
  path: string; // 部门路径（如：/1/2/3，方便查询）

  @Column({ type: 'int', default: 0 })
  sort: number; // 排序

  @Column({ default: true })
  isActive: boolean; // 是否激活

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // 额外信息（如：地址、电话等）

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
