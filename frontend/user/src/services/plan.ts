import request from '@/utils/request';
import type { Plan, PaginationParams, PaginatedResponse } from '@/types';

// 获取套餐列表
export const getPlans = (params?: PaginationParams) => {
  return request.get<PaginatedResponse<Plan>>('/plans', { params });
};

// 获取活跃套餐（不分页）
export const getActivePlans = () => {
  return request.get<Plan[]>('/plans/active');
};

// 获取套餐详情
export const getPlan = (id: string) => {
  return request.get<Plan>(`/plans/${id}`);
};
