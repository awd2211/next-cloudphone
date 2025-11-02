import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('proxy_providers')
export class ProxyProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  type: string; // 'brightdata' | 'oxylabs' | 'iproyal'

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'integer', default: 100 })
  priority: number; // 优先级：值越大优先级越高

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>; // 供应商配置（API密钥等）

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  costPerGB: number; // 每GB成本（USD）

  @Column({ type: 'integer', default: 0 })
  totalRequests: number; // 总请求数

  @Column({ type: 'integer', default: 0 })
  successRequests: number; // 成功请求数

  @Column({ type: 'integer', default: 0 })
  failedRequests: number; // 失败请求数

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  successRate: number; // 成功率

  @Column({ type: 'integer', default: 0 })
  avgLatencyMs: number; // 平均延迟（毫秒）

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
