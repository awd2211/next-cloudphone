/**
 * 事件 Schema 统一导出
 */

export * from './base.event';

// 应用事件（用于 devices.consumer）
export * from './app.events';

// 通知服务事件（直接从文件导入，避免与 app.events 冲突）
// notification-service 应该直接导入:
// import { NotificationEventTypes, ... } from '@cloudphone/shared/dist/events/schemas/notification.events';
// export * from './notification.events';

// 设备事件（用于 Device Allocation Saga）
export * from './device.events';

// 订单事件（用于 Saga）
export * from './order.events';

// 用户事件
export * from './user.events';
