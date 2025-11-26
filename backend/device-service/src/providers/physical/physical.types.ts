/**
 * 物理设备相关类型定义
 */

/**
 * 物理设备信息
 */
export interface PhysicalDeviceInfo {
  /** 设备唯一标识（MAC 地址或序列号） */
  id: string;

  /** 设备名称 */
  name?: string;

  /** IP 地址 */
  ipAddress: string;

  /** ADB 端口（默认 5555） */
  adbPort: number;

  /** 设备分组（机架位置等） */
  deviceGroup?: string;

  /** 设备标签 */
  tags?: string[];

  /** 设备属性 */
  properties?: {
    manufacturer?: string;
    model?: string;
    androidVersion?: string;
    serialNumber?: string;
  };

  /** 发现方式 */
  discoveryMethod: 'manual' | 'network_scan' | 'mdns';

  /** 发现时间 */
  discoveredAt: Date;

  /** 最后一次心跳 */
  lastHeartbeatAt?: Date;
}

/**
 * 设备池状态
 */
export enum DevicePoolStatus {
  /** 可用（空闲） */
  AVAILABLE = 'available',

  /** 已分配（使用中） */
  ALLOCATED = 'allocated',

  /** 离线 */
  OFFLINE = 'offline',

  /** 维护中 */
  MAINTENANCE = 'maintenance',

  /** 错误 */
  ERROR = 'error',
}

/**
 * 设备池设备
 */
export interface PooledDevice extends PhysicalDeviceInfo {
  /** 池状态 */
  poolStatus: DevicePoolStatus;

  /** 健康评分 (0-100) */
  healthScore: number;

  /** 分配给的用户 ID */
  allocatedToUserId?: string;

  /** 分配时间 */
  allocatedAt?: Date;

  /** 最后活跃时间 */
  lastActiveAt?: Date;

  /** 错误信息 */
  errorMessage?: string;
}

/**
 * 网络扫描配置
 */
export interface NetworkScanConfig {
  /** 网络 CIDR（如 "192.168.1.0/24"） */
  networkCidr: string;

  /** 端口范围 */
  portRange?: {
    start: number;
    end: number;
  };

  /** 并发数（默认 50） */
  concurrency?: number;

  /** 超时时间（毫秒，默认 3000） */
  timeoutMs?: number;
}

/**
 * 设备分配请求
 */
export interface DeviceAllocationRequest {
  /** 用户 ID */
  userId: string;

  /** 设备要求 */
  requirements?: {
    /** 最低健康评分 */
    minHealthScore?: number;

    /** 设备分组 */
    deviceGroup?: string;

    /** 设备标签 */
    tags?: string[];

    /** Android 版本 */
    androidVersion?: string;
  };

  /** 优先选择（用户亲和性） */
  preferredDeviceId?: string;

  /** 首选区域（Phase 2B 分片支持） */
  preferredRegion?: string;
}

/**
 * 扫描统计信息
 */
export interface ScanStatistics {
  /** 总 IP 数 */
  totalIps: number;
  /** 已扫描 IP 数 */
  scannedIps: number;
  /** 存活主机数 */
  hostsAlive?: number;
  /** ADB 端口开放数 */
  portsOpen: number;
  /** ADB 连接成功数 */
  adbConnected: number;
  /** 发现设备数 */
  devicesFound: number;
  /** 错误数 */
  errors: number;
  /** 开始时间（毫秒时间戳） */
  startTime: number;
  /** 最后错误 IP */
  lastErrorIp?: string;
  /** 最后错误信息 */
  lastErrorMessage?: string;
}

/**
 * 扫描阶段
 */
export type ScanPhase = 'alive_check' | 'adb_check';

/**
 * 扫描进度信息
 */
export interface ScanProgress {
  /** 已扫描 IP 数量 */
  scannedIps: number;

  /** 总 IP 数量 */
  totalIps: number;

  /** 已发现设备数量 */
  foundDevices: number;

  /** 当前正在扫描的 IP（或 IP 范围） */
  currentIp?: string;

  /** 扫描状态 */
  status: 'scanning' | 'completed' | 'error';

  /** 扫描阶段 */
  phase?: ScanPhase;

  /** 存活主机数（阶段2使用） */
  aliveHosts?: number;

  /** 已检查主机数（阶段2使用） */
  checkedHosts?: number;

  /** 新发现的设备（用于实时推送） */
  newDevice?: PhysicalDeviceInfo;

  /** 详细统计信息 */
  statistics?: ScanStatistics;

  /** 错误信息 */
  error?: string;
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  /** 设备 ID */
  deviceId: string;

  /** 是否健康 */
  healthy: boolean;

  /** 健康评分 (0-100) */
  healthScore: number;

  /** 检查项结果 */
  checks: {
    adbConnected: boolean;
    androidBooted: boolean;
    storageAvailable: boolean;
    batteryLevel?: number;
    temperature?: number;
  };

  /** 检查时间 */
  checkedAt: Date;

  /** 错误信息 */
  errorMessage?: string;
}
