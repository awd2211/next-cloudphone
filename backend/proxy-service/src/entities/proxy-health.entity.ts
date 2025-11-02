import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('proxy_health')
@Index(['proxyId', 'checkedAt'])
@Index(['provider', 'isHealthy'])
export class ProxyHealth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  proxyId: string; // 代理ID

  @Column({ type: 'varchar', length: 50 })
  provider: string; // 供应商名称

  @Column({ type: 'boolean' })
  isHealthy: boolean; // 是否健康

  @Column({ type: 'integer', nullable: true })
  latencyMs: number; // 延迟（毫秒）

  @Column({ type: 'varchar', length: 500, nullable: true })
  error: string; // 错误信息（如果不健康）

  @Column({ type: 'integer', default: 0 })
  consecutiveFailures: number; // 连续失败次数

  @CreateDateColumn()
  @Index()
  checkedAt: Date; // 检查时间
}
