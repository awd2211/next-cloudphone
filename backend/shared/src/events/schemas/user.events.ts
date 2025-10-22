/**
 * 用户相关事件定义
 */

export class UserCreatedEvent {
  type: 'user.created';
  userId: string;
  username: string;
  email: string;
  tenantId?: string;
  timestamp: string;
}

export class UserUpdatedEvent {
  type: 'user.updated';
  userId: string;
  username?: string;
  email?: string;
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
  timestamp: string;
}

export class UserStatusChangedEvent {
  type: 'user.status.changed';
  userId: string;
  oldStatus: string;
  newStatus: string;
  reason?: string;
  timestamp: string;
}

