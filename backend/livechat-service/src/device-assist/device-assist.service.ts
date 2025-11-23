import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

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
  private readonly deviceServiceUrl: string;

  constructor(private configService: ConfigService) {
    this.deviceServiceUrl = configService.get('DEVICE_SERVICE_URL', 'http://localhost:30002');
  }

  async getDeviceInfo(deviceId: string, authToken: string): Promise<DeviceInfo | null> {
    try {
      const response = await axios.get(`${this.deviceServiceUrl}/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      return {
        id: response.data.id,
        name: response.data.name,
        status: response.data.status,
        androidVersion: response.data.androidVersion,
        lastActiveAt: response.data.lastActiveAt,
        cpuUsage: response.data.metrics?.cpuUsage,
        memoryUsage: response.data.metrics?.memoryUsage,
        diskUsage: response.data.metrics?.diskUsage,
      };

    } catch (error) {
      this.logger.error(`Failed to get device info: ${error.message}`);
      return null;
    }
  }

  async getDeviceScreenshot(deviceId: string, authToken: string): Promise<{ url: string } | null> {
    try {
      const response = await axios.post(
        `${this.deviceServiceUrl}/devices/${deviceId}/screenshot`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } },
      );

      return { url: response.data.url };

    } catch (error) {
      this.logger.error(`Failed to get device screenshot: ${error.message}`);
      return null;
    }
  }

  async getUserDevices(userId: string, authToken: string): Promise<DeviceInfo[]> {
    try {
      const response = await axios.get(`${this.deviceServiceUrl}/devices`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { userId },
      });

      return response.data.items?.map((d: any) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        androidVersion: d.androidVersion,
        lastActiveAt: d.lastActiveAt,
      })) || [];

    } catch (error) {
      this.logger.error(`Failed to get user devices: ${error.message}`);
      return [];
    }
  }

  async restartDevice(deviceId: string, authToken: string): Promise<boolean> {
    try {
      await axios.post(
        `${this.deviceServiceUrl}/devices/${deviceId}/restart`,
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
      const response = await axios.get(
        `${this.deviceServiceUrl}/devices/${deviceId}/logs`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          params: { lines },
        },
      );

      return response.data.logs || [];

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
