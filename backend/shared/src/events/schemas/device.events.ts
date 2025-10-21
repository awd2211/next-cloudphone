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

