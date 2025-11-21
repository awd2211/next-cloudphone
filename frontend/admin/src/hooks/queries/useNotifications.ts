import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  batchDeleteNotifications,
  type Notification,
} from '@/services/notification';
import { NotificationsResponseSchema } from '@/schemas/api.schemas';
import { z } from 'zod';

/**
 * Query Keys 工厂
 * 统一管理所有通知相关的 query keys
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (userId: string, filters?: { isRead?: boolean; type?: string }) =>
    [...notificationKeys.lists(), userId, filters] as const,
  unreadCount: (userId: string) => [...notificationKeys.all, 'unreadCount', userId] as const,
};

/**
 * 未读数响应 Schema
 */
const UnreadCountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});

/**
 * 获取通知列表
 *
 * ✅ 优势:
 * - 自动缓存 10 秒
 * - 自动去重请求
 * - 后台自动刷新
 * - Zod 运行时验证
 */
export function useNotifications(
  userId: string,
  filters?: { isRead?: boolean; type?: string; page?: number; pageSize?: number }
) {
  return useQuery({
    queryKey: notificationKeys.list(userId, { isRead: filters?.isRead, type: filters?.type }),
    queryFn: async () => {
      const response = await getNotifications({
        userId,
        isRead: filters?.isRead,
        type: filters?.type,
        page: filters?.page || 1,
        pageSize: filters?.pageSize || 10,
      });

      // ✅ Zod 验证，确保数据安全
      const validated = NotificationsResponseSchema.parse(response);
      return validated;
    },
    staleTime: 10 * 1000, // 10 秒内认为数据是新鲜的
    gcTime: 5 * 60 * 1000, // 5 分钟后清理缓存
    enabled: !!userId, // 只有 userId 存在时才执行查询
  });
}

/**
 * 获取未读通知数量
 *
 * ✅ 优势:
 * - 自动缓存 30 秒
 * - 自动后台刷新
 */
export function useUnreadCount(userId: string) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(userId),
    queryFn: async () => {
      const response = await getUnreadCount(userId);
      // ✅ Zod 验证
      const validated = UnreadCountResponseSchema.parse(response);
      return validated.count;
    },
    staleTime: 30 * 1000, // 30 秒
    gcTime: 5 * 60 * 1000,
    enabled: !!userId,
    refetchInterval: 30 * 1000, // 每 30 秒自动刷新一次
  });
}

/**
 * 标记通知为已读
 *
 * ✅ 优势:
 * - 乐观更新 (立即更新 UI)
 * - 失败时自动回滚
 * - 自动失效相关缓存
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAsRead,

    // ✅ 乐观更新：立即更新 UI
    onMutate: async (notificationId: string) => {
      // 取消正在进行的查询，避免覆盖乐观更新
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });

      // 保存当前数据（用于回滚）
      const previousNotifications = queryClient.getQueriesData({ queryKey: notificationKeys.lists() });
      const previousUnreadCounts = queryClient.getQueriesData({ queryKey: notificationKeys.all });

      // 立即更新通知列表
      queryClient.setQueriesData(
        { queryKey: notificationKeys.lists() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((n: Notification) =>
              n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
            ),
          };
        }
      );

      // 立即更新未读数
      queryClient.setQueriesData(
        { queryKey: notificationKeys.all },
        (old: any) => {
          if (typeof old === 'number') {
            return Math.max(0, old - 1);
          }
          return old;
        }
      );

      return { previousNotifications, previousUnreadCounts };
    },

    // ❌ 失败时回滚
    onError: (_error, _variables, context) => {
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousUnreadCounts) {
        context.previousUnreadCounts.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      message.error('标记已读失败');
    },

    // ✅ 成功后刷新数据
    onSuccess: () => {
      // 不需要显示成功消息，因为 UI 已经更新了
    },

    // 始终执行（无论成功失败）
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * 全部标记为已读
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => markAllAsRead(userId),

    onSuccess: (_, _userId) => {
      // 失效所有通知相关的查询
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      message.success('已全部标记为已读');
    },

    onError: (_error, _variables, _context) => {
      message.error('操作失败');
    },
  });
}

/**
 * 删除通知
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNotification,

    // ✅ 乐观更新
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });

      const previousNotifications = queryClient.getQueriesData({ queryKey: notificationKeys.lists() });

      // 立即从列表中移除
      queryClient.setQueriesData(
        { queryKey: notificationKeys.lists() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((n: Notification) => n.id !== notificationId),
            total: Math.max(0, (old.total || 0) - 1),
          };
        }
      );

      return { previousNotifications };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      message.error('删除失败');
    },

    onSuccess: () => {
      message.success('删除成功');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * 批量删除通知
 */
export function useBatchDeleteNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchDeleteNotifications,

    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });

      const previousNotifications = queryClient.getQueriesData({ queryKey: notificationKeys.lists() });

      // 立即从列表中移除所有选中的通知
      queryClient.setQueriesData(
        { queryKey: notificationKeys.lists() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((n: Notification) => !ids.includes(n.id)),
            total: Math.max(0, (old.total || 0) - ids.length),
          };
        }
      );

      return { previousNotifications };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      message.error('批量删除失败');
    },

    onSuccess: (_, ids) => {
      message.success(`成功删除 ${ids.length} 条通知`);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
