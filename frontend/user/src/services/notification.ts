/**
 * 通知服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
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
 * 后端端点: GET /notifications/user/:userId
 */
export const getNotifications = (
  userId: string,
  params?: Omit<NotificationListQuery, 'userId'>
): Promise<NotificationListResponse> =>
  api.get<NotificationListResponse>(`/notifications/user/${userId}`, { params });

/**
 * 获取消息详情
 */
export const getNotificationDetail = (id: string): Promise<Notification> =>
  api.get<Notification>(`/notifications/${id}`);

/**
 * 获取未读消息数量
 * 后端端点: GET /notifications/unread/count
 */
export const getUnreadCount = (userId?: string): Promise<{ count: number }> =>
  api.get<{ count: number }>('/notifications/unread/count', {
    params: userId ? { userId } : undefined,
  });

/**
 * 标记单条消息为已读
 * 后端端点: PATCH /notifications/:id/read
 * 注意: 后端不支持批量标记，如需批量请循环调用或使用 markAllAsRead
 */
export const markAsRead = (ids: string[]): Promise<void> => {
  // 后端仅支持单条标记，这里按顺序标记
  return Promise.all(
    ids.map((id) => api.patch(`/notifications/${id}/read`))
  ).then(() => undefined);
};

/**
 * 标记所有消息为已读
 * 后端端点: POST /notifications/read-all
 */
export const markAllAsRead = (userId: string): Promise<void> =>
  api.post<void>('/notifications/read-all', { userId });

/**
 * 批量删除消息
 * 后端端点: POST /notifications/batch/delete
 */
export const deleteNotifications = (ids: string[]): Promise<void> =>
  api.post<void>('/notifications/batch/delete', { ids });

/**
 * 清空所有已读消息
 * 注意: 后端暂未实现此端点，预留接口
 * TODO: 需要后端添加 POST /notifications/clear-read 端点
 */
export const clearReadNotifications = (): Promise<void> => {
  console.warn('clearReadNotifications: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 获取通知偏好设置
 * 后端端点: GET /notifications/preferences
 * 注意: 后端返回的是按类型分组的偏好列表，与前端期望的扁平结构不同
 * TODO: 需要适配后端返回格式或后端添加兼容接口
 */
export const getNotificationSettings = (userId: string): Promise<NotificationSettings> =>
  api.get<NotificationSettings>('/notifications/preferences', { params: { userId } });

/**
 * 更新通知偏好设置
 * 后端端点: POST /notifications/preferences/batch
 * 注意: 后端使用按类型的偏好系统，与前端期望的扁平结构不同
 * TODO: 需要转换前端格式到后端格式或后端添加兼容接口
 */
export const updateNotificationSettings = (
  userId: string,
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> =>
  api.post<NotificationSettings>('/notifications/preferences/batch', { preferences: settings }, {
    params: { userId },
  });

/**
 * 获取通知统计
 */
export const getNotificationStats = (): Promise<NotificationStats> =>
  api.get<NotificationStats>('/notifications/stats');

// WebSocket 通知服务
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (...args: any[]) => void;

class NotificationWebSocket {
  private socket: Socket | null = null;
  // private _userId: string | null = null; // 未使用
  private eventHandlers: Map<string, EventHandler[]> = new Map();

  /**
   * 连接 WebSocket
   */
  connect(userId: string) {
    if (this.socket?.connected) {
      return;
    }

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
      this.eventHandlers.clear();
    }
  }

  /**
   * 监听事件
   */
  on(event: string, handler: EventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * 移除事件监听
   */
  off(event: string, handler?: EventHandler) {
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
