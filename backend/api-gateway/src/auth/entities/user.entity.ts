import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: 'user' })
  role: string; // 'admin' | 'user'

  @Column({ default: 'active' })
  status: string; // 'active' | 'inactive'

  @Column({ nullable: true })
  tenantId: string; // 租户 ID，用于多租户隔离

  @Column({ default: false })
  twoFactorEnabled: boolean; // 是否启用2FA

  @Column({ nullable: true })
  twoFactorSecret: string; // TOTP密钥（加密存储）

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
