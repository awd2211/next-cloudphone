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

// 旧的事件定义（待整合）
// export * from './device.events';
// export * from './order.events';
// export * from './user.events';
