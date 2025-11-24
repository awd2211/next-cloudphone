import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 班次模板实体
 * 定义标准工作班次
 */
@Entity('shift_templates')
@Index(['tenantId', 'name'], { unique: true })
export class ShiftTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  /**
   * 班次名称（如：早班、中班、晚班）
   */
  @Column()
  name: string;

  /**
   * 班次代码（用于快速识别）
   */
  @Column({ nullable: true })
  code: string;

  /**
   * 开始时间（HH:mm 格式）
   */
  @Column()
  startTime: string;

  /**
   * 结束时间（HH:mm 格式）
   */
  @Column()
  endTime: string;

  /**
   * 是否跨天（夜班可能从 22:00 到次日 06:00）
   */
  @Column({ default: false })
  crossDay: boolean;

  /**
   * 休息时间配置
   */
  @Column({ type: 'jsonb', default: [] })
  breakTimes: {
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    name?: string; // 如：午休、晚餐
  }[];

  /**
   * 工作时长（分钟，自动计算）
   */
  @Column({ default: 0 })
  workDuration: number;

  /**
   * 班次颜色（用于日历显示）
   */
  @Column({ default: '#1890ff' })
  color: string;

  /**
   * 是否启用
   */
  @Column({ default: true })
  isActive: boolean;

  /**
   * 描述
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
