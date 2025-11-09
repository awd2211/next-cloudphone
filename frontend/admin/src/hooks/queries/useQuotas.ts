import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  getAllQuotas,
  getUserQuota,
  createQuota,
  updateQuota,
  deleteQuota,
  getQuotaAlerts,
  type Quota,
  type CreateQuotaDto,
  type UpdateQuotaDto,
} from '@/services/quota';
import { QuotaAlertsResponseSchema } from '@/schemas/api.schemas';

/**
 * Query Keys 工厂
 */
export const quotaKeys = {
  all: ['quotas'] as const,
  lists: () => [...quotaKeys.all, 'list'] as const,
  list: (filters?: any) => [...quotaKeys.lists(), filters] as const,
  details: () => [...quotaKeys.all, 'detail'] as const,
  detail: (id: string) => [...quotaKeys.details(), id] as const,
  userQuota: (userId: string) => [...quotaKeys.all, 'user', userId] as const,
  alerts: (threshold: number) => [...quotaKeys.all, 'alerts', threshold] as const,
};

/**
 * 获取所有配额列表
 *
 * ✅ 优势:
 * - 自动缓存 30 秒
 * - 自动去重请求
 * - 后台自动刷新
 */
export function useQuotas(filters?: { status?: string; limit?: number; page?: number }) {
  return useQuery({
    queryKey: quotaKeys.list(filters),
    queryFn: async () => {
      const response = await getAllQuotas(filters);
      return response;
    },
    staleTime: 30 * 1000, // 30 秒
    gcTime: 5 * 60 * 1000, // 5 分钟
  });
}

/**
 * 获取用户配额
 */
export function useUserQuota(userId: string) {
  return useQuery({
    queryKey: quotaKeys.userQuota(userId),
    queryFn: async () => {
      const response = await getUserQuota(userId);
      return response.data;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!userId,
  });
}

/**
 * 获取配额告警
 *
 * ✅ 优化: 增加轮询间隔到 60 秒（后端有缓存）
 */
export function useQuotaAlerts(threshold: number = 80) {
  return useQuery({
    queryKey: quotaKeys.alerts(threshold),
    queryFn: async () => {
      const response = await getQuotaAlerts(threshold);
      // ✅ Zod 验证
      const validated = QuotaAlertsResponseSchema.parse(response);
      return validated.success && validated.data ? validated.data : [];
    },
    staleTime: 60 * 1000, // 60 秒内数据视为新鲜
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000, // 每 60 秒自动刷新（与后端缓存匹配）
    refetchIntervalInBackground: false, // 页面不可见时不刷新
  });
}

/**
 * 创建配额
 *
 * ✅ 自动失效列表缓存
 */
export function useCreateQuota() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createQuota,

    onSuccess: (response) => {
      if (response.success) {
        // 失效列表缓存，触发重新获取
        queryClient.invalidateQueries({ queryKey: quotaKeys.lists() });
        message.success('创建配额成功');
      } else {
        message.error(response.message || '创建配额失败');
      }
    },

    onError: (error: any) => {
      message.error(error.message || '创建配额失败');
    },
  });
}

/**
 * 更新配额
 *
 * ✅ 乐观更新 + 自动失效缓存
 */
export function useUpdateQuota() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuotaDto }) => updateQuota(id, data),

    // ✅ 乐观更新
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: quotaKeys.lists() });

      const previousQuotas = queryClient.getQueriesData({ queryKey: quotaKeys.lists() });

      // 立即更新列表中的数据
      queryClient.setQueriesData(
        { queryKey: quotaKeys.lists() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((q: Quota) =>
              q.id === id ? { ...q, ...data } : q
            ),
          };
        }
      );

      return { previousQuotas };
    },

    onError: (error: any, variables, context) => {
      // 回滚
      if (context?.previousQuotas) {
        context.previousQuotas.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      message.error(error.message || '更新配额失败');
    },

    onSuccess: (response) => {
      if (response.success) {
        message.success('更新配额成功');
      } else {
        message.error(response.message || '更新配额失败');
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: quotaKeys.all });
    },
  });
}

/**
 * 删除配额
 *
 * ✅ 乐观更新
 */
export function useDeleteQuota() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteQuota,

    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: quotaKeys.lists() });

      const previousQuotas = queryClient.getQueriesData({ queryKey: quotaKeys.lists() });

      // 立即从列表中移除
      queryClient.setQueriesData(
        { queryKey: quotaKeys.lists() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((q: Quota) => q.id !== id),
            total: Math.max(0, (old.total || 0) - 1),
          };
        }
      );

      return { previousQuotas };
    },

    onError: (error: any, id, context) => {
      if (context?.previousQuotas) {
        context.previousQuotas.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      message.error(error.message || '删除配额失败');
    },

    onSuccess: (response) => {
      if (response.success) {
        message.success('删除配额成功');
      } else {
        message.error(response.message || '删除配额失败');
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: quotaKeys.all });
    },
  });
}
