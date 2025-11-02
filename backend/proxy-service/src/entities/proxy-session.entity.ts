import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('proxy_sessions')
@Index(['deviceId', 'isActive'])
export class ProxySession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  deviceId: string; // 设备ID

  @Column({ type: 'varchar', length: 255 })
  proxyId: string; // 当前使用的代理ID

  @Column({ type: 'varchar', length: 50 })
  provider: string; // 供应商名称

  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean; // 会话是否活跃

  @Column({ type: 'varchar', length: 10 })
  country: string; // 代理所在国家

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string; // 代理所在城市

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date; // 会话过期时间

  @Column({ type: 'integer', default: 0 })
  totalRequests: number; // 该会话总请求数

  @Column({ type: 'integer', default: 0 })
  failedRequests: number; // 失败请求数

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
