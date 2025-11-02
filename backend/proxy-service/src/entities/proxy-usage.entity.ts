import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('proxy_usage')
@Index(['proxyId', 'usedAt'])
@Index(['provider', 'usedAt'])
export class ProxyUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  proxyId: string; // 代理ID

  @Column({ type: 'varchar', length: 50 })
  @Index()
  provider: string; // 供应商名称

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceId: string; // 使用该代理的设备ID

  @Column({ type: 'varchar', length: 10 })
  country: string; // 代理所在国家

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string; // 代理所在城市

  @Column({ type: 'integer', default: 0 })
  bandwidthMB: number; // 使用的带宽（MB）

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  cost: number; // 本次使用成本（USD）

  @Column({ type: 'integer', default: 0 })
  duration: number; // 使用时长（秒）

  @Column({ type: 'boolean', default: true })
  success: boolean; // 是否成功

  @Column({ type: 'varchar', length: 500, nullable: true })
  errorMessage: string; // 错误信息（如果失败）

  @CreateDateColumn()
  @Index()
  usedAt: Date; // 使用时间
}
