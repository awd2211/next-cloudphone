import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SettingCategory {
  BASIC = 'basic',
  EMAIL = 'email',
  SMS = 'sms',
  PAYMENT = 'payment',
  STORAGE = 'storage',
  SECURITY = 'security',
  NOTIFICATION = 'notification',
}

@Entity('settings')
@Index(['category', 'key'])
export class Setting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SettingCategory,
  })
  @Index()
  category: SettingCategory;

  @Column({ length: 100 })
  @Index()
  key: string; // 配置键

  @Column({ type: 'text' })
  value: string; // 配置值

  @Column({ type: 'text', nullable: true })
  description: string; // 描述

  @Column({ default: false })
  isEncrypted: boolean; // 是否加密存储（如密码）

  @Column({ default: false })
  isPublic: boolean; // 是否公开（前端可访问）

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
