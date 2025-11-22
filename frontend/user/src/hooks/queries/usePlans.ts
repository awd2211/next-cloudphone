/**
 * 套餐计划 React Query Hooks (用户端)
 *
 * 提供套餐列表、详情查询功能
 * ✅ 使用 Zod Schema 验证 API 响应
 */

import type { PaginationParams } from '@/types';
import * as planService from '@/services/plan';
import { StaleTimeConfig } from '../utils/cacheConfig';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import { PlanSchema, PaginatedResponseSchema } from '@/schemas/api.schemas';
import { z } from 'zod';

// 套餐分页响应 Schema
const PaginatedPlansResponseSchema = PaginatedResponseSchema(PlanSchema);

// 活跃套餐列表 Schema
const ActivePlansSchema = z.array(PlanSchema);

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
  return useValidatedQuery({
    queryKey: planKeys.list(params),
    queryFn: () => planService.getPlans(params),
    schema: PaginatedPlansResponseSchema,
    staleTime: StaleTimeConfig.VERY_LONG, // 5分钟（套餐变化不频繁）
  });
};

/**
 * 获取活跃套餐（不分页，用于首页展示）
 */
export const useActivePlans = () => {
  return useValidatedQuery({
    queryKey: planKeys.active(),
    queryFn: () => planService.getActivePlans(),
    schema: ActivePlansSchema,
    staleTime: StaleTimeConfig.VERY_LONG, // 5分钟
  });
};

/**
 * 获取套餐详情
 */
export const usePlan = (id: string, options?: { enabled?: boolean }) => {
  return useValidatedQuery({
    queryKey: planKeys.detail(id),
    queryFn: () => planService.getPlan(id),
    schema: PlanSchema,
    enabled: options?.enabled !== false && !!id,
    staleTime: StaleTimeConfig.VERY_LONG, // 5分钟
  });
};
