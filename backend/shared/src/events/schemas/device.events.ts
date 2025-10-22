/**
 * 设备相关事件定义
 */

export class DeviceCreatedEvent {
  deviceId: string;
  userId: string;
  tenantId?: string;
  timestamp: Date;
}

export class DeviceStartedEvent {
  type: 'device.started';
  deviceId: string;
  userId: string;
  tenantId?: string;
  startedAt: Date;
  timestamp: string;
}

export class DeviceStoppedEvent {
  type: 'device.stopped';
  deviceId: string;
  userId: string;
  stoppedAt: Date;
  duration: number; // 运行时长（秒）
  timestamp: string;
}

export class DeviceDeletedEvent {
  deviceId: string;
  userId: string;
  deletedAt: Date;
  timestamp: string;
}

export class DeviceAllocateRequestedEvent {
  sagaId: string;
  orderId: string;
  userId: string;
  planId: string;
  timestamp: string;
}

export class DeviceAllocatedEvent {
  sagaId: string;
  deviceId: string;
  orderId: string;
  userId: string;
  success: boolean;
  timestamp: string;
}

export class DeviceReleaseEvent {
  deviceId: string;
  userId: string;
  reason?: string;
  timestamp: string;
}

// 备份相关事件
export class DeviceBackupCreatedEvent {
  deviceId: string;
  deviceName: string;
  userId: string;
  snapshotId: string;
  snapshotName: string;
  timestamp: Date;
}

export class DeviceBackupCompletedEvent {
  timestamp: Date;
  totalDevices: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    success: boolean;
    deviceId: string;
    snapshotId?: string;
    error?: string;
  }>;
}

export class DeviceBackupCleanupCompletedEvent {
  timestamp: Date;
  cleanedCount: number;
}

// 到期提醒事件
export class DeviceExpirationWarningEvent {
  deviceId: string;
  deviceName: string;
  userId: string;
  expiresAt: Date;
  daysRemaining: number;
  timestamp: Date;
}

export class DeviceExpiredEvent {
  deviceId: string;
  timestamp: Date;
}

export class SnapshotExpirationWarningEvent {
  snapshotId: string;
  snapshotName: string;
  deviceId: string;
  expiresAt: Date;
  daysRemaining: number;
  timestamp: Date;
}

export class SnapshotExpiredEvent {
  snapshotId: string;
  timestamp: Date;
}

