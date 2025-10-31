import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService, ServiceTokenService } from '@cloudphone/shared';

/**
 * 设备使用计费数据
 */
export interface DeviceUsageBilling {
  deviceId: string;
  userId: string;
  tenantId?: string;
  allocationId: string;
  durationSeconds: number;
  cpuCores: number;
  memoryMB: number;
  storageMB: number;
  allocatedAt: Date;
  releasedAt: Date;
}

/**
 * BillingClient 服务
 *
 * 负责与 Billing Service 通信，上报设备使用时长用于计费
 */
@Injectable()
export class BillingClientService {
  private readonly logger = new Logger(BillingClientService.name);
  private readonly billingServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
    private readonly serviceTokenService: ServiceTokenService
  ) {
    this.billingServiceUrl =
      this.configService.get<string>('BILLING_SERVICE_URL') || 'http://localhost:30005';
  }

  /**
   * 生成服务间认证 headers
   */
  private async getServiceHeaders(): Promise<Record<string, string>> {
    const token = await this.serviceTokenService.generateToken('device-service');
    return {
      'X-Service-Token': token,
    };
  }

  /**
   * 上报设备使用时长用于计费
   *
   * @param usageData 设备使用数据
   */
  async reportDeviceUsage(usageData: DeviceUsageBilling): Promise<void> {
    try {
      this.logger.debug(
        `Reporting device usage to billing service: device=${usageData.deviceId}, user=${usageData.userId}, duration=${usageData.durationSeconds}s`
      );

      const headers = await this.getServiceHeaders();

      // 调用 billing-service 的内部 API 记录设备使用量
      await this.httpClient.post(
        `${this.billingServiceUrl}/api/internal/metering/device-usage`,
        {
          deviceId: usageData.deviceId,
          deviceName: `Device-${usageData.deviceId.substring(0, 8)}`,
          userId: usageData.userId,
          tenantId: usageData.tenantId,
          allocationId: usageData.allocationId,
          // 设备配置快照
          deviceConfig: {
            cpuCores: usageData.cpuCores,
            memoryMB: usageData.memoryMB,
            storageMB: usageData.storageMB,
          },
          // 使用时长（秒）
          duration: usageData.durationSeconds,
          // 时间范围
          startTime: usageData.allocatedAt.toISOString(),
          endTime: usageData.releasedAt.toISOString(),
        },
        { headers },
        {
          timeout: 8000,
          retries: 3,
          circuitBreaker: true,
        }
      );

      this.logger.log(
        `✅ Device usage reported to billing service: ${usageData.deviceId} (${usageData.durationSeconds}s)`
      );
    } catch (error) {
      this.logger.error(
        `Failed to report device usage to billing service: ${error.message}`,
        error.stack
      );

      // 计费上报失败不应阻止设备释放，但需要记录告警
      // 可以考虑使用消息队列进行重试或人工介入
      this.logger.warn(`⚠️ Billing data may be lost for allocation: ${usageData.allocationId}`);
    }
  }

  /**
   * 检查用户是否欠费
   *
   * @param userId 用户ID
   * @returns 是否欠费
   */
  async checkUserBalance(userId: string): Promise<{
    hasBalance: boolean;
    balance: number;
    reason?: string;
  }> {
    try {
      this.logger.debug(`Checking balance for user: ${userId}`);

      const headers = await this.getServiceHeaders();

      const response = await this.httpClient.get<{
        balance: number;
        status: string;
      }>(
        `${this.billingServiceUrl}/api/internal/balance/user/${userId}`,
        { headers },
        {
          timeout: 5000,
          retries: 2,
          circuitBreaker: true,
        }
      );

      const hasBalance = response.balance > 0 && response.status === 'active';

      return {
        hasBalance,
        balance: response.balance,
        reason: hasBalance ? undefined : 'Insufficient balance or inactive account',
      };
    } catch (error) {
      this.logger.error(`Failed to check user balance: ${error.message}`, error.stack);

      // 余额检查失败时的降级策略
      const allowOnError = this.configService.get<boolean>(
        'BILLING_ALLOW_ON_ERROR',
        true // 默认允许，避免影响用户体验
      );

      if (allowOnError) {
        this.logger.warn(
          'Billing service unavailable, allowing operation due to BILLING_ALLOW_ON_ERROR=true'
        );
        return { hasBalance: true, balance: 0 };
      }

      return {
        hasBalance: false,
        balance: 0,
        reason: 'Billing service unavailable',
      };
    }
  }

  /**
   * 批量上报设备使用数据（用于定时任务或批量释放）
   *
   * @param usageDataList 设备使用数据列表
   */
  async reportBatchDeviceUsage(usageDataList: DeviceUsageBilling[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const usageData of usageDataList) {
      try {
        await this.reportDeviceUsage(usageData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${usageData.deviceId}: ${error.message}`);
      }
    }

    this.logger.log(
      `Batch billing report completed: ${results.success} success, ${results.failed} failed`
    );

    return results;
  }
}
