/**
 * API 密钥管理服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { PaginationParams, PaginatedResponse } from '@/types';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  secret: string;
  scopes: string[];
  status: 'active' | 'inactive' | 'expired';
  usageCount: number;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
  description?: string;
}

export interface CreateApiKeyDto {
  name: string;
  environment: 'prod' | 'test' | 'dev';
  scopes: string[];
  expiresAt?: string;
  description?: string;
}

export interface UpdateApiKeyDto {
  name?: string;
  scopes?: string[];
  status?: 'active' | 'inactive';
  expiresAt?: string;
  description?: string;
}

// 获取 API 密钥列表
export const getApiKeys = (
  params?: PaginationParams & { status?: string; environment?: string }
): Promise<PaginatedResponse<ApiKey>> =>
  api.get<PaginatedResponse<ApiKey>>('/api-keys', { params });

// 获取 API 密钥详情
export const getApiKeyDetail = (id: string): Promise<ApiKey> =>
  api.get<ApiKey>(`/api-keys/${id}`);

// 创建 API 密钥
export const createApiKey = (data: CreateApiKeyDto): Promise<ApiKey> =>
  api.post<ApiKey>('/api-keys', data);

// 更新 API 密钥
export const updateApiKey = (id: string, data: UpdateApiKeyDto): Promise<ApiKey> =>
  api.patch<ApiKey>(`/api-keys/${id}`, data);

// 删除 API 密钥
export const deleteApiKey = (id: string): Promise<void> =>
  api.delete<void>(`/api-keys/${id}`);

// 激活/禁用 API 密钥
export const toggleApiKeyStatus = (id: string, status: 'active' | 'inactive'): Promise<void> =>
  api.post<void>(`/api-keys/${id}/toggle`, { status });

// 轮换 API 密钥
export const rotateApiKey = (id: string): Promise<ApiKey> =>
  api.post<ApiKey>(`/api-keys/${id}/rotate`);

// 获取 API 密钥使用统计
export const getApiKeyUsageStats = (
  id: string,
  params?: { startDate?: string; endDate?: string }
): Promise<{
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsByDay: Array<{ date: string; count: number }>;
  requestsByEndpoint: Record<string, number>;
}> =>
  api.get<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    requestsByDay: Array<{ date: string; count: number }>;
    requestsByEndpoint: Record<string, number>;
  }>(`/api-keys/${id}/usage`, { params });

// 获取可用的权限范围列表
export const getAvailableScopes = (): Promise<Array<{ value: string; label: string; description: string }>> =>
  api.get<Array<{ value: string; label: string; description: string }>>(
    '/api-keys/scopes'
  );
