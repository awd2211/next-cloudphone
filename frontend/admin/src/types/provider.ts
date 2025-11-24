/**
 * 设备提供商类型定义
 */

import { MoneyAmount } from './index';

// 提供商类型枚举（与后端 DeviceProviderType 保持一致）
export enum DeviceProvider {
  DOCKER = 'redroid', // 本地 Redroid 容器（后端: REDROID）
  PHYSICAL = 'physical', // 物理 Android 设备（后端: PHYSICAL）
  HUAWEI = 'huawei_cph', // 华为云 CPH（后端: HUAWEI_CPH）
  ALIYUN = 'aliyun_ecp', // 阿里云 ECP（后端: ALIYUN_ECP）
}

// 提供商显示名称
export const ProviderNames: Record<DeviceProvider, string> = {
  [DeviceProvider.DOCKER]: 'Redroid (本地)',
  [DeviceProvider.PHYSICAL]: '物理设备',
  [DeviceProvider.HUAWEI]: '华为云 CPH',
  [DeviceProvider.ALIYUN]: '阿里云 ECP',
};

// 提供商颜色
export const ProviderColors: Record<DeviceProvider, string> = {
  [DeviceProvider.DOCKER]: 'blue',
  [DeviceProvider.PHYSICAL]: 'green',
  [DeviceProvider.HUAWEI]: 'orange',
  [DeviceProvider.ALIYUN]: 'purple',
};

// 提供商图标
export const ProviderIcons: Record<DeviceProvider, string> = {
  [DeviceProvider.DOCKER]: '🐳',
  [DeviceProvider.PHYSICAL]: '📱',
  [DeviceProvider.HUAWEI]: '☁️',
  [DeviceProvider.ALIYUN]: '☁️',
};

// ADB 连接信息
export interface ADBConnectionInfo {
  host: string;
  port: number;
  serialNumber?: string;
}

// Scrcpy 连接信息
export interface ScrcpyConnectionInfo {
  host: string;
  port: number;
  maxBitrate: number;
  codec: string;
}

// WebRTC 连接信息
export interface WebRTCConnectionInfo {
  sessionId: string;
  ticket?: string;
  signaling?: string;
  stunServers: string[];
  turnServers?: {
    urls: string | string[];
    username?: string;
    credential?: string;
  }[];
}

// 设备连接信息
export interface DeviceConnectionInfo {
  adb?: ADBConnectionInfo;
  scrcpy?: ScrcpyConnectionInfo;
  webrtc?: WebRTCConnectionInfo;
}

// 设备扩展属性
export interface DeviceExtended {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'stopped' | 'error' | 'creating' | 'starting' | 'stopping';
  provider: DeviceProvider;

  // 资源配置
  cpuCores: number;
  memoryMB: number;
  diskGB: number;
  androidVersion?: string;

  // 提供商相关
  providerInstanceId?: string; // 云端实例 ID
  nodeId?: string; // 节点 ID (物理设备)

  // 连接信息
  connectionInfo?: DeviceConnectionInfo;

  // 用户信息
  userId: string;

  // 时间信息
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  stoppedAt?: string;
  expireAt?: string;
}

// 创建设备 DTO
export interface CreateDeviceDto {
  name: string;
  provider: DeviceProvider;

  // Redroid 配置
  cpuCores?: number;
  memoryMB?: number;
  diskGB?: number;
  androidVersion?: string;
  imageTag?: string;

  // 华为云配置
  specId?: string; // 华为云规格 ID
  serverId?: string; // 华为云服务器 ID
  phoneModel?: string; // 华为云手机型号

  // 阿里云配置
  instanceType?: string; // 阿里云实例类型
  imageId?: string; // 阿里云镜像 ID

  // 物理设备配置
  serialNumber?: string; // 物理设备序列号
}

// 设备统计
export interface DeviceStats {
  total: number;
  running: number;
  stopped: number;
  error: number;
  idle: number;

  // 按提供商统计
  byProvider: {
    provider: DeviceProvider;
    count: number;
  }[];

  // 资源使用
  totalCPU: number;
  totalMemoryMB: number;
  totalDiskGB: number;
}

/**
 * 提供商规格
 */
export interface ProviderSpec {
  id: string;
  provider: DeviceProvider;
  name: string;
  displayName: string;
  cpuCores: number;
  memoryMB: number;
  diskGB: number;
  /** 价格（元/小时，字符串格式保证精度） */
  price: MoneyAmount;
  available: boolean;
}

// 云同步状态
export interface CloudSyncStatus {
  deviceId: string;
  provider: DeviceProvider;
  lastSyncAt: string;
  syncStatus: 'synced' | 'syncing' | 'error';
  cloudStatus?: string;
  cloudInstanceId?: string;
  error?: string;
}

// 连接令牌
export interface ConnectionToken {
  token: string;
  deviceId: string;
  expiresAt: string;
  connectionInfo: DeviceConnectionInfo;
}
