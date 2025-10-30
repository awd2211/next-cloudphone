import request from '@/utils/request';
import type { PaginationParams, PaginatedResponse } from '@/types';

export interface Quota {
  id: string;
  userId: string;
  userName: string;
  limits: {
    maxDevices: number;
    totalCpuCores: number;
    totalMemoryGB: number;
    totalStorageGB: number;
  };
  usage: {
    currentDevices: number;
    usedCpuCores: number;
    usedMemoryGB: number;
    usedStorageGB: number;
  };
  status: 'active' | 'exceeded' | 'warning';
  createdAt: string;
  updatedAt: string;
}

export interface UpdateQuotaDto {
  maxDevices?: number;
  totalCpuCores?: number;
  totalMemoryGB?: number;
  totalStorageGB?: number;
}

// 获取配额列表
export const getQuotas = (params?: PaginationParams & { status?: string; userId?: string }) => {
  return request.get<PaginatedResponse<Quota>>('/quotas', { params });
};

// 获取配额详情
export const getQuotaDetail = (id: string) => {
  return request.get<Quota>(`/quotas/${id}`);
};

// 获取用户配额
export const getUserQuota = (userId: string) => {
  return request.get<Quota>(`/quotas/user/${userId}`);
};

// 更新配额
export const updateQuota = (id: string, data: UpdateQuotaDto) => {
  return request.patch<Quota>(`/quotas/${id}`, data);
};

// 创建配额
export const createQuota = (userId: string, data: UpdateQuotaDto) => {
  return request.post<Quota>('/quotas', { userId, ...data });
};

// 删除配额
export const deleteQuota = (id: string) => {
  return request.delete(`/quotas/${id}`);
};

// 获取配额使用统计
export const getQuotaStats = () => {
  return request.get<{
    totalQuotas: number;
    activeQuotas: number;
    exceededQuotas: number;
    warningQuotas: number;
  }>('/quotas/stats');
};
