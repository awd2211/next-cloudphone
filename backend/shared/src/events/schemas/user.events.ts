/**
 * 用户相关事件定义
 *
 * 所有用户事件统一遵循以下规范：
 * 1. 包含 userRole（用于角色化通知）✨ 2025-11-03
 * 2. email 字段对应 userEmail
 */

export class UserCreatedEvent {
  type: 'user.created';
  userId: string;
  username: string;
  email: string;
  userRole: string;
  tenantId?: string;
  timestamp: string;
}

export class UserUpdatedEvent {
  type: 'user.updated';
  userId: string;
  username?: string;
  email?: string;
  userRole: string;
  fullName?: string;
  avatar?: string;
  tenantId?: string;
  status?: string;
  timestamp: string;
}

export class UserDeletedEvent {
  type: 'user.deleted';
  userId: string;
  username: string;
  userRole: string;
  userEmail?: string;
  timestamp: string;
}

export class UserStatusChangedEvent {
  type: 'user.status.changed';
  userId: string;
  userRole: string;
  userEmail?: string;
  oldStatus: string;
  newStatus: string;
  reason?: string;
  timestamp: string;
}
