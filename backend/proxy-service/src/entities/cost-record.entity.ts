import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('cost_records')
@Index(['provider', 'recordDate'])
@Index(['recordDate'])
export class CostRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string; // 供应商名称

  @Column({ type: 'date' })
  recordDate: Date; // 记录日期

  @Column({ type: 'integer', default: 0 })
  totalRequests: number; // 总请求数

  @Column({ type: 'integer', default: 0 })
  successfulRequests: number; // 成功请求数

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalBandwidthMB: number; // 总带宽（MB）

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  totalCost: number; // 总成本（USD）

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  avgCostPerRequest: number; // 平均每请求成本

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  avgCostPerGB: number; // 平均每GB成本

  @CreateDateColumn()
  createdAt: Date;
}
