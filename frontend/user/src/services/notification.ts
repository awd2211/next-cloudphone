import request from '@/utils/request';
import { io, Socket } from 'socket.io-client';

// 通知类型
export enum NotificationType {
  SYSTEM = 'system', // 系统通知
  TICKET_REPLY = 'ticket_reply', // 工单回复
  TICKET_RESOLVED = 'ticket_resolved', // 工单已解决
  BALANCE_LOW = 'balance_low', // 余额不足
  BALANCE_RECHARGED = 'balance_recharged', // 充值成功
  ORDER_COMPLETED = 'order_completed', // 订单完成
  ORDER_FAILED = 'order_failed', // 订单失败
  DEVICE_READY = 'device_ready', // 设备就绪
  DEVICE_ERROR = 'device_error', // 设备异常
  APP_INSTALLED = 'app_installed', // 应用安装完成
  PROMOTION = 'promotion', // 促销活动
  MAINTENANCE = 'maintenance', // 维护通知
  SECURITY = 'security', // 安全提醒
}

// 通知状态
export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
}

// 通知优先级
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// 通知接口
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  status: NotificationStatus;
  priority: NotificationPriority;
  userId: string;
  relatedId?: string; // 关联的资源 ID（如工单 ID、订单 ID）
  relatedType?: string; // 关联的资源类型
  actionUrl?: string; // 跳转链接
  actionText?: string; // 操作按钮文本
  metadata?: Record<string, any>; // 额外数据
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

// 消息列表查询参数
export interface NotificationListQuery {
  page?: number;
  pageSize?: number;
  status?: NotificationStatus;
  type?: NotificationType;
  priority?: NotificationPriority;
  startDate?: string;
  endDate?: string;
}

// 消息列表响应
export interface NotificationListResponse {
  items: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}

// 通知设置接口
export interface NotificationSettings {
  userId: string;
  emailEnabled: boolean; // 启用邮件通知
  smsEnabled: boolean; // 启用短信通知
  pushEnabled: boolean; // 启用推送通知
  soundEnabled: boolean; // 启用声音

  // 通知类型开关
  systemNotifications: boolean; // 系统通知
  ticketNotifications: boolean; // 工单通知
  orderNotifications: boolean; // 订单通知
  deviceNotifications: boolean; // 设备通知
  billingNotifications: boolean; // 账单通知
  promotionNotifications: boolean; // 促销通知

  // 免打扰设置
  quietHoursEnabled: boolean; // 启用免打扰
  quietHoursStart?: string; // 免打扰开始时间（HH:mm）
  quietHoursEnd?: string; // 免打扰结束时间（HH:mm）
}

// 通知统计
export interface NotificationStats {
  total: number;
  unread: number;
  today: number;
  thisWeek: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

/**
 * 获取消息列表
 */
export const getNotifications = (
  params?: NotificationListQuery
): Promise<NotificationListResponse> => {
  return request({
    url: '/notifications',
    method: 'GET',
    params,
  });
};

/**
 * 获取消息详情
 */
export const getNotificationDetail = (id: string): Promise<Notification> => {
  return request({
    url: `/notifications/${id}`,
    method: 'GET',
  });
};

/**
 * 获取未读消息数量
 */
export const getUnreadCount = (): Promise<{ count: number }> => {
  return request({
    url: '/notifications/unread-count',
    method: 'GET',
  });
};

/**
 * 标记消息为已读
 */
export const markAsRead = (ids: string[]): Promise<void> => {
  return request({
    url: '/notifications/mark-read',
    method: 'POST',
    data: { ids },
  });
};

/**
 * 标记所有消息为已读
 */
export const markAllAsRead = (): Promise<void> => {
  return request({
    url: '/notifications/mark-all-read',
    method: 'POST',
  });
};

/**
 * 删除消息
 */
export const deleteNotifications = (ids: string[]): Promise<void> => {
  return request({
    url: '/notifications/delete',
    method: 'POST',
    data: { ids },
  });
};

/**
 * 清空所有已读消息
 */
export const clearReadNotifications = (): Promise<void> => {
  return request({
    url: '/notifications/clear-read',
    method: 'POST',
  });
};

/**
 * 获取通知设置
 */
export const getNotificationSettings = (): Promise<NotificationSettings> => {
  return request({
    url: '/notifications/settings',
    method: 'GET',
  });
};

/**
 * 更新通知设置
 */
export const updateNotificationSettings = (
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> => {
  return request({
    url: '/notifications/settings',
    method: 'PUT',
    data: settings,
  });
};

/**
 * 获取通知统计
 */
export const getNotificationStats = (): Promise<NotificationStats> => {
  return request({
    url: '/notifications/stats',
    method: 'GET',
  });
};

// WebSocket 通知服务
class NotificationWebSocket {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  /**
   * 连接 WebSocket
   */
  connect(userId: string) {
    if (this.socket?.connected) {
      return;
    }

    this.userId = userId;
    const wsUrl = import.meta.env.VITE_NOTIFICATION_WS_URL || 'http://localhost:30006';

    this.socket = io(wsUrl, {
      query: { userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket 连接成功');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket 断开连接');
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket 错误:', error);
    });

    // 接收新通知
    this.socket.on('notification', (notification: Notification) => {
      this.emit('notification', notification);
    });

    // 接收未读数更新
    this.socket.on('unread-count', (data: { count: number }) => {
      this.emit('unread-count', data);
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
      this.eventHandlers.clear();
    }
  }

  /**
   * 监听事件
   */
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * 移除事件监听
   */
  off(event: string, handler?: Function) {
    if (!handler) {
      this.eventHandlers.delete(event);
    } else {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// 导出单例
export const notificationWS = new NotificationWebSocket();
