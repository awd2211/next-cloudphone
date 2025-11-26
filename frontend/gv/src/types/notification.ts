// 通知类型定义

export type NotificationType =
  | 'device_status'      // 设备状态变化
  | 'device_error'       // 设备错误
  | 'sms_received'       // 收到验证码
  | 'proxy_expired'      // 代理过期
  | 'proxy_quality'      // 代理质量警告
  | 'system'             // 系统通知
  | 'security'           // 安全警告
  | 'task_complete';     // 任务完成

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  level: NotificationLevel;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: Record<string, unknown>;
  // 关联实体
  deviceId?: string;
  proxyId?: string;
  smsId?: string;
}

// WebSocket 事件类型
export interface SocketEvents {
  // 服务端发送的事件
  'notification': (notification: Notification) => void;
  'device:status': (data: { deviceId: string; status: string; previousStatus: string }) => void;
  'device:error': (data: { deviceId: string; error: string }) => void;
  'sms:received': (data: { phone: string; sender: string; code: string }) => void;
  'proxy:expired': (data: { proxyId: string; host: string }) => void;
  'proxy:quality_warning': (data: { proxyId: string; quality: number }) => void;
  'system:announcement': (data: { message: string; level: NotificationLevel }) => void;

  // 客户端发送的事件
  'subscribe': (topics: string[]) => void;
  'unsubscribe': (topics: string[]) => void;
  'mark_read': (notificationId: string) => void;
  'mark_all_read': () => void;
}

// 通知设置
export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  // 各类型通知开关
  deviceStatus: boolean;
  smsReceived: boolean;
  proxyWarning: boolean;
  systemAnnouncement: boolean;
}

// 通知统计
export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}
