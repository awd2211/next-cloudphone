/**
 * 套餐计划 React Query Hooks (用户端)
 *
 * 提供套餐列表、详情查询功能
 */

import { useQuery } from '@tanstack/react-query';
import type { Plan, PaginationParams, PaginatedResponse } from '@/types';
import * as planService from '@/services/plan';
import { StaleTimeConfig } from '../utils/cacheConfig';

// ==================== Query Keys ====================

export const planKeys = {
  all: ['plans'] as const,
  lists: () => [...planKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...planKeys.lists(), params] as const,
  active: () => [...planKeys.all, 'active'] as const,
  details: () => [...planKeys.all, 'detail'] as const,
  detail: (id: string) => [...planKeys.details(), id] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取套餐列表（分页）
 */
export const usePlans = (params?: PaginationParams) => {
  return useQuery<PaginatedResponse<Plan>>({
    queryKey: planKeys.list(params),
    queryFn: () => planService.getPlans(params),
    staleTime: StaleTimeConfig.VERY_LONG, // 5分钟（套餐变化不频繁）
    placeholderData: (previousData) => previousData,
  });
};

/**
 * 获取活跃套餐（不分页，用于首页展示）
 */
export const useActivePlans = () => {
  return useQuery<Plan[]>({
    queryKey: planKeys.active(),
    queryFn: () => planService.getActivePlans(),
    staleTime: StaleTimeConfig.VERY_LONG, // 5分钟
  });
};

/**
 * 获取套餐详情
 */
export const usePlan = (id: string, options?: { enabled?: boolean }) => {
  return useQuery<Plan>({
    queryKey: planKeys.detail(id),
    queryFn: () => planService.getPlan(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: StaleTimeConfig.VERY_LONG, // 5分钟
  });
};
