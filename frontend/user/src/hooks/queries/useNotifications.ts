/**
 * 消息通知 React Query Hooks (用户端)
 *
 * 提供消息列表、通知设置、WebSocket 实时通知等功能
 * ✅ 使用 Zod Schema 验证 API 响应
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useEffect } from 'react';
import type {
  Notification,
  NotificationListQuery,
  NotificationSettings,
  NotificationListResponse as ServiceNotificationListResponse,
  NotificationStats as ServiceNotificationStats,
} from '@/services/notification';
import * as notificationService from '@/services/notification';

// 重新导出 service 类型供 pages 使用
export type { Notification, NotificationListQuery, NotificationSettings } from '@/services/notification';
export type NotificationStats = ServiceNotificationStats;
export type NotificationListResponse = ServiceNotificationListResponse;
import { notificationWS } from '@/services/notification';
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig } from '../utils/cacheConfig';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import { NotificationSchema, PaginatedNotificationsResponseSchema } from '@/schemas/api.schemas';
import { z } from 'zod';

// 未读数量 Schema
const UnreadCountSchema = z.object({
  count: z.number().int().nonnegative(),
});

// 通知设置 Schema
const NotificationSettingsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  categories: z.record(z.string(), z.boolean()).optional(),
}).passthrough();

// 通知统计 Schema
const NotificationStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  unread: z.number().int().nonnegative(),
  read: z.number().int().nonnegative().optional(),
}).passthrough();

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

// ==================== 类型定义 ====================

export interface UnreadCountResponse {
  count: number;
}

// ==================== Query Hooks ====================

/**
 * 获取消息列表
 * @param userId - 用户ID (必需)
 * @param params - 查询参数
 */
export const useNotifications = (userId: string, params?: NotificationListQuery) => {
  return useValidatedQuery<ServiceNotificationListResponse>({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationService.getNotifications(userId, params),
    schema: PaginatedNotificationsResponseSchema,
    staleTime: StaleTimeConfig.notifications, // 30秒
    enabled: !!userId,
  });
};

/**
 * 获取消息详情
 */
export const useNotificationDetail = (id: string, options?: { enabled?: boolean }) => {
  return useValidatedQuery<Notification>({
    queryKey: notificationKeys.detail(id),
    queryFn: () => notificationService.getNotificationDetail(id),
    schema: NotificationSchema,
    enabled: options?.enabled !== false && !!id,
    staleTime: StaleTimeConfig.notifications,
  });
};

/**
 * 获取未读消息数量
 * @param userId - 用户ID (可选，传入后用于过滤)
 */
export const useUnreadCount = (userId?: string) => {
  return useValidatedQuery<UnreadCountResponse>({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationService.getUnreadCount(userId),
    schema: UnreadCountSchema,
    staleTime: StaleTimeConfig.SHORT, // 5秒，保持实时性
    refetchInterval: 30000, // 每30秒轮询一次
  });
};

/**
 * 获取通知设置
 * @param userId - 用户ID (必需)
 */
export const useNotificationSettings = (userId: string) => {
  return useValidatedQuery<NotificationSettings>({
    queryKey: notificationKeys.settings(),
    queryFn: () => notificationService.getNotificationSettings(userId),
    schema: NotificationSettingsSchema,
    staleTime: StaleTimeConfig.VERY_LONG, // 5分钟
    enabled: !!userId,
  });
};

/**
 * 获取通知统计
 */
export const useNotificationStats = () => {
  return useValidatedQuery<ServiceNotificationStats>({
    queryKey: notificationKeys.stats(),
    queryFn: () => notificationService.getNotificationStats(),
    schema: NotificationStatsSchema,
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

  return useMutation<void, unknown, string>({
    mutationFn: (userId: string) => notificationService.markAllAsRead(userId),
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

  return useMutation<
    NotificationSettings,
    unknown,
    { userId: string; settings: Partial<NotificationSettings> }
  >({
    mutationFn: ({ userId, settings }) =>
      notificationService.updateNotificationSettings(userId, settings),
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
