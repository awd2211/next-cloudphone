/**
 * 事件 Schema 统一导出
 */

export * from './base.event';

// 应用事件（用于 devices.consumer）
export * from './app.events';

// 通知服务事件（仅在 notification-service 中直接导入）
// export * from './notification.events';

// 旧的事件定义（待整合）
// export * from './device.events';
// export * from './order.events';
// export * from './user.events';
