/**
 * 设备相关事件定义
 *
 * 所有设备事件统一遵循以下规范：
 * 1. 时间戳使用 ISO 8601 字符串格式
 * 2. 包含 providerType 和 deviceType 字段
 * 3. 包含 deviceName 字段（用户友好）
 * 4. 包含 deviceConfig 快照（用于计费和审计）
 */

import { DeviceProviderType, DeviceType, DeviceConfigSnapshot } from '../../types/provider.types';

/**
 * 基础设备事件接口
 *
 * 所有设备事件都应该包含这些基础字段
 */
export interface BaseDeviceEvent {
  /** 设备 ID */
  deviceId: string;

  /** 设备名称（用户友好） */
  deviceName: string;

  /** 用户 ID */
  userId: string;

  /** 租户 ID（多租户场景） */
  tenantId?: string;

  /** 设备提供商类型 */
  providerType: DeviceProviderType;

  /** 设备类型（手机/平板） */
  deviceType: DeviceType;

  /** 事件时间戳（ISO 8601 格式） */
  timestamp: string;
}

/**
 * 设备创建事件
 *
 * 当设备成功创建后发布
 */
export class DeviceCreatedEvent implements BaseDeviceEvent {
  deviceId: string;
  deviceName: string;
  userId: string;
  tenantId?: string;
  providerType: DeviceProviderType;
  deviceType: DeviceType;

  /** 设备配置快照（用于计费） */
  deviceConfig: DeviceConfigSnapshot;

  /** 创建时间 */
  createdAt: string;

  /** 事件时间戳 */
  timestamp: string;
}

/**
 * 设备创建失败事件
 *
 * 当设备创建失败时发布
 */
export class DeviceCreationFailedEvent {
  /** 设备名称（用户指定的） */
  deviceName: string;

  userId: string;
  tenantId?: string;

  /** 设备提供商类型 */
  providerType: DeviceProviderType;

  /** 失败原因 */
  reason: string;

  /** 错误代码（可选） */
  errorCode?: string;

  /** 失败时间 */
  failedAt: string;

  /** 事件时间戳 */
  timestamp: string;
}

/**
 * 设备启动事件
 *
 * 当设备成功启动后发布
 */
export class DeviceStartedEvent implements BaseDeviceEvent {
  deviceId: string;
  deviceName: string;
  userId: string;
  tenantId?: string;
  providerType: DeviceProviderType;
  deviceType: DeviceType;

  /** 启动时间 */
  startedAt: string;

  /** 事件时间戳 */
  timestamp: string;
}

/**
 * 设备停止事件
 *
 * 当设备成功停止后发布
 * 重要：此事件用于计费结算
 */
export class DeviceStoppedEvent implements BaseDeviceEvent {
  deviceId: string;
  deviceName: string;
  userId: string;
  tenantId?: string;
  providerType: DeviceProviderType;
  deviceType: DeviceType;

  /** 停止时间 */
  stoppedAt: string;

  /** 运行时长（秒）- 用于计费 */
  duration: number;

  /** 停止原因 */
  reason?: string;

  /** 事件时间戳 */
  timestamp: string;
}

/**
 * 设备删除事件
 *
 * 当设备被删除后发布
 */
export class DeviceDeletedEvent implements BaseDeviceEvent {
  deviceId: string;
  deviceName: string;
  userId: string;
  tenantId?: string;
  providerType: DeviceProviderType;
  deviceType: DeviceType;

  /** 删除时间 */
  deletedAt: string;

  /** 删除原因 */
  reason?: string;

  /** 事件时间戳 */
  timestamp: string;
}

/**
 * 设备错误事件
 *
 * 当设备发生错误时发布
 */
export class DeviceErrorEvent implements BaseDeviceEvent {
  deviceId: string;
  deviceName: string;
  userId: string;
  tenantId?: string;
  providerType: DeviceProviderType;
  deviceType: DeviceType;

  /** 错误类型 */
  errorType: string;

  /** 错误消息 */
  errorMessage: string;

  /** 错误代码 */
  errorCode?: string;

  /** 错误发生时间 */
  occurredAt: string;

  /** 优先级（用于告警） */
  priority: 'low' | 'medium' | 'high' | 'critical';

  /** 事件时间戳 */
  timestamp: string;
}

/**
 * 设备连接丢失事件
 *
 * 当设备连接意外断开时发布
 */
export class DeviceConnectionLostEvent implements BaseDeviceEvent {
  deviceId: string;
  deviceName: string;
  userId: string;
  tenantId?: string;
  providerType: DeviceProviderType;
  deviceType: DeviceType;

  /** 最后活跃时间 */
  lastSeenAt: string;

  /** 连接丢失时间 */
  lostAt: string;

  /** 事件时间戳 */
  timestamp: string;
}

/**
 * 设备 Token 刷新事件
 *
 * 当云手机 Token 被刷新时发布（供前端更新连接）
 */
export class DeviceTokenRefreshedEvent implements BaseDeviceEvent {
  deviceId: string;
  deviceName: string;
  userId: string;
  tenantId?: string;
  providerType: DeviceProviderType;
  deviceType: DeviceType;

  /** 新的连接信息 */
  connectionInfo: {
    webrtc?: {
      streamUrl: string;
      token: string;
      expireTime: string;
      stunServers?: string[];
      turnServers?: string[];
    };
    scrcpy?: {
      sessionId: string;
      videoUrl: string;
      audioUrl: string;
      controlUrl: string;
    };
  };

  /** 事件时间戳 */
  timestamp: string;
}

/**
 * 设备状态变更事件
 *
 * 当设备状态从一个状态变更到另一个状态时发布
 */
export class DeviceStatusChangedEvent implements BaseDeviceEvent {
  deviceId: string;
  deviceName: string;
  userId: string;
  tenantId?: string;
  providerType: DeviceProviderType;
  deviceType: DeviceType;

  /** 旧状态 */
  oldStatus: string;

  /** 新状态 */
  newStatus: string;

  /** 变更来源 */
  source: 'user' | 'system' | 'sync' | 'auto';

  /** 事件时间戳 */
  timestamp: string;
}

// ============================================
// 设备分配相关事件（Saga 模式）
// ============================================

/**
 * 设备分配请求事件
 *
 * 当用户请求分配设备时发布（Saga 起始）
 */
export class DeviceAllocateRequestedEvent {
  /** Saga 事务 ID */
  sagaId: string;

  /** 订单 ID */
  orderId: string;

  /** 用户 ID */
  userId: string;

  /** 套餐 ID */
  planId: string;

  /** 设备提供商类型（可选，由调度器决定） */
  providerType?: DeviceProviderType;

  /** 事件时间戳 */
  timestamp: string;
}

/**
 * 设备分配完成事件
 *
 * 当设备分配成功或失败时发布（Saga 结束）
 */
export class DeviceAllocatedEvent {
  /** Saga 事务 ID */
  sagaId: string;

  /** 设备 ID（成功时） */
  deviceId?: string;

  /** 订单 ID */
  orderId: string;

  /** 用户 ID */
  userId: string;

  /** 是否成功 */
  success: boolean;

  /** 失败原因（失败时） */
  failureReason?: string;

  /** 设备提供商类型（成功时） */
  providerType?: DeviceProviderType;

  /** 事件时间戳 */
  timestamp: string;
}

/**
 * 设备释放事件
 *
 * 当设备被释放回资源池时发布（主要用于物理设备）
 */
export class DeviceReleaseEvent {
  /** 设备 ID */
  deviceId: string;

  /** 用户 ID */
  userId: string;

  /** 设备提供商类型 */
  providerType: DeviceProviderType;

  /** 释放原因 */
  reason?: string;

  /** 事件时间戳 */
  timestamp: string;
}

// ============================================
// 备份相关事件
// ============================================

/**
 * 设备备份创建事件
 *
 * 当设备快照创建后发布
 */
export class DeviceBackupCreatedEvent implements BaseDeviceEvent {
  deviceId: string;
  deviceName: string;
  userId: string;
  tenantId?: string;
  providerType: DeviceProviderType;
  deviceType: DeviceType;

  /** 快照 ID */
  snapshotId: string;

  /** 快照名称 */
  snapshotName: string;

  /** 快照大小（MB） */
  sizeInMB?: number;

  /** 事件时间戳 */
  timestamp: string;
}

/**
 * 批量备份完成事件
 *
 * 当批量备份任务完成时发布
 */
export class DeviceBackupCompletedEvent {
  /** 总设备数 */
  totalDevices: number;

  /** 成功数量 */
  successCount: number;

  /** 失败数量 */
  failureCount: number;

  /** 详细结果 */
  results: Array<{
    success: boolean;
    deviceId: string;
    deviceName: string;
    providerType: DeviceProviderType;
    snapshotId?: string;
    error?: string;
  }>;

  /** 事件时间戳 */
  timestamp: string;
}

/**
 * 备份清理完成事件
 *
 * 当过期备份清理完成时发布
 */
export class DeviceBackupCleanupCompletedEvent {
  /** 清理的快照数量 */
  cleanedCount: number;

  /** 释放的存储空间（MB） */
  freedSpaceMB: number;

  /** 事件时间戳 */
  timestamp: string;
}

// ============================================
// 到期提醒事件
// ============================================

/**
 * 设备到期警告事件
 *
 * 当设备即将到期时发布（如提前 3 天）
 */
export class DeviceExpirationWarningEvent implements BaseDeviceEvent {
  deviceId: string;
  deviceName: string;
  userId: string;
  tenantId?: string;
  providerType: DeviceProviderType;
  deviceType: DeviceType;

  /** 到期时间 */
  expiresAt: string;

  /** 剩余天数 */
  daysRemaining: number;

  /** 事件时间戳 */
  timestamp: string;
}

/**
 * 设备已到期事件
 *
 * 当设备到期后发布
 */
export class DeviceExpiredEvent {
  /** 设备 ID */
  deviceId: string;

  /** 设备名称 */
  deviceName: string;

  /** 用户 ID */
  userId: string;

  /** 设备提供商类型 */
  providerType: DeviceProviderType;

  /** 到期时间 */
  expiredAt: string;

  /** 事件时间戳 */
  timestamp: string;
}

/**
 * 快照到期警告事件
 *
 * 当快照即将到期时发布
 */
export class SnapshotExpirationWarningEvent {
  /** 快照 ID */
  snapshotId: string;

  /** 快照名称 */
  snapshotName: string;

  /** 关联设备 ID */
  deviceId: string;

  /** 到期时间 */
  expiresAt: string;

  /** 剩余天数 */
  daysRemaining: number;

  /** 事件时间戳 */
  timestamp: string;
}

/**
 * 快照已到期事件
 *
 * 当快照到期后发布
 */
export class SnapshotExpiredEvent {
  /** 快照 ID */
  snapshotId: string;

  /** 快照名称 */
  snapshotName: string;

  /** 到期时间 */
  expiredAt: string;

  /** 事件时间戳 */
  timestamp: string;
}
