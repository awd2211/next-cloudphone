/**
 * 通知服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { PaginationParams, PaginatedResponse } from '@/types';
import { io, Socket } from 'socket.io-client';

// Connect to root namespace (Socket.IO default)
const WEBSOCKET_URL = 'http://localhost:30006';

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'announcement';
  isRead: boolean;
  userId?: string;
  createdAt: string;
  readAt?: string;
  resourceType?: string;
  resourceId?: string;
  actionUrl?: string;
}

export interface CreateNotificationDto {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'announcement';
  userIds?: string[];
  sendToAll?: boolean;
}

// 获取通知列表
export const getNotifications = (
  params?: PaginationParams & { isRead?: boolean; type?: string; userId?: string }
): Promise<PaginatedResponse<Notification>> => {
  // 如果没有 userId,从 localStorage 获取当前用户 ID
  const userId = params?.userId || localStorage.getItem('userId') || 'test-user-id';
  return api.get<PaginatedResponse<Notification>>(`/notifications/user/${userId}`, { params });
};

// 获取未读通知数量
export const getUnreadCount = (userId?: string): Promise<{ count: number }> => {
  const uid = userId || localStorage.getItem('userId') || '';
  return api.get<{ count: number }>('/notifications/unread/count', {
    params: { userId: uid }
  });
};

// 创建通知
export const createNotification = (data: CreateNotificationDto): Promise<Notification> =>
  api.post<Notification>('/notifications', data);

// 标记为已读
export const markAsRead = (id: string): Promise<void> =>
  api.post<void>(`/notifications/${id}/read`);

// 批量标记为已读
export const markAllAsRead = (userId?: string): Promise<void> => {
  const uid = userId || localStorage.getItem('userId') || '';
  return api.post<void>('/notifications/read-all', { userId: uid });
};

// 删除通知
export const deleteNotification = (id: string): Promise<void> =>
  api.delete<void>(`/notifications/${id}`);

// 批量删除通知
export const batchDeleteNotifications = (ids: string[]): Promise<void> =>
  api.post<void>('/notifications/batch/delete', { ids });

// WebSocket 通知服务
class NotificationWebSocket {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(userId: string) {
    if (this.socket?.connected) return;

    this.socket = io(WEBSOCKET_URL, {
      query: { userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.emit('connected', true);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      this.emit('connected', false);
    });

    this.socket.on('notification', (notification: Notification) => {
      console.log('🔔 New notification:', notification);
      this.emit('notification', notification);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    callbacks?.forEach((cb) => cb(data));
  }
}

export const notificationWS = new NotificationWebSocket();
