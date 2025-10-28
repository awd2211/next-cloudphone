import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpClientService } from '@cloudphone/shared';
import { UsageRecord } from '../billing/entities/usage-record.entity';

export interface DeviceUsageData {
  deviceId: string;
  userId: string;
  tenantId?: string;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  networkTraffic: number;
  duration: number; // 使用时长（秒）
}

@Injectable()
export class MeteringService {
  private readonly logger = new Logger(MeteringService.name);

  constructor(
    @InjectRepository(UsageRecord)
    private usageRecordRepository: Repository<UsageRecord>,
    private httpClient: HttpClientService,
    private configService: ConfigService,
  ) {}

  /**
   * 定时任务：每小时采集使用量数据
   */
  @Cron(CronExpression.EVERY_HOUR)
  async collectUsageData() {
    this.logger.log('Starting usage data collection...');

    try {
      // 获取所有运行中的设备
      const devices = await this.getRunningDevices();

      for (const device of devices) {
        try {
          // 采集设备使用量
          const usageData = await this.collectDeviceUsage(device.id);

          // 保存使用记录
          await this.saveUsageRecord(usageData);
        } catch (error) {
          this.logger.error(`Failed to collect usage for device ${device.id}:`, error);
        }
      }

      this.logger.log(`Collected usage data for ${devices.length} devices`);
    } catch (error) {
      this.logger.error('Failed to collect usage data:', error);
    }
  }

  /**
   * 获取运行中的设备列表
   */
  private async getRunningDevices(): Promise<any[]> {
    try {
      const deviceServiceUrl = this.configService.get('DEVICE_SERVICE_URL', 'http://localhost:30002');

      const response = await this.httpClient.get<{ data: any[] }>(
        `${deviceServiceUrl}/devices?status=running`,
        {},
        {
          timeout: 10000,
          retries: 2,
          circuitBreaker: true,
        },
      );

      return response.data || [];
    } catch (error) {
      this.logger.error('Failed to get running devices:', error);
      return [];
    }
  }

  /**
   * 采集单个设备的使用量
   */
  async collectDeviceUsage(deviceId: string): Promise<DeviceUsageData> {
    try {
      const deviceServiceUrl = this.configService.get('DEVICE_SERVICE_URL', 'http://localhost:30002');

      // 获取设备详情
      const deviceResponse = await this.httpClient.get<{ data: any }>(
        `${deviceServiceUrl}/devices/${deviceId}`,
        {},
        {
          timeout: 8000,
          retries: 2,
          circuitBreaker: true,
        },
      );
      const device = deviceResponse.data;

      // 获取设备统计数据
      const statsResponse = await this.httpClient.get<{ data: any }>(
        `${deviceServiceUrl}/devices/${deviceId}/stats`,
        {},
        {
          timeout: 8000,
          retries: 2,
          circuitBreaker: true,
        },
      );
      const stats = statsResponse.data;

      // 计算使用时长（从最后活跃时间到现在）
      const duration = this.calculateDuration(device.lastActiveAt);

      return {
        deviceId: device.id,
        userId: device.userId,
        tenantId: device.tenantId,
        cpuUsage: stats.cpuUsage || 0,
        memoryUsage: stats.memoryUsage || 0,
        storageUsage: stats.storageUsage || 0,
        networkTraffic: stats.networkTraffic || 0,
        duration,
      };
    } catch (error) {
      this.logger.error(`Failed to collect usage for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * 保存使用记录
   */
  async saveUsageRecord(usageData: DeviceUsageData): Promise<UsageRecord> {
    const record = this.usageRecordRepository.create({
      deviceId: usageData.deviceId,
      userId: usageData.userId,
      tenantId: usageData.tenantId,
      usageType: 'device_usage' as any,
      quantity: usageData.memoryUsage / 1024, // 内存使用量(GB)
      unit: 'GB',
      cost: 0, // 成本计算可以后续添加
      startTime: new Date(Date.now() - usageData.duration * 1000),
      endTime: new Date(),
      durationSeconds: usageData.duration,
      isBilled: false,
      metadata: {
        cpuUsage: usageData.cpuUsage,
        memoryUsage: usageData.memoryUsage,
        storageUsage: usageData.storageUsage,
        networkTraffic: usageData.networkTraffic,
      },
    });

    return await this.usageRecordRepository.save(record);
  }

  /**
   * 获取用户使用统计
   */
  async getUserUsageStats(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const whereClause: any = { userId };

    if (startDate && endDate) {
      whereClause.startTime = Between(startDate, endDate);
    } else if (startDate) {
      whereClause.startTime = MoreThan(startDate);
    }

    const records = await this.usageRecordRepository.find({
      where: whereClause,
      order: { startTime: 'DESC' },
    });

    // 计算总计（使用实际字段）
    const totalCpuHours = records.reduce((sum, r) => sum + (r.durationSeconds / 3600), 0);
    const totalMemoryGB = records.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
    const totalStorageGB = 0; // UsageRecord 没有此字段
    const totalNetworkGB = 0; // UsageRecord 没有此字段
    const totalDuration = records.reduce((sum, r) => sum + r.durationSeconds, 0);

    return {
      records,
      summary: {
        totalRecords: records.length,
        totalCpuHours: totalCpuHours.toFixed(2),
        totalMemoryGB: totalMemoryGB.toFixed(2),
        totalStorageGB: totalStorageGB.toFixed(2),
        totalNetworkGB: totalNetworkGB.toFixed(2),
        totalDurationHours: (totalDuration / 3600).toFixed(2),
      },
    };
  }

  /**
   * 获取设备使用统计
   */
  async getDeviceUsageStats(deviceId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const whereClause: any = { deviceId };

    if (startDate && endDate) {
      whereClause.startTime = Between(startDate, endDate);
    } else if (startDate) {
      whereClause.startTime = MoreThan(startDate);
    }

    const records = await this.usageRecordRepository.find({
      where: whereClause,
      order: { startTime: 'DESC' },
    });

    // 计算平均值
    const avgCpuUsage = records.length > 0
      ? records.reduce((sum, r) => sum + (r.durationSeconds / 3600), 0) / records.length
      : 0;

    const avgMemoryUsage = records.length > 0
      ? records.reduce((sum, r) => sum + Number(r.quantity || 0), 0) / records.length
      : 0;

    return {
      records,
      summary: {
        totalRecords: records.length,
        avgCpuUsage: avgCpuUsage.toFixed(2),
        avgMemoryUsage: avgMemoryUsage.toFixed(2),
      },
    };
  }

  /**
   * 获取租户使用统计
   */
  async getTenantUsageStats(tenantId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const whereClause: any = { tenantId };

    if (startDate && endDate) {
      whereClause.startTime = Between(startDate, endDate);
    } else if (startDate) {
      whereClause.startTime = MoreThan(startDate);
    }

    const records = await this.usageRecordRepository.find({
      where: whereClause,
      order: { startTime: 'DESC' },
    });

    // 按用户分组统计
    const userStats = new Map<string, number>();
    records.forEach(record => {
      const current = userStats.get(record.userId) || 0;
      userStats.set(record.userId, current + record.durationSeconds);
    });

    // 按设备分组统计
    const deviceStats = new Map<string, number>();
    records.forEach(record => {
      const current = deviceStats.get(record.deviceId) || 0;
      deviceStats.set(record.deviceId, current + record.durationSeconds);
    });

    return {
      totalRecords: records.length,
      totalUsers: userStats.size,
      totalDevices: deviceStats.size,
      userStats: Array.from(userStats.entries()).map(([userId, duration]) => ({
        userId,
        durationHours: (duration / 3600).toFixed(2),
      })),
      deviceStats: Array.from(deviceStats.entries()).map(([deviceId, duration]) => ({
        deviceId,
        durationHours: (duration / 3600).toFixed(2),
      })),
    };
  }

  /**
   * 计算使用时长（秒）
   */
  private calculateDuration(lastActiveAt: string | Date): number {
    if (!lastActiveAt) {
      return 0;
    }

    const lastActive = new Date(lastActiveAt);
    const now = new Date();
    const diff = now.getTime() - lastActive.getTime();

    // 返回秒数
    return Math.floor(diff / 1000);
  }

  /**
   * 清理过期的使用记录（保留最近 90 天）
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldRecords() {
    this.logger.log('Cleaning up old usage records...');

    try {
      const retentionDays = this.configService.get('USAGE_RECORD_RETENTION_DAYS', 90);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.usageRecordRepository
        .createQueryBuilder()
        .delete()
        .where('recordedAt < :cutoffDate', { cutoffDate })
        .execute();

      this.logger.log(`Cleaned up ${result.affected} old usage records`);
    } catch (error) {
      this.logger.error('Failed to cleanup old records:', error);
    }
  }

  /**
   * 开始使用追踪（响应设备启动事件）
   */
  async startUsageTracking(data: {
    deviceId: string;
    userId: string;
    tenantId?: string;
  }): Promise<any> {
    const record = this.usageRecordRepository.create({
      userId: data.userId,
      tenantId: data.tenantId,
      deviceId: data.deviceId,
      usageType: 'device_usage' as any,
      startTime: new Date(),
      isBilled: false,
    });

    return await this.usageRecordRepository.save(record);
  }

  /**
   * 停止使用追踪（响应设备停止事件）
   */
  async stopUsageTracking(
    deviceId: string,
    duration: number,
  ): Promise<void> {
    // 查找未结束的使用记录
    const record = await this.usageRecordRepository.findOne({
      where: {
        deviceId,
        endTime: null as any,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!record) {
      this.logger.warn(`No active usage record found for device ${deviceId}`);
      return;
    }

    // 更新使用记录
    record.endTime = new Date();
    record.durationSeconds = duration;
    
    // 简单计费：按小时计费，每小时 1 元
    const hours = Math.ceil(duration / 3600);
    record.quantity = hours;
    record.cost = hours * 1.0;
    record.unit = 'hour';

    await this.usageRecordRepository.save(record);
    
    this.logger.log(
      `Usage tracking stopped for device ${deviceId}. Duration: ${duration}s, Cost: ${record.cost}`,
    );
  }
}
