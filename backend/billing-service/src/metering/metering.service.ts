import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
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
    private httpService: HttpService,
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

      const response = await firstValueFrom(
        this.httpService.get(`${deviceServiceUrl}/devices?status=running`)
      );

      return response.data.data || [];
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
      const deviceResponse = await firstValueFrom(
        this.httpService.get(`${deviceServiceUrl}/devices/${deviceId}`)
      );
      const device = deviceResponse.data.data;

      // 获取设备统计数据
      const statsResponse = await firstValueFrom(
        this.httpService.get(`${deviceServiceUrl}/devices/${deviceId}/stats`)
      );
      const stats = statsResponse.data.data;

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
      cpuHours: (usageData.cpuUsage * usageData.duration) / 3600, // CPU 小时数
      memoryGB: usageData.memoryUsage / 1024, // 转换为 GB
      storageGB: usageData.storageUsage / 1024,
      networkGB: usageData.networkTraffic / 1024,
      duration: usageData.duration,
      recordedAt: new Date(),
    });

    return await this.usageRecordRepository.save(record);
  }

  /**
   * 获取用户使用统计
   */
  async getUserUsageStats(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const whereClause: any = { userId };

    if (startDate && endDate) {
      whereClause.recordedAt = Between(startDate, endDate);
    } else if (startDate) {
      whereClause.recordedAt = MoreThan(startDate);
    }

    const records = await this.usageRecordRepository.find({
      where: whereClause,
      order: { recordedAt: 'DESC' },
    });

    // 计算总计
    const totalCpuHours = records.reduce((sum, r) => sum + (r.cpuHours || 0), 0);
    const totalMemoryGB = records.reduce((sum, r) => sum + (r.memoryGB || 0), 0);
    const totalStorageGB = records.reduce((sum, r) => sum + (r.storageGB || 0), 0);
    const totalNetworkGB = records.reduce((sum, r) => sum + (r.networkGB || 0), 0);
    const totalDuration = records.reduce((sum, r) => sum + (r.duration || 0), 0);

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
      whereClause.recordedAt = Between(startDate, endDate);
    } else if (startDate) {
      whereClause.recordedAt = MoreThan(startDate);
    }

    const records = await this.usageRecordRepository.find({
      where: whereClause,
      order: { recordedAt: 'DESC' },
    });

    // 计算平均值
    const avgCpuUsage = records.length > 0
      ? records.reduce((sum, r) => sum + (r.cpuHours || 0), 0) / records.length
      : 0;

    const avgMemoryUsage = records.length > 0
      ? records.reduce((sum, r) => sum + (r.memoryGB || 0), 0) / records.length
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
      whereClause.recordedAt = Between(startDate, endDate);
    } else if (startDate) {
      whereClause.recordedAt = MoreThan(startDate);
    }

    const records = await this.usageRecordRepository.find({
      where: whereClause,
      order: { recordedAt: 'DESC' },
    });

    // 按用户分组统计
    const userStats = new Map<string, number>();
    records.forEach(record => {
      const current = userStats.get(record.userId) || 0;
      userStats.set(record.userId, current + (record.duration || 0));
    });

    // 按设备分组统计
    const deviceStats = new Map<string, number>();
    records.forEach(record => {
      const current = deviceStats.get(record.deviceId) || 0;
      deviceStats.set(record.deviceId, current + (record.duration || 0));
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
}
