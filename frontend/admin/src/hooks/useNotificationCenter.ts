import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  notificationWS,
  type Notification,
} from '@/services/notification';
import { useSafeApi } from './useSafeApi';
import { NotificationsResponseSchema } from '@/schemas/api.schemas';

/**
 * 未读数响应Schema
 */
const UnreadCountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});

/**
 * 通知中心业务逻辑 Hook
 *
 * 功能:
 * 1. 数据加载 (通知列表、未读数) - 使用 useSafeApi + Zod 验证
 * 2. WebSocket 实时通知
 * 3. 标记已读
 * 4. 浏览器通知权限管理
 */
export const useNotificationCenter = (userId: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ===== 数据加载 (使用 useSafeApi) =====

  /**
   * 加载通知列表
   */
  const {
    data: notificationsResponse,
    loading,
    execute: executeLoadNotifications,
  } = useSafeApi(
    () => getNotifications({ page: 1, limit: 10 }),
    NotificationsResponseSchema,
    {
      errorMessage: '加载通知列表失败',
      fallbackValue: { data: [], total: 0 },
      showError: false,
    }
  );

  /**
   * 加载未读数
   */
  const {
    data: unreadCountResponse,
    execute: executeLoadUnreadCount,
  } = useSafeApi(
    getUnreadCount,
    UnreadCountResponseSchema,
    {
      errorMessage: '加载未读数失败',
      fallbackValue: { count: 0 },
      showError: false,
    }
  );

  /**
   * 同步数据到 state
   */
  useEffect(() => {
    if (notificationsResponse) {
      setNotifications(notificationsResponse.data);
    }
  }, [notificationsResponse]);

  useEffect(() => {
    if (unreadCountResponse) {
      setUnreadCount(unreadCountResponse.count);
    }
  }, [unreadCountResponse]);

  /**
   * 加载所有数据
   */
  const loadData = useCallback(async () => {
    await Promise.all([
      executeLoadNotifications(),
      executeLoadUnreadCount(),
    ]);
  }, [executeLoadNotifications, executeLoadUnreadCount]);

  // ===== WebSocket 实时通知 =====

  /**
   * 处理新通知
   */
  const handleNewNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev.slice(0, 9)]);
    setUnreadCount((prev) => prev + 1);

    // 浏览器通知
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.content,
        icon: '/logo.png',
      });
    }
  }, []);

  /**
   * 初始化 WebSocket
   */
  useEffect(() => {
    loadData();

    // 连接 WebSocket
    notificationWS.connect(userId);
    notificationWS.on('notification', handleNewNotification);

    // 请求浏览器通知权限
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      notificationWS.off('notification', handleNewNotification);
    };
  }, [userId, loadData, handleNewNotification]);

  // ===== 标记已读 =====

  /**
   * 标记通知为已读
   */
  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, [notifications, unreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    handleMarkAsRead,
    loadData,
  };
};
