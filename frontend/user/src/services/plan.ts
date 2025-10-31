import request from '@/utils/request';
import type { Plan, PaginationParams, PaginatedResponse } from '@/types';

// 获取套餐列表
export const getPlans = (params?: PaginationParams) => {
  return request.get<PaginatedResponse<Plan>>('/billing/plans', { params });
};

// 获取活跃套餐（不分页，获取所有公开套餐用于首页展示）
export const getActivePlans = async () => {
  const response = await request.get<PaginatedResponse<Plan>>('/billing/plans', {
    params: { page: 1, pageSize: 100 },
  });
  return response.data; // 只返回数据数组
};

// 获取套餐详情
export const getPlan = async (id: string) => {
  const response = await request.get<{ success: boolean; data: Plan }>(`/billing/plans/${id}`);
  return response.data; // 只返回数据对象
};
