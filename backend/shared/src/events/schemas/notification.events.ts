import { BaseEvent, EventPriority } from './base.event';

/**
 * ==================== User Service Events ====================
 */

/** 用户注册成功 */
export interface UserRegisteredEvent extends BaseEvent {
  eventType: 'user.registered';
  payload: {
    userId: string;
    username: string;
    email: string;
    phone?: string;
    registerTime: string;
  };
}

/** 用户登录失败（多次） */
export interface UserLoginFailedEvent extends BaseEvent {
  eventType: 'user.login_failed';
  payload: {
    userId?: string;
    username: string;
    ipAddress: string;
    failureCount: number;
    timestamp: string;
  };
}

/** 用户请求密码重置 */
export interface PasswordResetRequestedEvent extends BaseEvent {
  eventType: 'user.password_reset_requested';
  payload: {
    userId: string;
    email: string;
    resetToken: string;
    expiresAt: string;
  };
}

/** 密码已更改 */
export interface PasswordChangedEvent extends BaseEvent {
  eventType: 'user.password_changed';
  payload: {
    userId: string;
    username: string;
    email: string;
    changedAt: string;
  };
}

/** 双因素认证已启用 */
export interface TwoFactorEnabledEvent extends BaseEvent {
  eventType: 'user.two_factor_enabled';
  payload: {
    userId: string;
    username: string;
    email: string;
    enabledAt: string;
  };
}

/** 用户资料已更新 */
export interface ProfileUpdatedEvent extends BaseEvent {
  eventType: 'user.profile_updated';
  payload: {
    userId: string;
    username: string;
    updatedFields: string[];
    updatedAt: string;
  };
}

/**
 * ==================== Device Service Events ====================
 */

/** 设备创建成功 */
export interface DeviceCreatedEvent extends BaseEvent {
  eventType: 'device.created';
  payload: {
    deviceId: string;
    deviceName: string;
    userId: string;
    deviceType: string;
    createdAt: string;
  };
}

/** 设备创建失败 */
export interface DeviceCreationFailedEvent extends BaseEvent {
  eventType: 'device.creation_failed';
  payload: {
    deviceId?: string;
    deviceName: string;
    userId: string;
    reason: string;
    failedAt: string;
  };
}

/** 设备已启动 */
export interface DeviceStartedEvent extends BaseEvent {
  eventType: 'device.started';
  payload: {
    deviceId: string;
    deviceName: string;
    userId: string;
    startedAt: string;
  };
}

/** 设备已停止 */
export interface DeviceStoppedEvent extends BaseEvent {
  eventType: 'device.stopped';
  payload: {
    deviceId: string;
    deviceName: string;
    userId: string;
    stoppedAt: string;
    reason?: string;
  };
}

/** 设备故障 */
export interface DeviceErrorEvent extends BaseEvent {
  eventType: 'device.error';
  payload: {
    deviceId: string;
    deviceName: string;
    userId: string;
    errorType: string;
    errorMessage: string;
    occurredAt: string;
    priority: EventPriority;
  };
}

/** 设备连接丢失 */
export interface DeviceConnectionLostEvent extends BaseEvent {
  eventType: 'device.connection_lost';
  payload: {
    deviceId: string;
    deviceName: string;
    userId: string;
    lastSeenAt: string;
    lostAt: string;
  };
}

/** 设备已删除 */
export interface DeviceDeletedEvent extends BaseEvent {
  eventType: 'device.deleted';
  payload: {
    deviceId: string;
    deviceName: string;
    userId: string;
    deletedAt: string;
  };
}

/**
 * ==================== App Service Events ====================
 */

/** 应用安装请求 */
export interface AppInstallRequestedEvent extends BaseEvent {
  eventType: 'app.install_requested';
  payload: {
    appId: string;
    appName: string;
    deviceId: string;
    userId: string;
    requestedAt: string;
  };
}

/** 应用安装成功 */
export interface AppInstalledEvent extends BaseEvent {
  eventType: 'app.installed';
  payload: {
    appId: string;
    appName: string;
    deviceId: string;
    userId: string;
    installedAt: string;
    version: string;
  };
}

/** 应用安装失败 */
export interface AppInstallFailedEvent extends BaseEvent {
  eventType: 'app.install_failed';
  payload: {
    appId: string;
    appName: string;
    deviceId: string;
    userId: string;
    reason: string;
    failedAt: string;
  };
}

/** 应用已更新 */
export interface AppUpdatedEvent extends BaseEvent {
  eventType: 'app.updated';
  payload: {
    appId: string;
    appName: string;
    deviceId: string;
    userId: string;
    oldVersion: string;
    newVersion: string;
    updatedAt: string;
  };
}

/** 应用已卸载 */
export interface AppUninstalledEvent extends BaseEvent {
  eventType: 'app.uninstalled';
  payload: {
    appId: string;
    appName: string;
    deviceId: string;
    userId: string;
    uninstalledAt: string;
  };
}

/** 应用崩溃 */
export interface AppCrashedEvent extends BaseEvent {
  eventType: 'app.crashed';
  payload: {
    appId: string;
    appName: string;
    deviceId: string;
    userId: string;
    crashReason: string;
    crashedAt: string;
  };
}

/**
 * ==================== Billing Service Events ====================
 */

/** 余额不足 */
export interface LowBalanceEvent extends BaseEvent {
  eventType: 'billing.low_balance';
  payload: {
    userId: string;
    username: string;
    email: string;
    currentBalance: number;
    threshold: number;
    detectedAt: string;
  };
}

/** 充值成功 */
export interface PaymentSuccessEvent extends BaseEvent {
  eventType: 'billing.payment_success';
  payload: {
    userId: string;
    username: string;
    paymentId: string;
    amount: number;
    paymentMethod: string;
    paidAt: string;
    newBalance: number;
  };
}

/** 支付失败 */
export interface PaymentFailedEvent extends BaseEvent {
  eventType: 'billing.payment_failed';
  payload: {
    userId: string;
    username: string;
    paymentId: string;
    amount: number;
    paymentMethod: string;
    reason: string;
    failedAt: string;
  };
}

/** 账单生成 */
export interface InvoiceGeneratedEvent extends BaseEvent {
  eventType: 'billing.invoice_generated';
  payload: {
    userId: string;
    username: string;
    email: string;
    invoiceId: string;
    amount: number;
    dueDate: string;
    generatedAt: string;
  };
}

/** 账单逾期 */
export interface InvoiceOverdueEvent extends BaseEvent {
  eventType: 'billing.invoice_overdue';
  payload: {
    userId: string;
    username: string;
    email: string;
    invoiceId: string;
    amount: number;
    dueDate: string;
    overdueDays: number;
  };
}

/** 消费警告（超额） */
export interface ConsumptionWarningEvent extends BaseEvent {
  eventType: 'billing.consumption_warning';
  payload: {
    userId: string;
    username: string;
    currentConsumption: number;
    warningThreshold: number;
    period: string; // 如 'daily', 'monthly'
    detectedAt: string;
  };
}

/**
 * ==================== Scheduler Service Events ====================
 */

/** 定时任务完成 */
export interface ScheduledTaskCompletedEvent extends BaseEvent {
  eventType: 'scheduler.task_completed';
  payload: {
    taskId: string;
    taskName: string;
    taskType: string;
    result: any;
    completedAt: string;
  };
}

/** 定时任务失败 */
export interface ScheduledTaskFailedEvent extends BaseEvent {
  eventType: 'scheduler.task_failed';
  payload: {
    taskId: string;
    taskName: string;
    taskType: string;
    error: string;
    failedAt: string;
  };
}

/**
 * ==================== Media Service Events ====================
 */

/** 文件上传完成 */
export interface FileUploadedEvent extends BaseEvent {
  eventType: 'media.file_uploaded';
  payload: {
    fileId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    userId: string;
    downloadUrl: string;
    thumbnailUrl?: string;
    uploadedAt: string;
  };
}

/** 媒体处理完成 */
export interface MediaProcessedEvent extends BaseEvent {
  eventType: 'media.processed';
  payload: {
    mediaId: string;
    mediaName: string;
    mediaType: 'image' | 'video' | 'audio';
    userId: string;
    processedUrl: string;
    processedAt: string;
  };
}

/**
 * ==================== System Events ====================
 */

/** 系统维护通知 */
export interface SystemMaintenanceEvent extends BaseEvent {
  eventType: 'system.maintenance';
  payload: {
    title: string;
    message: string;
    startTime: string;
    endTime: string;
    duration: number; // 分钟
    affectedServices: string[];
  };
}

/** 系统更新通知 */
export interface SystemUpdateEvent extends BaseEvent {
  eventType: 'system.update';
  payload: {
    version: string;
    title: string;
    description: string;
    features: string[];
    releasedAt: string;
  };
}

/**
 * 所有事件类型的联合类型
 */
export type NotificationEvent =
  // User events
  | UserRegisteredEvent
  | UserLoginFailedEvent
  | PasswordResetRequestedEvent
  | PasswordChangedEvent
  | TwoFactorEnabledEvent
  | ProfileUpdatedEvent
  // Device events
  | DeviceCreatedEvent
  | DeviceCreationFailedEvent
  | DeviceStartedEvent
  | DeviceStoppedEvent
  | DeviceErrorEvent
  | DeviceConnectionLostEvent
  | DeviceDeletedEvent
  // App events
  | AppInstallRequestedEvent
  | AppInstalledEvent
  | AppInstallFailedEvent
  | AppUpdatedEvent
  | AppUninstalledEvent
  | AppCrashedEvent
  // Billing events
  | LowBalanceEvent
  | PaymentSuccessEvent
  | PaymentFailedEvent
  | InvoiceGeneratedEvent
  | InvoiceOverdueEvent
  | ConsumptionWarningEvent
  // Scheduler events
  | ScheduledTaskCompletedEvent
  | ScheduledTaskFailedEvent
  // Media events
  | FileUploadedEvent
  | MediaProcessedEvent
  // System events
  | SystemMaintenanceEvent
  | SystemUpdateEvent;

/**
 * 事件类型字符串枚举
 */
export const NotificationEventTypes = {
  // User
  USER_REGISTERED: 'user.registered',
  USER_LOGIN_FAILED: 'user.login_failed',
  PASSWORD_RESET_REQUESTED: 'user.password_reset_requested',
  PASSWORD_CHANGED: 'user.password_changed',
  TWO_FACTOR_ENABLED: 'user.two_factor_enabled',
  PROFILE_UPDATED: 'user.profile_updated',

  // Device
  DEVICE_CREATED: 'device.created',
  DEVICE_CREATION_FAILED: 'device.creation_failed',
  DEVICE_STARTED: 'device.started',
  DEVICE_STOPPED: 'device.stopped',
  DEVICE_ERROR: 'device.error',
  DEVICE_CONNECTION_LOST: 'device.connection_lost',
  DEVICE_DELETED: 'device.deleted',

  // App
  APP_INSTALL_REQUESTED: 'app.install_requested',
  APP_INSTALLED: 'app.installed',
  APP_INSTALL_FAILED: 'app.install_failed',
  APP_UPDATED: 'app.updated',
  APP_UNINSTALLED: 'app.uninstalled',
  APP_CRASHED: 'app.crashed',

  // Billing
  LOW_BALANCE: 'billing.low_balance',
  PAYMENT_SUCCESS: 'billing.payment_success',
  PAYMENT_FAILED: 'billing.payment_failed',
  INVOICE_GENERATED: 'billing.invoice_generated',
  INVOICE_OVERDUE: 'billing.invoice_overdue',
  CONSUMPTION_WARNING: 'billing.consumption_warning',

  // Scheduler
  SCHEDULED_TASK_COMPLETED: 'scheduler.task_completed',
  SCHEDULED_TASK_FAILED: 'scheduler.task_failed',

  // Media
  FILE_UPLOADED: 'media.file_uploaded',
  MEDIA_PROCESSED: 'media.processed',

  // System
  SYSTEM_MAINTENANCE: 'system.maintenance',
  SYSTEM_UPDATE: 'system.update',
} as const;
