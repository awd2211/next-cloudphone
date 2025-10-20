import request from '@/utils/request';
import type { Plan, CreatePlanDto, PaginationParams, PaginatedResponse } from '@/types';

// 套餐列表
export const getPlans = (params?: PaginationParams) => {
  return request.get<PaginatedResponse<Plan>>('/billing/plans', { params });
};

// 获取套餐详情
export const getPlan = (id: string) => {
  return request.get<Plan>(`/billing/plans/${id}`);
};

// 创建套餐
export const createPlan = (data: CreatePlanDto) => {
  return request.post<Plan>('/billing/plans', data);
};

// 更新套餐
export const updatePlan = (id: string, data: Partial<CreatePlanDto>) => {
  return request.patch<Plan>(`/billing/plans/${id}`, data);
};

// 删除套餐
export const deletePlan = (id: string) => {
  return request.delete(`/billing/plans/${id}`);
};

// 启用/禁用套餐
export const togglePlanStatus = (id: string, isActive: boolean) => {
  return request.patch<Plan>(`/billing/plans/${id}`, { isActive });
};

// 套餐统计
export const getPlanStats = () => {
  return request.get<{
    planId: string;
    planName: string;
    orderCount: number;
    revenue: number;
  }[]>('/reports/plans/stats');
};
