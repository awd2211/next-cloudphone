/**
 * 套餐管理服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { Plan, CreatePlanDto, PaginationParams, PaginatedResponse } from '@/types';

// 套餐列表
export const getPlans = (params?: PaginationParams): Promise<PaginatedResponse<Plan>> =>
  api.get<PaginatedResponse<Plan>>('/billing/plans', { params });

// 获取套餐详情
export const getPlan = (id: string): Promise<Plan> =>
  api.get<Plan>(`/billing/plans/${id}`);

// 创建套餐
export const createPlan = (data: CreatePlanDto): Promise<Plan> =>
  api.post<Plan>('/billing/plans', data);

// 更新套餐
export const updatePlan = (id: string, data: Partial<CreatePlanDto>): Promise<Plan> =>
  api.patch<Plan>(`/billing/plans/${id}`, data);

// 删除套餐
export const deletePlan = (id: string): Promise<void> =>
  api.delete<void>(`/billing/plans/${id}`);

// 批量删除套餐
export const batchDeletePlans = (planIds: string[]): Promise<void> =>
  api.post<void>('/billing/plans/batch-delete', { planIds });

// 启用/禁用套餐
export const togglePlanStatus = (id: string, isActive: boolean): Promise<Plan> =>
  api.patch<Plan>(`/billing/plans/${id}`, { isActive });

// 套餐统计
export const getPlanStats = (): Promise<
  {
    planId: string;
    planName: string;
    orderCount: number;
    revenue: number;
  }[]
> =>
  api.get<
    {
      planId: string;
      planName: string;
      orderCount: number;
      revenue: number;
    }[]
  >('/reports/plans/stats');
