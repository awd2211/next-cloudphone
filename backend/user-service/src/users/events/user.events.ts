/**
 * 用户事件类型定义
 * 用于事件溯源系统
 */

import { IEvent } from '@nestjs/cqrs';

/**
 * 事件基类
 */
export abstract class UserDomainEvent implements IEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly version: number,
    public readonly occurredAt: Date = new Date()
  ) {}

  abstract getEventType(): string;
  abstract getEventData(): any;
}

/**
 * 用户创建事件
 */
export class UserCreatedEvent extends UserDomainEvent {
  constructor(
    aggregateId: string,
    version: number,
    public readonly username: string,
    public readonly email: string,
    public readonly fullName: string,
    public readonly phone?: string,
    public readonly tenantId?: string,
    public readonly roleIds?: string[]
  ) {
    super(aggregateId, version);
  }

  getEventType(): string {
    return 'UserCreated';
  }

  getEventData(): any {
    return {
      username: this.username,
      email: this.email,
      fullName: this.fullName,
      phone: this.phone,
      tenantId: this.tenantId,
      roleIds: this.roleIds,
    };
  }
}

/**
 * 用户更新事件
 */
export class UserUpdatedEvent extends UserDomainEvent {
  constructor(
    aggregateId: string,
    version: number,
    public readonly updates: {
      email?: string;
      fullName?: string;
      phone?: string;
      avatar?: string;
      status?: string;
      roleIds?: string[];
    }
  ) {
    super(aggregateId, version);
  }

  getEventType(): string {
    return 'UserUpdated';
  }

  getEventData(): any {
    return this.updates;
  }
}

/**
 * 密码修改事件
 */
export class PasswordChangedEvent extends UserDomainEvent {
  constructor(
    aggregateId: string,
    version: number,
    public readonly changedBy: string // 执行修改的用户ID
  ) {
    super(aggregateId, version);
  }

  getEventType(): string {
    return 'PasswordChanged';
  }

  getEventData(): any {
    return {
      changedBy: this.changedBy,
      // 不记录密码内容，只记录修改操作
    };
  }
}

/**
 * 用户删除事件（软删除）
 */
export class UserDeletedEvent extends UserDomainEvent {
  constructor(
    aggregateId: string,
    version: number,
    public readonly deletedBy: string
  ) {
    super(aggregateId, version);
  }

  getEventType(): string {
    return 'UserDeleted';
  }

  getEventData(): any {
    return {
      deletedBy: this.deletedBy,
    };
  }
}

/**
 * 登录信息更新事件
 */
export class LoginInfoUpdatedEvent extends UserDomainEvent {
  constructor(
    aggregateId: string,
    version: number,
    public readonly ipAddress: string,
    public readonly loginAt: Date
  ) {
    super(aggregateId, version);
  }

  getEventType(): string {
    return 'LoginInfoUpdated';
  }

  getEventData(): any {
    return {
      ipAddress: this.ipAddress,
      loginAt: this.loginAt,
    };
  }
}

/**
 * 账户锁定事件
 */
export class AccountLockedEvent extends UserDomainEvent {
  constructor(
    aggregateId: string,
    version: number,
    public readonly reason: string,
    public readonly loginAttempts: number,
    public readonly lockedUntil: Date
  ) {
    super(aggregateId, version);
  }

  getEventType(): string {
    return 'AccountLocked';
  }

  getEventData(): any {
    return {
      reason: this.reason,
      loginAttempts: this.loginAttempts,
      lockedUntil: this.lockedUntil,
    };
  }
}

/**
 * 账户解锁事件
 */
export class AccountUnlockedEvent extends UserDomainEvent {
  constructor(
    aggregateId: string,
    version: number,
    public readonly unlockedBy: string
  ) {
    super(aggregateId, version);
  }

  getEventType(): string {
    return 'AccountUnlocked';
  }

  getEventData(): any {
    return {
      unlockedBy: this.unlockedBy,
    };
  }
}

/**
 * 角色分配事件
 */
export class RolesAssignedEvent extends UserDomainEvent {
  constructor(
    aggregateId: string,
    version: number,
    public readonly roleIds: string[],
    public readonly assignedBy: string
  ) {
    super(aggregateId, version);
  }

  getEventType(): string {
    return 'RolesAssigned';
  }

  getEventData(): any {
    return {
      roleIds: this.roleIds,
      assignedBy: this.assignedBy,
    };
  }
}
