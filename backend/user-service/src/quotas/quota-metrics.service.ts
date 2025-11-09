import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quota, QuotaStatus } from '../entities/quota.entity';
import { EventBusService } from '@cloudphone/shared';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * 配额指标服务
 *
 * 负责收集配额使用指标、生成告警并发布事件
 */
@Injectable()
export class QuotaMetricsService {
  private readonly logger = new Logger(QuotaMetricsService.name);

  // 内存中的指标缓存 (用于Prometheus抓取)
  private metrics = {
    totalQuotas: 0,
    activeQuotas: 0,
    exceededQuotas: 0,
    expiredQuotas: 0,
    suspendedQuotas: 0,
    highUsageQuotas: 0, // 使用率 > 80%
    criticalUsageQuotas: 0, // 使用率 > 95%
    avgDeviceUsagePercent: 0,
    avgCpuUsagePercent: 0,
    avgMemoryUsagePercent: 0,
    avgStorageUsagePercent: 0,
    avgTrafficUsagePercent: 0,
    lastUpdated: new Date(),
  };

  constructor(
    @InjectRepository(Quota)
    private quotaRepository: Repository<Quota>,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * 获取当前指标 (供Prometheus抓取)
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * 更新配额指标 (每5分钟)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateMetrics(): Promise<void> {
    try {
      this.logger.log('开始更新配额指标...');

      const quotas = await this.quotaRepository.find({
        select: ['id', 'userId', 'status', 'limits', 'usage'],
      });

      // 重置计数器
      this.metrics.totalQuotas = quotas.length;
      this.metrics.activeQuotas = 0;
      this.metrics.exceededQuotas = 0;
      this.metrics.expiredQuotas = 0;
      this.metrics.suspendedQuotas = 0;
      this.metrics.highUsageQuotas = 0;
      this.metrics.criticalUsageQuotas = 0;

      let totalDeviceUsage = 0;
      let totalCpuUsage = 0;
      let totalMemoryUsage = 0;
      let totalStorageUsage = 0;
      let totalTrafficUsage = 0;
      let validQuotas = 0;

      for (const quota of quotas) {
        // 统计状态分布
        switch (quota.status) {
          case QuotaStatus.ACTIVE:
            this.metrics.activeQuotas++;
            break;
          case QuotaStatus.EXCEEDED:
            this.metrics.exceededQuotas++;
            break;
          case QuotaStatus.EXPIRED:
            this.metrics.expiredQuotas++;
            break;
          case QuotaStatus.SUSPENDED:
            this.metrics.suspendedQuotas++;
            break;
        }

        // 计算使用率
        if (quota.status === QuotaStatus.ACTIVE) {
          validQuotas++;

          const deviceUsage =
            quota.limits.maxDevices > 0
              ? (quota.usage.currentDevices / quota.limits.maxDevices) * 100
              : 0;

          const cpuUsage =
            quota.limits.totalCpuCores > 0
              ? (quota.usage.usedCpuCores / quota.limits.totalCpuCores) * 100
              : 0;

          const memoryUsage =
            quota.limits.totalMemoryGB > 0
              ? (quota.usage.usedMemoryGB / quota.limits.totalMemoryGB) * 100
              : 0;

          const storageUsage =
            quota.limits.totalStorageGB > 0
              ? (quota.usage.usedStorageGB / quota.limits.totalStorageGB) * 100
              : 0;

          const trafficUsage =
            quota.limits.monthlyTrafficGB > 0
              ? (quota.usage.monthlyTrafficUsedGB / quota.limits.monthlyTrafficGB) * 100
              : 0;

          totalDeviceUsage += deviceUsage;
          totalCpuUsage += cpuUsage;
          totalMemoryUsage += memoryUsage;
          totalStorageUsage += storageUsage;
          totalTrafficUsage += trafficUsage;

          // 统计高使用率配额
          const maxUsage = Math.max(deviceUsage, cpuUsage, memoryUsage, storageUsage, trafficUsage);

          if (maxUsage >= 95) {
            this.metrics.criticalUsageQuotas++;
          } else if (maxUsage >= 80) {
            this.metrics.highUsageQuotas++;
          }
        }
      }

      // 计算平均使用率
      if (validQuotas > 0) {
        this.metrics.avgDeviceUsagePercent = totalDeviceUsage / validQuotas;
        this.metrics.avgCpuUsagePercent = totalCpuUsage / validQuotas;
        this.metrics.avgMemoryUsagePercent = totalMemoryUsage / validQuotas;
        this.metrics.avgStorageUsagePercent = totalStorageUsage / validQuotas;
        this.metrics.avgTrafficUsagePercent = totalTrafficUsage / validQuotas;
      }

      this.metrics.lastUpdated = new Date();

      this.logger.log(
        `配额指标已更新 - 总数: ${this.metrics.totalQuotas}, ` +
          `活跃: ${this.metrics.activeQuotas}, ` +
          `高使用率: ${this.metrics.highUsageQuotas}, ` +
          `危险: ${this.metrics.criticalUsageQuotas}`,
      );

      // 发布指标事件
      await this.publishMetricsEvent();
    } catch (error) {
      this.logger.error('更新配额指标失败', error.stack);
    }
  }

  /**
   * 检查并发送配额告警 (每小时)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkAndSendAlerts(): Promise<void> {
    try {
      this.logger.log('开始检查配额告警...');

      const quotas = await this.quotaRepository.find({
        where: { status: QuotaStatus.ACTIVE },
        select: ['id', 'userId', 'planName', 'limits', 'usage'],
        relations: ['user'],
      });

      let criticalAlerts = 0;
      let warningAlerts = 0;

      for (const quota of quotas) {
        const percentage = {
          devices:
            quota.limits.maxDevices > 0
              ? (quota.usage.currentDevices / quota.limits.maxDevices) * 100
              : 0,
          cpu:
            quota.limits.totalCpuCores > 0
              ? (quota.usage.usedCpuCores / quota.limits.totalCpuCores) * 100
              : 0,
          memory:
            quota.limits.totalMemoryGB > 0
              ? (quota.usage.usedMemoryGB / quota.limits.totalMemoryGB) * 100
              : 0,
          storage:
            quota.limits.totalStorageGB > 0
              ? (quota.usage.usedStorageGB / quota.limits.totalStorageGB) * 100
              : 0,
          traffic:
            quota.limits.monthlyTrafficGB > 0
              ? (quota.usage.monthlyTrafficUsedGB / quota.limits.monthlyTrafficGB) * 100
              : 0,
        };

        const maxUsage = Math.max(
          percentage.devices,
          percentage.cpu,
          percentage.memory,
          percentage.storage,
          percentage.traffic,
        );

        // 发送告警
        if (maxUsage >= 95) {
          // 危险级别 (95%+)
          criticalAlerts++;
          await this.sendAlert(quota.userId, 'critical', percentage, quota);
        } else if (maxUsage >= 80) {
          // 警告级别 (80-95%)
          warningAlerts++;
          await this.sendAlert(quota.userId, 'warning', percentage, quota);
        }
      }

      this.logger.log(
        `配额告警检查完成 - 危险告警: ${criticalAlerts}, 警告告警: ${warningAlerts}`,
      );
    } catch (error) {
      this.logger.error('配额告警检查失败', error.stack);
    }
  }

  /**
   * 发送配额告警事件
   */
  private async sendAlert(
    userId: string,
    severity: 'warning' | 'critical',
    percentage: Record<string, number>,
    quota: Quota,
  ): Promise<void> {
    try {
      // 生成告警消息
      const warnings: string[] = [];

      if (percentage.devices >= 80) {
        warnings.push(`设备配额使用率 ${percentage.devices.toFixed(1)}%`);
      }
      if (percentage.cpu >= 80) {
        warnings.push(`CPU 配额使用率 ${percentage.cpu.toFixed(1)}%`);
      }
      if (percentage.memory >= 80) {
        warnings.push(`内存配额使用率 ${percentage.memory.toFixed(1)}%`);
      }
      if (percentage.storage >= 80) {
        warnings.push(`存储配额使用率 ${percentage.storage.toFixed(1)}%`);
      }
      if (percentage.traffic >= 80) {
        warnings.push(`流量配额使用率 ${percentage.traffic.toFixed(1)}%`);
      }

      // 发布告警事件到 RabbitMQ
      await this.eventBus.publish('cloudphone.events', 'quota.alert', {
        userId,
        quotaId: quota.id,
        planName: quota.planName || '未知套餐',
        severity,
        percentage,
        warnings,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`配额告警已发送 - 用户: ${userId}, 级别: ${severity}`);
    } catch (error) {
      this.logger.error(`发送配额告警失败 - 用户: ${userId}`, error.stack);
    }
  }

  /**
   * 发布指标事件
   */
  private async publishMetricsEvent(): Promise<void> {
    try {
      await this.eventBus.publish('cloudphone.events', 'quota.metrics', {
        ...this.metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('发布配额指标事件失败', error.stack);
    }
  }

  /**
   * 获取配额统计摘要
   */
  async getQuotaSummary(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    avgUsage: {
      devices: number;
      cpu: number;
      memory: number;
      storage: number;
      traffic: number;
    };
    alerts: {
      high: number;
      critical: number;
    };
  }> {
    return {
      total: this.metrics.totalQuotas,
      byStatus: {
        active: this.metrics.activeQuotas,
        exceeded: this.metrics.exceededQuotas,
        expired: this.metrics.expiredQuotas,
        suspended: this.metrics.suspendedQuotas,
      },
      avgUsage: {
        devices: this.metrics.avgDeviceUsagePercent,
        cpu: this.metrics.avgCpuUsagePercent,
        memory: this.metrics.avgMemoryUsagePercent,
        storage: this.metrics.avgStorageUsagePercent,
        traffic: this.metrics.avgTrafficUsagePercent,
      },
      alerts: {
        high: this.metrics.highUsageQuotas,
        critical: this.metrics.criticalUsageQuotas,
      },
    };
  }
}
