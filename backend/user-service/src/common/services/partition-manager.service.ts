import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * 分区统计信息
 */
export interface PartitionStats {
  partitionName: string;
  partitionStart: Date;
  partitionEnd: Date;
  rowCount: number;
  tableSize: string;
  indexSize: string;
  totalSize: string;
}

/**
 * 分区信息
 */
export interface PartitionInfo {
  partitionName: string;
  partitionBounds: string;
  size: string;
  hasData: number;
}

/**
 * 分区管理服务
 *
 * 功能：
 * - 自动创建未来分区
 * - 清理过期分区
 * - 分区统计和监控
 * - 健康检查
 */
@Injectable()
export class PartitionManagerService {
  private readonly logger = new Logger(PartitionManagerService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  /**
   * 创建未来分区（每月 1 号凌晨 2 点执行）
   *
   * 自动创建未来 3 个月的分区，防止分区不存在导致插入失败
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT, {
    name: 'create-future-partitions',
    timeZone: 'Asia/Shanghai',
  })
  async createFuturePartitions(): Promise<void> {
    try {
      this.logger.log('开始创建未来分区...');

      const result = await this.dataSource.query('SELECT create_future_partitions()');

      this.logger.log('✓ 未来分区创建完成', result);
    } catch (error) {
      this.logger.error('创建未来分区失败', error);
      throw error;
    }
  }

  /**
   * 清理旧分区（每月 1 号凌晨 3 点执行）
   *
   * 删除超过保留期的旧分区（默认保留 12 个月）
   *
   * @param retentionMonths 保留月数（默认 12）
   */
  @Cron('0 3 1 * *', {
    name: 'cleanup-old-partitions',
    timeZone: 'Asia/Shanghai',
  })
  async cleanupOldPartitions(retentionMonths: number = 12): Promise<void> {
    try {
      this.logger.log(`开始清理旧分区（保留 ${retentionMonths} 个月）...`);

      const result = await this.dataSource.query('SELECT * FROM cleanup_old_partitions($1)', [
        retentionMonths,
      ]);

      if (result.length > 0) {
        this.logger.log(
          `✓ 已删除 ${result.length} 个旧分区:`,
          result.map((r: any) => r.dropped_partition)
        );
      } else {
        this.logger.log('✓ 无需清理旧分区');
      }
    } catch (error) {
      this.logger.error('清理旧分区失败', error);
      throw error;
    }
  }

  /**
   * 手动创建未来分区（用于初始化或故障恢复）
   */
  async manualCreateFuturePartitions(): Promise<void> {
    await this.createFuturePartitions();
  }

  /**
   * 手动清理旧分区
   *
   * @param retentionMonths 保留月数
   */
  async manualCleanupOldPartitions(retentionMonths: number = 12): Promise<void> {
    await this.cleanupOldPartitions(retentionMonths);
  }

  /**
   * 获取所有分区统计信息
   *
   * @returns 分区统计信息列表
   */
  async getPartitionStats(): Promise<PartitionStats[]> {
    try {
      const result = await this.dataSource.query('SELECT * FROM get_partition_stats()');

      return result.map((row: any) => ({
        partitionName: row.partition_name,
        partitionStart: row.partition_start,
        partitionEnd: row.partition_end,
        rowCount: parseInt(row.row_count, 10),
        tableSize: row.table_size,
        indexSize: row.index_size,
        totalSize: row.total_size,
      }));
    } catch (error) {
      this.logger.error('获取分区统计失败', error);
      throw error;
    }
  }

  /**
   * 获取分区信息
   *
   * @returns 分区信息列表
   */
  async getPartitionInfo(): Promise<PartitionInfo[]> {
    try {
      const result = await this.dataSource.query('SELECT * FROM v_partition_info');

      return result.map((row: any) => ({
        partitionName: row.partition_name,
        partitionBounds: row.partition_bounds,
        size: row.size,
        hasData: row.has_data,
      }));
    } catch (error) {
      this.logger.error('获取分区信息失败', error);
      throw error;
    }
  }

  /**
   * 检查分区健康状态
   *
   * @returns 健康检查结果
   */
  async checkPartitionHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    stats: {
      totalPartitions: number;
      futurePartitions: number;
      pastPartitions: number;
      defaultPartitionRows: number;
    };
  }> {
    const issues: string[] = [];

    try {
      const partitionInfo = await this.getPartitionInfo();
      const totalPartitions = partitionInfo.length;

      // 检查未来分区数量（应至少有 3 个未来分区）
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      let futurePartitionCount = 0;
      let pastPartitionCount = 0;

      for (const partition of partitionInfo) {
        // 简单检查分区名是否包含未来日期
        const match = partition.partitionName.match(/user_events_(\d{4})_(\d{2})/);
        if (match) {
          const [, year, month] = match;
          const partitionDate = new Date(parseInt(year), parseInt(month) - 1, 1);

          if (partitionDate > currentMonth) {
            futurePartitionCount++;
          } else if (partitionDate < currentMonth) {
            pastPartitionCount++;
          }
        }
      }

      if (futurePartitionCount < 2) {
        issues.push(`未来分区数量不足：${futurePartitionCount} < 2（建议立即创建）`);
      }

      // 检查默认分区中的数据量（不应该有数据）
      const defaultPartitionRows = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM ONLY user_events_default'
      );

      const defaultRowCount = parseInt(defaultPartitionRows[0]?.count || '0', 10);

      if (defaultRowCount > 0) {
        issues.push(`默认分区中有 ${defaultRowCount} 条数据（可能是分区不存在或日期异常）`);
      }

      const healthy = issues.length === 0;

      return {
        healthy,
        issues,
        stats: {
          totalPartitions,
          futurePartitions: futurePartitionCount,
          pastPartitions: pastPartitionCount,
          defaultPartitionRows: defaultRowCount,
        },
      };
    } catch (error) {
      this.logger.error('分区健康检查失败', error);
      return {
        healthy: false,
        issues: [`健康检查执行失败: ${error.message}`],
        stats: {
          totalPartitions: 0,
          futurePartitions: 0,
          pastPartitions: 0,
          defaultPartitionRows: 0,
        },
      };
    }
  }

  /**
   * 获取分区总览
   */
  async getPartitionSummary(): Promise<{
    totalPartitions: number;
    totalRows: number;
    totalSize: string;
    oldestPartition: string;
    newestPartition: string;
  }> {
    try {
      const stats = await this.getPartitionStats();

      const totalPartitions = stats.length;
      const totalRows = stats.reduce((sum, s) => sum + s.rowCount, 0);

      // 获取总大小
      const totalSizeResult = await this.dataSource.query(
        "SELECT pg_size_pretty(pg_total_relation_size('user_events')) as size"
      );
      const totalSize = totalSizeResult[0]?.size || '0 bytes';

      const oldestPartition = stats[stats.length - 1]?.partitionName || 'N/A';
      const newestPartition = stats[0]?.partitionName || 'N/A';

      return {
        totalPartitions,
        totalRows,
        totalSize,
        oldestPartition,
        newestPartition,
      };
    } catch (error) {
      this.logger.error('获取分区总览失败', error);
      throw error;
    }
  }

  /**
   * 启动时初始化（确保未来分区存在）
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('初始化分区管理器...');

      // 检查分区健康状态
      const health = await this.checkPartitionHealth();

      if (!health.healthy) {
        this.logger.warn('分区健康检查发现问题:', health.issues);

        // 尝试创建未来分区
        if (health.stats.futurePartitions < 2) {
          this.logger.log('自动创建未来分区...');
          await this.createFuturePartitions();
        }
      }

      // 输出分区总览
      const summary = await this.getPartitionSummary();
      this.logger.log('分区总览:', {
        总分区数: summary.totalPartitions,
        总记录数: summary.totalRows,
        总大小: summary.totalSize,
        最旧分区: summary.oldestPartition,
        最新分区: summary.newestPartition,
      });

      this.logger.log('✓ 分区管理器初始化完成');
    } catch (error) {
      this.logger.error('分区管理器初始化失败', error);
      // 不抛出错误，允许服务启动
    }
  }
}
