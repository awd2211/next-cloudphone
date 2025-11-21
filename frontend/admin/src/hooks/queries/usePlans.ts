/**
 * Plans React Query Hooks
 *
 * 基于 @/services/plan
 * ✅ 完全类型安全
 * ✅ 支持无限滚动
 */

import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryOptions,
  type InfiniteData,
} from '@tanstack/react-query';
import { message } from 'antd';
import * as planService from '@/services/plan';
import type {
  Plan,
  CreatePlanDto,
  PaginationParams,
  PaginatedResponse,
} from '@/types';

// ============================================================================
// Query Keys
// ============================================================================

export const planKeys = {
  all: ['plans'] as const,
  lists: () => [...planKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...planKeys.lists(), params] as const,
  infinite: (params?: Omit<PaginationParams, 'page'>) =>
    [...planKeys.all, 'infinite', params] as const,
  details: () => [...planKeys.all, 'detail'] as const,
  detail: (id: string) => [...planKeys.details(), id] as const,
  stats: () => [...planKeys.all, 'stats'] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * 获取套餐列表
 */
export const usePlans = (
  params?: PaginationParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<Plan>, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: planKeys.list(params),
    queryFn: () => planService.getPlans(params),
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * 获取单个套餐详情
 */
export const usePlan = (
  id: string,
  options?: Omit<UseQueryOptions<Plan, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: planKeys.detail(id),
    queryFn: () => planService.getPlan(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * 获取套餐统计
 */
export const usePlanStats = () => {
  return useQuery({
    queryKey: planKeys.stats(),
    queryFn: () => planService.getPlanStats(),
    staleTime: 60 * 1000,
  });
};

/**
 * 无限滚动获取套餐列表
 */
export const useInfinitePlans = (params?: Omit<PaginationParams, 'page'>) => {
  return useInfiniteQuery<
    PaginatedResponse<Plan>,
    Error,
    InfiniteData<PaginatedResponse<Plan>>,
    ReturnType<typeof planKeys.infinite>,
    number
  >({
    queryKey: planKeys.infinite(params),
    queryFn: ({ pageParam = 1 }) =>
      planService.getPlans({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.page || 1;
      const totalPages = Math.ceil((lastPage.total || 0) / (lastPage.pageSize || 10));
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 30 * 1000,
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * 创建套餐 Mutation
 */
export const useCreatePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: planService.createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.invalidateQueries({ queryKey: planKeys.infinite() });
      queryClient.invalidateQueries({ queryKey: planKeys.stats() });
      message.success('创建套餐成功');
    },
    onError: (error: Error) => {
      message.error(`创建失败: ${error.message}`);
    },
  });
};

/**
 * 更新套餐 Mutation
 */
export const useUpdatePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePlanDto> }) =>
      planService.updatePlan(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.invalidateQueries({ queryKey: planKeys.infinite() });
      queryClient.invalidateQueries({ queryKey: planKeys.stats() });
      message.success('更新套餐成功');
    },
    onError: (error: Error) => {
      message.error(`更新失败: ${error.message}`);
    },
  });
};

/**
 * 删除套餐 Mutation
 */
export const useDeletePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: planService.deletePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.invalidateQueries({ queryKey: planKeys.infinite() });
      queryClient.invalidateQueries({ queryKey: planKeys.stats() });
      message.success('删除套餐成功');
    },
    onError: (error: Error) => {
      message.error(`删除失败: ${error.message}`);
    },
  });
};

/**
 * 启用/禁用套餐 Mutation
 */
export const useTogglePlanStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      planService.togglePlanStatus(id, enabled),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: planKeys.lists() });
      queryClient.invalidateQueries({ queryKey: planKeys.infinite() });
      message.success('状态更新成功');
    },
    onError: (error: Error) => {
      message.error(`更新失败: ${error.message}`);
    },
  });
};
