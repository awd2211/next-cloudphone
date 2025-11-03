import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  HttpClientService,
  DeviceProviderType,
  DeviceType,
  DeviceConfigSnapshot,
} from '@cloudphone/shared';
import { UsageRecord } from '../billing/entities/usage-record.entity';
import { PricingEngineService } from '../billing/pricing-engine.service';

export interface DeviceUsageData {
  deviceId: string;
  deviceName: string; // 新增：设备名称
  userId: string;
  tenantId?: string;
  providerType: DeviceProviderType; // 新增：Provider 类型
  deviceType: DeviceType; // 新增：设备类型
  deviceConfig: DeviceConfigSnapshot; // 新增：设备配置快照
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
    private pricingEngine: PricingEngineService // 新增：计费引擎
  ) {}

  /**
   * 定时任务：每小时采集使用量数据
   * ✅ N+1 查询优化：使用批量查询接口，减少 HTTP 请求数 99%
   */
  @Cron(CronExpression.EVERY_HOUR)
  async collectUsageData() {
    this.logger.log('Starting usage data collection...');

    try {
      // ✅ 1. 获取所有运行中的设备（完整信息）
      const devices = await this.getRunningDevices();

      if (devices.length === 0) {
        this.logger.log('No running devices to collect usage data');
        return;
      }

      this.logger.log(`Found ${devices.length} running devices`);

      // ✅ 2. 批量获取设备统计（只需 1 次 HTTP 请求）
      const deviceIds = devices.map((d) => d.id);
      const statsByDeviceId = await this.getDeviceStatsBatch(deviceIds);

      this.logger.debug(`Retrieved stats for ${Object.keys(statsByDeviceId).length} devices`);

      // ✅ 3. 在内存中组装使用量数据（无网络请求）
      const usageDataList = devices.map((device) => {
        const stats = statsByDeviceId[device.id] || {};
        const duration = this.calculateDuration(device.lastActiveAt);

        return {
          deviceId: device.id,
          deviceName: device.name || `Device ${device.id.substring(0, 8)}`,
          userId: device.userId,
          tenantId: device.tenantId,
          providerType: device.providerType || DeviceProviderType.REDROID,
          deviceType: device.deviceType || DeviceType.PHONE,
          deviceConfig: this.extractDeviceConfig(device),
          cpuUsage: stats.cpuUsage || 0,
          memoryUsage: stats.memoryUsage || 0,
          storageUsage: stats.storageUsage || 0,
          networkTraffic: (stats.networkRx || 0) + (stats.networkTx || 0),
          duration,
        };
      });

      // ✅ 4. 并行保存所有使用记录
      const savePromises = usageDataList.map((usageData) =>
        this.saveUsageRecord(usageData).catch((error) => {
          this.logger.error(
            `Failed to save usage record for device ${usageData.deviceId}:`,
            error
          );
        })
      );

      await Promise.all(savePromises);

      this.logger.log(`Successfully collected usage data for ${usageDataList.length} devices`);
    } catch (error) {
      this.logger.error('Failed to collect usage data:', error);
    }
  }

  /**
   * 获取运行中的设备列表
   */
  private async getRunningDevices(): Promise<any[]> {
    try {
      const deviceServiceUrl = this.configService.get(
        'DEVICE_SERVICE_URL',
        'http://localhost:30002'
      );

      const response = await this.httpClient.get<{ data: any[] }>(
        `${deviceServiceUrl}/devices?status=running`,
        {},
        {
          timeout: 10000,
          retries: 2,
          circuitBreaker: true,
        }
      );

      return response.data || [];
    } catch (error) {
      this.logger.error('Failed to get running devices:', error);
      return [];
    }
  }

  /**
   * 批量获取设备统计信息
   * ✅ N+1 查询优化：使用批量接口，减少 HTTP 请求数 99%
   *
   * @param deviceIds - 设备 ID 列表
   * @returns 设备统计信息映射
   */
  private async getDeviceStatsBatch(deviceIds: string[]): Promise<Record<string, any>> {
    if (!deviceIds || deviceIds.length === 0) {
      return {};
    }

    try {
      const deviceServiceUrl = this.configService.get(
        'DEVICE_SERVICE_URL',
        'http://localhost:30002'
      );

      // ✅ 调用批量统计接口（只需 1 次 HTTP 请求）
      const response = await this.httpClient.post<{ success: boolean; data: Record<string, any> }>(
        `${deviceServiceUrl}/devices/batch/stats`,
        { deviceIds },
        {},
        {
          timeout: 20000, // 批量请求可能较慢，增加超时时间
          retries: 2,
          circuitBreaker: true,
        }
      );

      if (response.success && response.data) {
        return response.data;
      }

      this.logger.warn('Batch stats request returned no data');
      return {};
    } catch (error) {
      this.logger.error('Failed to get device stats in batch:', error);
      return {};
    }
  }

  /**
   * 采集单个设备的使用量
   */
  async collectDeviceUsage(deviceId: string): Promise<DeviceUsageData> {
    try {
      const deviceServiceUrl = this.configService.get(
        'DEVICE_SERVICE_URL',
        'http://localhost:30002'
      );

      // 获取设备详情
      const deviceResponse = await this.httpClient.get<{ data: any }>(
        `${deviceServiceUrl}/devices/${deviceId}`,
        {},
        {
          timeout: 8000,
          retries: 2,
          circuitBreaker: true,
        }
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
        }
      );
      const stats = statsResponse.data;

      // 计算使用时长（从最后活跃时间到现在）
      const duration = this.calculateDuration(device.lastActiveAt);

      return {
        deviceId: device.id,
        deviceName: device.name || `Device ${device.id.substring(0, 8)}`,
        userId: device.userId,
        tenantId: device.tenantId,
        providerType: device.providerType || DeviceProviderType.REDROID, // 从设备信息获取
        deviceType: device.deviceType || DeviceType.PHONE,
        deviceConfig: this.extractDeviceConfig(device), // 提取设备配置快照
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
   *
   * 集成计费引擎，计算实际成本和费率
   */
  async saveUsageRecord(usageData: DeviceUsageData): Promise<UsageRecord> {
    // 使用计费引擎计算成本
    const billingCalculation = this.pricingEngine.calculateCost(
      usageData.providerType,
      usageData.deviceConfig,
      usageData.duration
    );

    this.logger.debug(
      `Billing calculation for device ${usageData.deviceId}: ` +
        `${billingCalculation.totalCost} CNY (${billingCalculation.billingRate} CNY/h)`
    );

    const record = this.usageRecordRepository.create({
      deviceId: usageData.deviceId,
      userId: usageData.userId,
      tenantId: usageData.tenantId,
      usageType: 'device_usage' as any,
      quantity: usageData.memoryUsage / 1024, // 内存使用量(GB)
      unit: 'GB',
      cost: billingCalculation.totalCost, // ✅ 使用计费引擎计算的成本
      startTime: new Date(Date.now() - usageData.duration * 1000),
      endTime: new Date(),
      durationSeconds: usageData.duration,
      isBilled: false,
      metadata: {
        cpuUsage: usageData.cpuUsage,
        memoryUsage: usageData.memoryUsage,
        storageUsage: usageData.storageUsage,
        networkTraffic: usageData.networkTraffic,
        billingBreakdown: billingCalculation.breakdown, // 成本明细
      },
      // ========== 多设备提供商字段 ==========
      providerType: usageData.providerType,
      deviceType: usageData.deviceType,
      deviceName: usageData.deviceName,
      deviceConfig: usageData.deviceConfig,
      billingRate: billingCalculation.billingRate,
      pricingTier: billingCalculation.pricingTier,
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
    const totalCpuHours = records.reduce((sum, r) => sum + r.durationSeconds / 3600, 0);
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
    const avgCpuUsage =
      records.length > 0
        ? records.reduce((sum, r) => sum + r.durationSeconds / 3600, 0) / records.length
        : 0;

    const avgMemoryUsage =
      records.length > 0
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
    records.forEach((record) => {
      const current = userStats.get(record.userId) || 0;
      userStats.set(record.userId, current + record.durationSeconds);
    });

    // 按设备分组统计
    const deviceStats = new Map<string, number>();
    records.forEach((record) => {
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
      return 3600; // 默认 1 小时
    }

    const lastActive = new Date(lastActiveAt);
    const now = new Date();
    const diff = now.getTime() - lastActive.getTime();

    // 返回秒数（确保非负值）
    return Math.max(0, Math.floor(diff / 1000));
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
  async stopUsageTracking(deviceId: string, duration: number): Promise<void> {
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

    // ✅ 使用计费引擎计算成本（如果有 deviceConfig）
    if (record.providerType && record.deviceConfig) {
      const billingCalculation = this.pricingEngine.calculateCost(
        record.providerType,
        record.deviceConfig,
        duration
      );

      record.cost = billingCalculation.totalCost;
      record.billingRate = billingCalculation.billingRate;
      record.quantity = billingCalculation.durationHours;
      record.unit = 'hour';
    } else {
      // 回退到简单计费
      const hours = Math.ceil(duration / 3600);
      record.quantity = hours;
      record.cost = hours * 1.0;
      record.unit = 'hour';
    }

    await this.usageRecordRepository.save(record);

    this.logger.log(
      `Usage tracking stopped for device ${deviceId}. Duration: ${duration}s, Cost: ${record.cost}`
    );
  }

  /**
   * 提取设备配置快照
   *
   * 从设备详情中提取配置信息，用于计费
   */
  private extractDeviceConfig(device: any): DeviceConfigSnapshot {
    return {
      cpuCores: device.cpu || device.cpuCores || 2,
      memoryMB: device.memory || device.memoryMB || 2048,
      storageGB: device.storage || device.storageGB || 64,
      gpuEnabled: device.gpu || device.gpuEnabled || false,
      model: device.model || undefined,
      androidVersion: device.androidVersion || undefined,
      resolution: device.resolution || undefined,
      dpi: device.dpi || undefined,
      cloudConfig: device.providerConfig || device.cloudConfig,
    };
  }
}
