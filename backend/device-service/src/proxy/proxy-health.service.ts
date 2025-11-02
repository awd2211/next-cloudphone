import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { ProxyHealthStatus } from '../entities/proxy-usage.entity';
import { ProxyStatsService } from './proxy-stats.service';
import { ProxyClientService } from '@cloudphone/shared';
import { DeviceProviderType } from '../providers/provider.types';

/**
 * 代理健康检查服务
 * 负责定期检查分配给设备的代理健康状态
 */
@Injectable()
export class ProxyHealthService {
  private readonly logger = new Logger(ProxyHealthService.name);

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    private readonly proxyStats: ProxyStatsService,
    private readonly proxyClient: ProxyClientService,
  ) {}

  /**
   * 定时健康检查（每 5 分钟）
   * 检查所有使用代理的 Redroid 设备
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async performScheduledHealthCheck(): Promise<void> {
    this.logger.log('Starting scheduled proxy health check...');

    try {
      // 查询所有使用代理的 Redroid 云手机设备
      const devicesWithProxy = await this.deviceRepository.find({
        where: {
          providerType: DeviceProviderType.REDROID,
        },
        select: ['id', 'name', 'proxyId', 'proxyHost', 'proxyPort', 'status'],
      });

      const activeDevices = devicesWithProxy.filter((d) => d.proxyId);

      if (activeDevices.length === 0) {
        this.logger.debug('No devices with proxies found, skipping health check');
        return;
      }

      this.logger.log(
        `Found ${activeDevices.length} devices with proxies, performing health checks...`,
      );

      // 并发检查所有设备的代理健康状态
      const checkPromises = activeDevices.map((device) =>
        this.checkDeviceProxyHealth(device.id, device.proxyId!).catch(
          (error) => {
            this.logger.error(
              `Health check failed for device ${device.id}`,
              error.stack,
            );
            return null;
          },
        ),
      );

      const results = await Promise.all(checkPromises);
      const successCount = results.filter((r) => r !== null).length;

      this.logger.log(
        `Proxy health check completed: ${successCount}/${activeDevices.length} successful`,
      );
    } catch (error) {
      this.logger.error('Scheduled health check failed', error.stack);
    }
  }

  /**
   * 检查单个设备的代理健康状态
   */
  async checkDeviceProxyHealth(
    deviceId: string,
    proxyId: string,
  ): Promise<{
    healthy: boolean;
    status: ProxyHealthStatus;
    latencyMs?: number;
    error?: string;
  }> {
    this.logger.debug(
      `Checking proxy health: device=${deviceId}, proxy=${proxyId}`,
    );

    try {
      // 调用 proxy-service 健康检查 API
      const healthResult = await this.proxyClient.checkProxyHealth(proxyId);

      const healthy = healthResult.healthy;
      const latencyMs = healthResult.latencyMs;

      // 根据延迟和健康状态判断代理状态
      let status: ProxyHealthStatus;
      if (!healthy) {
        status = ProxyHealthStatus.UNHEALTHY;
      } else if (latencyMs && latencyMs > 2000) {
        status = ProxyHealthStatus.DEGRADED; // 延迟超过 2 秒视为降级
      } else {
        status = ProxyHealthStatus.HEALTHY;
      }

      // 更新统计记录
      await this.proxyStats.updateProxyHealth(
        deviceId,
        proxyId,
        status,
        healthy,
      );

      this.logger.debug(
        `Proxy health check result: proxy=${proxyId}, status=${status}, latency=${latencyMs}ms`,
      );

      return {
        healthy,
        status,
        latencyMs,
      };
    } catch (error) {
      this.logger.warn(
        `Proxy health check failed for proxy=${proxyId}`,
        error.message,
      );

      // 健康检查失败，标记为不健康
      await this.proxyStats.updateProxyHealth(
        deviceId,
        proxyId,
        ProxyHealthStatus.UNHEALTHY,
        false,
      );

      return {
        healthy: false,
        status: ProxyHealthStatus.UNHEALTHY,
        error: error.message,
      };
    }
  }

  /**
   * 手动触发健康检查（单个设备）
   */
  async triggerHealthCheck(deviceId: string): Promise<void> {
    this.logger.log(`Manual health check triggered for device ${deviceId}`);

    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      select: ['id', 'proxyId'],
    });

    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    if (!device.proxyId) {
      throw new Error(`Device ${deviceId} does not have a proxy assigned`);
    }

    await this.checkDeviceProxyHealth(device.id, device.proxyId);
    this.logger.log(
      `Manual health check completed for device ${deviceId}, proxy ${device.proxyId}`,
    );
  }

  /**
   * 批量触发健康检查（所有设备）
   */
  async triggerBatchHealthCheck(): Promise<{
    total: number;
    successful: number;
    failed: number;
  }> {
    this.logger.log('Manual batch health check triggered');

    const devicesWithProxy = await this.deviceRepository.find({
      where: {
        providerType: DeviceProviderType.REDROID,
      },
      select: ['id', 'proxyId'],
    });

    const activeDevices = devicesWithProxy.filter((d) => d.proxyId);

    if (activeDevices.length === 0) {
      return { total: 0, successful: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
      activeDevices.map((device) =>
        this.checkDeviceProxyHealth(device.id, device.proxyId!),
      ),
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(
      `Batch health check completed: ${successful}/${activeDevices.length} successful, ${failed} failed`,
    );

    return {
      total: activeDevices.length,
      successful,
      failed,
    };
  }

  /**
   * 获取不健康的代理列表
   */
  async getUnhealthyProxies(): Promise<
    Array<{
      deviceId: string;
      deviceName: string;
      proxyId: string;
      proxyHost: string;
      proxyPort: number;
      healthStatus: ProxyHealthStatus | null;
      lastHealthCheck: Date | null;
    }>
  > {
    // 查询当前代理使用记录中健康状态为 unhealthy 或 degraded 的
    const usageRecords = await this.proxyStats.getCurrentUnhealthyProxies();

    // 关联设备信息
    const deviceIds = usageRecords.map((r) => r.deviceId);
    const devices = await this.deviceRepository.findByIds(deviceIds);
    const deviceMap = new Map(devices.map((d) => [d.id, d]));

    return usageRecords.map((record) => {
      const device = deviceMap.get(record.deviceId);
      return {
        deviceId: record.deviceId,
        deviceName: device?.name || 'Unknown',
        proxyId: record.proxyId,
        proxyHost: record.proxyHost,
        proxyPort: record.proxyPort,
        healthStatus: record.healthStatus,
        lastHealthCheck: record.lastHealthCheck,
      };
    });
  }
}
