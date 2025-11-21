/**
 * API Keys React Query Hooks
 *
 * 提供 API 密钥管理功能的 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as apiKeyService from '@/services/apikey';
import type { CreateApiKeyDto, UpdateApiKeyDto } from '@/services/apikey';

// ==================== Query Keys ====================
export const apiKeyKeys = {
  all: ['api-keys'] as const,
  lists: () => [...apiKeyKeys.all, 'list'] as const,
  list: (params: {
    page?: number;
    pageSize?: number;
    status?: string;
    environment?: string;
  }) => [...apiKeyKeys.lists(), params] as const,
  detail: (id: string) => [...apiKeyKeys.all, 'detail', id] as const,
  scopes: () => [...apiKeyKeys.all, 'scopes'] as const,
};

/**
 * API密钥列表查询
 */
export const useApiKeys = (params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  environment?: string;
}) => {
  const { page = 1, pageSize = 20, ...filters } = params || {};

  return useQuery({
    queryKey: apiKeyKeys.list({ page, pageSize, ...filters }),
    queryFn: async () => {
      const response = await apiKeyService.getApiKeys({
        page,
        pageSize,
        ...filters,
      });
      return {
        apiKeys: response.data || [],
        total: response.total || 0,
        page: response.page || page,
        pageSize: response.pageSize || pageSize,
      };
    },
    staleTime: 30 * 1000, // 30秒缓存
    placeholderData: (previousData) => previousData,
  });
};

/**
 * API密钥详情查询
 */
export const useApiKeyDetail = (id: string) => {
  return useQuery({
    queryKey: apiKeyKeys.detail(id),
    queryFn: () => apiKeyService.getApiKeyDetail(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

/**
 * 可用权限范围查询
 */
export const useAvailableScopes = () => {
  return useQuery({
    queryKey: apiKeyKeys.scopes(),
    queryFn: () => apiKeyService.getAvailableScopes(),
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
};

/**
 * 创建API密钥
 */
export const useCreateApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApiKeyDto) => apiKeyService.createApiKey(data),
    onSuccess: () => {
      message.success('API密钥创建成功，请妥善保管密钥');
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() });
    },
    onError: (error: any) => {
      message.error(error.message || '创建失败');
    },
  });
};

/**
 * 更新API密钥
 */
export const useUpdateApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApiKeyDto }) =>
      apiKeyService.updateApiKey(id, data),
    onSuccess: (_, variables) => {
      message.success('API密钥更新成功');
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.detail(variables.id) });
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败');
    },
  });
};

/**
 * 删除API密钥
 */
export const useDeleteApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiKeyService.deleteApiKey(id),
    onSuccess: () => {
      message.success('API密钥删除成功');
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() });
    },
    onError: (error: any) => {
      message.error(error.message || '删除失败');
    },
  });
};

/**
 * 切换API密钥状态
 */
export const useToggleApiKeyStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      apiKeyService.toggleApiKeyStatus(id, status),
    onSuccess: () => {
      message.success('状态更新成功');
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() });
    },
    onError: (error: any) => {
      message.error(error.message || '状态更新失败');
    },
  });
};

/**
 * 轮换API密钥
 */
export const useRotateApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiKeyService.rotateApiKey(id),
    onSuccess: (_, id) => {
      message.success('API密钥已轮换，请妥善保管新密钥');
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.detail(id) });
    },
    onError: (error: any) => {
      message.error(error.message || '轮换失败');
    },
  });
};
