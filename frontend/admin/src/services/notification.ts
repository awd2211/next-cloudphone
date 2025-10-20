import request from '@/utils/request';
import type { PaginationParams, PaginatedResponse } from '@/types';

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'announcement';
  isRead: boolean;
  userId?: string;
  createdAt: string;
  readAt?: string;
}

export interface CreateNotificationDto {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'announcement';
  userIds?: string[];
  sendToAll?: boolean;
}

// 获取通知列表
export const getNotifications = (params?: PaginationParams & { isRead?: boolean; type?: string }) => {
  return request.get<PaginatedResponse<Notification>>('/notifications', { params });
};

// 获取未读通知数量
export const getUnreadCount = () => {
  return request.get<{ count: number }>('/notifications/unread/count');
};

// 创建通知
export const createNotification = (data: CreateNotificationDto) => {
  return request.post<Notification>('/notifications', data);
};

// 标记为已读
export const markAsRead = (id: string) => {
  return request.post(`/notifications/${id}/read`);
};

// 批量标记为已读
export const markAllAsRead = () => {
  return request.post('/notifications/read-all');
};

// 删除通知
export const deleteNotification = (id: string) => {
  return request.delete(`/notifications/${id}`);
};

// 批量删除通知
export const batchDeleteNotifications = (ids: string[]) => {
  return request.post('/notifications/batch/delete', { ids });
};
