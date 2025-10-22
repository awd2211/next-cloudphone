import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 菜单实体
 * 
 * 用于动态管理系统菜单配置
 */
@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  code: string; // 菜单唯一标识

  @Column()
  name: string; // 菜单名称

  @Column()
  path: string; // 路由路径

  @Column({ nullable: true })
  icon: string; // 图标

  @Column({ nullable: true })
  @Index()
  parentId: string; // 父菜单ID

  @Column({ type: 'int', default: 0 })
  sort: number; // 排序

  @Column({ default: true })
  isActive: boolean; // 是否激活

  @Column({ default: true })
  visible: boolean; // 是否可见

  @Column({ nullable: true })
  permissionCode: string; // 关联权限码

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // 额外配置（如：外部链接、打开方式等）

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

