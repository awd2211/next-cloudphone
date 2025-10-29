import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as planService from '@/services/plan';
import type { Plan, CreatePlanDto, PaginationParams } from '@/types';

/**
 * Plan Query Keys
 * 用于 React Query 缓存管理的键定义
 */
export const planKeys = {
  all: ['plans'] as const,
  lists: () => [...planKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...planKeys.lists(), params] as const,
  details: () => [...planKeys.all, 'detail'] as const,
  detail: (id: string) => [...planKeys.details(), id] as const,
  stats: () => [...planKeys.all, 'stats'] as const,
};

/**
 * 获取套餐列表
 */
export function usePlans(params?: PaginationParams) {
  return useQuery({
    queryKey: planKeys.list(params),
    queryFn: () => planService.getPlans(params),
    staleTime: 30 * 1000, // 30秒内认为数据新鲜
  });
}

/**
 * 获取单个套餐详情
 */
export function usePlan(id: string) {
  return useQuery({
    queryKey: planKeys.detail(id),
    queryFn: () => planService.getPlan(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * 获取套餐统计信息
 */
export function usePlanStats() {
  return useQuery({
    queryKey: planKeys.stats(),
    queryFn: () => planService.getPlanStats(),
    staleTime: 60 * 1000, // 统计数据可以缓存1分钟
  });
}

/**
 * 创建套餐
 */
export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePlanDto) => planService.createPlan(data),
    onSuccess: () => {
      // 创建成功后，失效列表缓存
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.invalidateQueries({ queryKey: planKeys.stats() });
      message.success('创建套餐成功');
    },
    onError: (error: any) => {
      message.error(`创建失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 更新套餐
 */
export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePlanDto> }) =>
      planService.updatePlan(id, data),
    onSuccess: (_, { id }) => {
      // 更新成功后，失效相关缓存
      queryClient.invalidateQueries({ queryKey: planKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.invalidateQueries({ queryKey: planKeys.stats() });
      message.success('更新套餐成功');
    },
    onError: (error: any) => {
      message.error(`更新失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 删除套餐
 */
export function useDeletePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => planService.deletePlan(id),
    onSuccess: () => {
      // 删除成功后，失效列表缓存
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.invalidateQueries({ queryKey: planKeys.stats() });
      message.success('删除套餐成功');
    },
    onError: (error: any) => {
      message.error(`删除失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 切换套餐状态（启用/禁用）
 * 使用乐观更新提供即时反馈
 */
export function useTogglePlanStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      planService.togglePlanStatus(id, isActive),
    onMutate: async ({ id, isActive }) => {
      // 取消正在进行的查询，避免冲突
      await queryClient.cancelQueries({ queryKey: planKeys.detail(id) });

      // 保存之前的数据，用于回滚
      const previousPlan = queryClient.getQueryData<Plan>(planKeys.detail(id));

      // 乐观更新 - 立即更新 UI
      if (previousPlan) {
        queryClient.setQueryData<Plan>(planKeys.detail(id), {
          ...previousPlan,
          isActive,
        });
      }

      return { previousPlan };
    },
    onSuccess: (_, { id, isActive }) => {
      // 成功后失效缓存，触发重新获取
      queryClient.invalidateQueries({ queryKey: planKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      message.success(isActive ? '启用套餐成功' : '禁用套餐成功');
    },
    onError: (error: any, { id }, context) => {
      // 失败时回滚乐观更新
      if (context?.previousPlan) {
        queryClient.setQueryData(planKeys.detail(id), context.previousPlan);
      }
      message.error(`操作失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 批量删除套餐
 */
export function useBatchDeletePlans() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => planService.batchDeletePlans(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.invalidateQueries({ queryKey: planKeys.stats() });
      message.success(`成功删除 ${ids.length} 个套餐`);
    },
    onError: (error: any) => {
      message.error(`批量删除失败: ${error.response?.data?.message || error.message}`);
    },
  });
}
