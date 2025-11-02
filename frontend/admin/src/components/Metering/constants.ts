/**
 * Metering Dashboard 类型定义和常量
 */

export interface MeteringOverview {
  totalUsers: number;
  activeUsers: number;
  totalDevices: number;
  totalHours: number;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
}

export interface UserMetering {
  userId: string;
  username: string;
  deviceCount: number;
  totalHours: number;
  cpuHours: number;
  memoryMB: number;
  storageMB: number;
  cost: number;
}

export interface DeviceMetering {
  deviceId: string;
  deviceName: string;
  userId: string;
  hours: number;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  cost: number;
}

export type TrendType = 'daily' | 'weekly' | 'monthly';

/**
 * Progress 状态判断工具函数
 */
export const getProgressStatus = (usage: number): 'success' | 'normal' | 'exception' => {
  if (usage > 80) return 'exception';
  if (usage > 60) return 'normal';
  return 'success';
};
