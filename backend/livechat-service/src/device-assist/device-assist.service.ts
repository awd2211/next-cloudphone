import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsulService, HttpClientService } from '@cloudphone/shared';

export interface DeviceInfo {
  id: string;
  name: string;
  status: string;
  androidVersion: string;
  lastActiveAt: Date;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
}

@Injectable()
export class DeviceAssistService {
  private readonly logger = new Logger(DeviceAssistService.name);
  private readonly fallbackUrl: string;

  constructor(
    private configService: ConfigService,
    private consulService: ConsulService,
    private httpClient: HttpClientService,
  ) {
    // 降级 URL（当 Consul 不可用时使用）
    this.fallbackUrl = configService.get('DEVICE_SERVICE_URL', 'http://localhost:30002');
  }

  /**
   * 获取设备服务地址（优先使用 Consul 服务发现）
   */
  private async getDeviceServiceUrl(): Promise<string> {
    try {
      return await this.consulService.getService('device-service');
    } catch (error) {
      this.logger.warn(`Consul service discovery failed, using fallback URL: ${this.fallbackUrl}`);
      return this.fallbackUrl;
    }
  }

  async getDeviceInfo(deviceId: string, authToken: string): Promise<DeviceInfo | null> {
    try {
      const baseUrl = await this.getDeviceServiceUrl();
      const response = await this.httpClient.getWithCircuitBreaker<any>(
        'device-service',
        `${baseUrl}/devices/${deviceId}`,
        { headers: { Authorization: `Bearer ${authToken}` } },
        { fallbackValue: null },
      );

      if (!response) return null;

      return {
        id: response.id,
        name: response.name,
        status: response.status,
        androidVersion: response.androidVersion,
        lastActiveAt: response.lastActiveAt,
        cpuUsage: response.metrics?.cpuUsage,
        memoryUsage: response.metrics?.memoryUsage,
        diskUsage: response.metrics?.diskUsage,
      };
    } catch (error) {
      this.logger.error(`Failed to get device info: ${error.message}`);
      return null;
    }
  }

  async getDeviceScreenshot(deviceId: string, authToken: string): Promise<{ url: string } | null> {
    try {
      const baseUrl = await this.getDeviceServiceUrl();
      const response = await this.httpClient.postWithCircuitBreaker<any>(
        'device-service',
        `${baseUrl}/devices/${deviceId}/screenshot`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } },
        { fallbackValue: null },
      );

      if (!response) return null;

      return { url: response.url };
    } catch (error) {
      this.logger.error(`Failed to get device screenshot: ${error.message}`);
      return null;
    }
  }

  async getUserDevices(userId: string, authToken: string): Promise<DeviceInfo[]> {
    try {
      const baseUrl = await this.getDeviceServiceUrl();
      const response = await this.httpClient.getWithCircuitBreaker<any>(
        'device-service',
        `${baseUrl}/devices`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          params: { userId },
        },
        { fallbackValue: { items: [] } },
      );

      return (
        response?.items?.map((d: any) => ({
          id: d.id,
          name: d.name,
          status: d.status,
          androidVersion: d.androidVersion,
          lastActiveAt: d.lastActiveAt,
        })) || []
      );
    } catch (error) {
      this.logger.error(`Failed to get user devices: ${error.message}`);
      return [];
    }
  }

  async restartDevice(deviceId: string, authToken: string): Promise<boolean> {
    try {
      const baseUrl = await this.getDeviceServiceUrl();
      await this.httpClient.postWithCircuitBreaker(
        'device-service',
        `${baseUrl}/devices/${deviceId}/restart`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } },
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to restart device: ${error.message}`);
      return false;
    }
  }

  async getDeviceLogs(deviceId: string, lines: number, authToken: string): Promise<string[]> {
    try {
      const baseUrl = await this.getDeviceServiceUrl();
      const response = await this.httpClient.getWithCircuitBreaker<any>(
        'device-service',
        `${baseUrl}/devices/${deviceId}/logs`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          params: { lines },
        },
        { fallbackValue: { logs: [] } },
      );

      return response?.logs || [];
    } catch (error) {
      this.logger.error(`Failed to get device logs: ${error.message}`);
      return [];
    }
  }

  generateTroubleshootingGuide(deviceInfo: DeviceInfo): string[] {
    const suggestions: string[] = [];

    if (deviceInfo.status === 'error' || deviceInfo.status === 'stopped') {
      suggestions.push('建议尝试重启设备');
    }

    if (deviceInfo.cpuUsage && deviceInfo.cpuUsage > 90) {
      suggestions.push('CPU 使用率过高，可能需要关闭一些应用');
    }

    if (deviceInfo.memoryUsage && deviceInfo.memoryUsage > 90) {
      suggestions.push('内存使用率过高，建议清理内存');
    }

    if (deviceInfo.diskUsage && deviceInfo.diskUsage > 90) {
      suggestions.push('存储空间不足，请清理不需要的文件');
    }

    return suggestions;
  }
}
