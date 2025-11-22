/**
 * Providers React Query Hooks
 *
 * 基于 @/services/provider
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as providerService from '@/services/provider';

/**
 * Query Keys
 */
export const providerKeys = {
  all: ['providers'] as const,
  specs: () => [...providerKeys.all, 'specs'] as const,
  specsByType: (provider: any) => [...providerKeys.specs(), provider] as const,
  syncStatus: (params?: { provider?: any; page?: number; pageSize?: number }) =>
    [...providerKeys.all, 'sync-status', params] as const,
  health: () => [...providerKeys.all, 'health'] as const,
  config: (provider: any) => [...providerKeys.all, 'config', provider] as const,
  billing: (params: { provider: any; startDate: string; endDate: string }) =>
    [...providerKeys.all, 'billing', params] as const,
};

/**
 * 获取所有提供商规格
 */
export const useProviderSpecs = () => {
  return useQuery({
    queryKey: providerKeys.specs(),
    queryFn: () => providerService.getProviderSpecs(),
    staleTime: 10 * 60 * 1000, // 10分钟
  });
};

/**
 * 获取指定提供商的规格列表
 */
export const useProviderSpecsByType = (provider: any) => {
  return useQuery({
    queryKey: providerKeys.specsByType(provider),
    queryFn: () => providerService.getProviderSpecsByType(provider),
    enabled: !!provider,
    staleTime: 10 * 60 * 1000, // 10分钟
  });
};

/**
 * 获取云设备同步状态
 */
export const useCloudSyncStatus = (params?: {
  provider?: any;
  page?: number;
  pageSize?: number;
}) => {
  return useQuery({
    queryKey: providerKeys.syncStatus(params),
    queryFn: () => providerService.getCloudSyncStatus(params),
  });
};

/**
 * 获取提供商健康状态
 */
export const useProviderHealth = () => {
  return useQuery({
    queryKey: providerKeys.health(),
    queryFn: () => providerService.getProviderHealth(),
    staleTime: 30 * 1000, // 30秒
    refetchInterval: 60 * 1000, // 每分钟自动刷新
  });
};

/**
 * 获取提供商配置
 */
export const useProviderConfig = (provider: any) => {
  return useQuery({
    queryKey: providerKeys.config(provider),
    queryFn: () => providerService.getProviderConfig(provider),
    enabled: !!provider,
  });
};

/**
 * 获取云账单对账数据
 */
export const useCloudBilling = (params: {
  provider: any;
  startDate: string;
  endDate: string;
}) => {
  return useQuery({
    queryKey: providerKeys.billing(params),
    queryFn: () => providerService.getCloudBilling(params),
    enabled: !!params.provider && !!params.startDate && !!params.endDate,
  });
};

/**
 * 手动触发云设备同步 Mutation
 */
export const useTriggerCloudSync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider?: any) => providerService.triggerCloudSync(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerKeys.syncStatus() });
      message.success('同步任务已启动');
    },
    onError: () => {
      message.error('启动同步失败');
    },
  });
};

/**
 * 更新提供商配置 Mutation
 */
export const useUpdateProviderConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ provider, config }: { provider: any; config: any }) =>
      providerService.updateProviderConfig(provider, config),
    onSuccess: (_, { provider }) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.config(provider) });
      message.success('配置更新成功');
    },
    onError: () => {
      message.error('配置更新失败');
    },
  });
};

/**
 * 测试提供商连接 Mutation
 */
export const useTestProviderConnection = () => {
  return useMutation({
    mutationFn: (provider: any) => providerService.testProviderConnection(provider),
    onSuccess: () => {
      message.success('连接测试成功');
    },
    onError: () => {
      message.error('连接测试失败');
    },
  });
};
