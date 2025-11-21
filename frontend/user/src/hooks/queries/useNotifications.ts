/**
 * 消息通知 React Query Hooks (用户端)
 *
 * 提供消息列表、通知设置、WebSocket 实时通知等功能
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useEffect } from 'react';
import type {
  Notification,
  NotificationListQuery,
  NotificationListResponse,
  NotificationSettings,
  NotificationStats,
} from '@/services/notification';
import * as notificationService from '@/services/notification';
import { notificationWS } from '@/services/notification';
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig } from '../utils/cacheConfig';

// ==================== Query Keys ====================

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params?: NotificationListQuery) => [...notificationKeys.lists(), params] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationKeys.details(), id] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  settings: () => [...notificationKeys.all, 'settings'] as const,
  stats: () => [...notificationKeys.all, 'stats'] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取消息列表
 */
export const useNotifications = (params?: NotificationListQuery) => {
  return useQuery<NotificationListResponse>({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationService.getNotifications(params),
    staleTime: StaleTimeConfig.notifications, // 30秒
    placeholderData: (previousData) => previousData,
  });
};

/**
 * 获取消息详情
 */
export const useNotificationDetail = (id: string, options?: { enabled?: boolean }) => {
  return useQuery<Notification>({
    queryKey: notificationKeys.detail(id),
    queryFn: () => notificationService.getNotificationDetail(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: StaleTimeConfig.notifications,
  });
};

/**
 * 获取未读消息数量
 */
export const useUnreadCount = () => {
  return useQuery<{ count: number }>({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationService.getUnreadCount(),
    staleTime: StaleTimeConfig.SHORT, // 5秒，保持实时性
    refetchInterval: 30000, // 每30秒轮询一次
  });
};

/**
 * 获取通知设置
 */
export const useNotificationSettings = () => {
  return useQuery<NotificationSettings>({
    queryKey: notificationKeys.settings(),
    queryFn: () => notificationService.getNotificationSettings(),
    staleTime: StaleTimeConfig.VERY_LONG, // 5分钟
  });
};

/**
 * 获取通知统计
 */
export const useNotificationStats = () => {
  return useQuery<NotificationStats>({
    queryKey: notificationKeys.stats(),
    queryFn: () => notificationService.getNotificationStats(),
    staleTime: StaleTimeConfig.MEDIUM, // 30秒
  });
};

// ==================== Mutation Hooks ====================

/**
 * 标记消息为已读
 */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string[]>({
    mutationFn: (ids) => notificationService.markAsRead(ids),
    onSuccess: () => {
      // 刷新消息列表和未读数
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '标记已读失败');
    },
  });
};

/**
 * 标记所有消息为已读
 */
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, void>({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      handleMutationSuccess('所有消息已标记为已读');
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '操作失败');
    },
  });
};

/**
 * 删除消息
 */
export const useDeleteNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string[]>({
    mutationFn: (ids) => notificationService.deleteNotifications(ids),
    onSuccess: () => {
      handleMutationSuccess('消息删除成功');
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '删除失败');
    },
  });
};

/**
 * 清空所有已读消息
 */
export const useClearReadNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, void>({
    mutationFn: () => notificationService.clearReadNotifications(),
    onSuccess: () => {
      handleMutationSuccess('已清空所有已读消息');
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '清空失败');
    },
  });
};

/**
 * 更新通知设置
 */
export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();

  return useMutation<NotificationSettings, unknown, Partial<NotificationSettings>>({
    mutationFn: (settings) => notificationService.updateNotificationSettings(settings),
    onSuccess: () => {
      handleMutationSuccess('设置已保存');
      queryClient.invalidateQueries({ queryKey: notificationKeys.settings() });
    },
    onError: (error) => {
      handleMutationError(error, '保存设置失败');
    },
  });
};

// ==================== WebSocket Hooks ====================

/**
 * WebSocket 实时通知
 * 自动连接 WebSocket 并监听新消息
 */
export const useRealtimeNotifications = (
  userId: string,
  options?: {
    onNotification?: (notification: Notification) => void;
    onUnreadCountUpdate?: (count: number) => void;
    enabled?: boolean;
  }
) => {
  const queryClient = useQueryClient();
  const enabled = options?.enabled !== false && !!userId;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // 连接 WebSocket
    notificationWS.connect(userId);

    // 监听新通知
    const handleNotification = (notification: Notification) => {
      // 显示通知提示
      message.info({
        content: notification.title,
        duration: 3,
      });

      // 触发回调
      options?.onNotification?.(notification);

      // 刷新查询
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
    };

    // 监听未读数更新
    const handleUnreadCount = (data: { count: number }) => {
      options?.onUnreadCountUpdate?.(data.count);
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    };

    notificationWS.on('notification', handleNotification);
    notificationWS.on('unread-count', handleUnreadCount);

    // 清理
    return () => {
      notificationWS.off('notification', handleNotification);
      notificationWS.off('unread-count', handleUnreadCount);
      notificationWS.disconnect();
    };
  }, [enabled, userId, queryClient, options]);

  return {
    isConnected: notificationWS.isConnected(),
  };
};
