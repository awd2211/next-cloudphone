import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A/B 测试配置实体
 * 用于测试不同平台的性能表现
 */
@Entity('ab_test_config')
export class ABTestConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'test_name', length: 100, unique: true })
  testName: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  // 测试状态
  @Column({ name: 'status', length: 20, default: 'draft' })
  status: string; // 'draft', 'running', 'paused', 'completed'

  // 参与测试的平台和权重
  @Column({ name: 'providers', type: 'jsonb' })
  providers: Array<{
    provider: string;
    weight: number; // 流量分配权重，总和应为100
    enabled: boolean;
  }>;

  // 测试目标
  @Column({ name: 'test_goal', length: 50 })
  testGoal: string; // 'cost', 'success_rate', 'speed', 'balance'

  // 样本量要求
  @Column({ name: 'sample_size_target', type: 'int', default: 100 })
  sampleSizeTarget: number;

  // 当前样本量
  @Column({ name: 'current_sample_size', type: 'int', default: 0 })
  currentSampleSize: number;

  // 测试结果统计
  @Column({ name: 'test_results', type: 'jsonb', nullable: true })
  testResults: Record<string, {
    requests: number;
    successes: number;
    failures: number;
    successRate: number;
    averageCost: number;
    averageResponseTime: number;
  }>;

  // 胜出平台
  @Column({ name: 'winner', length: 50, nullable: true })
  winner: string;

  // 置信度
  @Column({ name: 'confidence_level', type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceLevel: number;

  // 时间范围
  @Column({ name: 'start_time', type: 'timestamp', nullable: true })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', length: 100, nullable: true })
  createdBy: string;
}
