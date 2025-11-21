import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  getMyProxies,
  getMyProxyStats,
  getProxyDetail,
  acquireProxy,
  releaseProxy,
  renewProxy,
  testProxy,
  getProxyUsageHistory,
  batchReleaseProxies,
  getAvailableProxies,
  reportProxyIssue,
  type ProxyListParams,
  type ProxyListResponse,
  type ProxyRecord,
  type ProxyStats,
  type AcquireProxyDto,
  type ProxyUsageRecord,
} from '@/services/proxy';

/**
 * Proxy 代理管理 React Query Hooks (用户端)
 *
 * 提供用户自助代理管理功能
 */

// ==================== Query Keys ====================

export const proxyKeys = {
  all: ['proxy'] as const,
  myProxies: (params?: ProxyListParams) => [...proxyKeys.all, 'my', params] as const,
  detail: (id: string) => [...proxyKeys.all, 'detail', id] as const,
  stats: () => [...proxyKeys.all, 'stats'] as const,
  usage: (params?: any) => [...proxyKeys.all, 'usage', params] as const,
  available: (params?: any) => [...proxyKeys.all, 'available', params] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取我的代理列表
 */
export const useMyProxies = (params?: ProxyListParams) => {
  return useQuery<ProxyListResponse>({
    queryKey: proxyKeys.myProxies(params),
    queryFn: () => getMyProxies(params),
  });
};

/**
 * 获取代理详情
 */
export const useProxyDetail = (id: string, options?: { enabled?: boolean }) => {
  return useQuery<ProxyRecord>({
    queryKey: proxyKeys.detail(id),
    queryFn: () => getProxyDetail(id),
    enabled: options?.enabled !== false && !!id,
  });
};

/**
 * 获取我的代理统计
 */
export const useMyProxyStats = () => {
  return useQuery<ProxyStats>({
    queryKey: proxyKeys.stats(),
    queryFn: getMyProxyStats,
    refetchInterval: 30000, // 每30秒自动刷新
  });
};

/**
 * 获取可用代理列表
 */
export const useAvailableProxies = (params?: {
  country?: string;
  protocol?: string;
  limit?: number;
}) => {
  return useQuery<ProxyRecord[]>({
    queryKey: proxyKeys.available(params),
    queryFn: () => getAvailableProxies(params),
  });
};

/**
 * 获取代理使用历史
 */
export const useProxyUsageHistory = (params?: {
  proxyId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery<{
    data: ProxyUsageRecord[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: proxyKeys.usage(params),
    queryFn: () => getProxyUsageHistory(params),
  });
};

// ==================== Mutation Hooks ====================

/**
 * 获取代理 (分配新代理)
 */
export const useAcquireProxy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acquireProxy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.myProxies() });
      queryClient.invalidateQueries({ queryKey: proxyKeys.stats() });
      message.success('代理获取成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '代理获取失败');
    },
  });
};

/**
 * 释放代理
 */
export const useReleaseProxy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: releaseProxy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.myProxies() });
      queryClient.invalidateQueries({ queryKey: proxyKeys.stats() });
      message.success('代理释放成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '代理释放失败');
    },
  });
};

/**
 * 批量释放代理
 */
export const useBatchReleaseProxies = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchReleaseProxies,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.myProxies() });
      queryClient.invalidateQueries({ queryKey: proxyKeys.stats() });
      message.success(`批量释放成功 - 成功: ${result.success}, 失败: ${result.failed}`);
    },
    onError: (error: any) => {
      message.error(error?.message || '批量释放失败');
    },
  });
};

/**
 * 续期代理
 */
export const useRenewProxy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ proxyId, duration }: { proxyId: string; duration?: number }) =>
      renewProxy(proxyId, duration),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.myProxies() });
      queryClient.invalidateQueries({ queryKey: proxyKeys.detail(variables.proxyId) });
      message.success('代理续期成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '代理续期失败');
    },
  });
};

/**
 * 测试代理
 */
export const useTestProxy = () => {
  return useMutation({
    mutationFn: testProxy,
    onSuccess: (result) => {
      if (result.success) {
        message.success(`代理测试成功 - 响应时间: ${result.responseTime}ms`);
      } else {
        message.error(`代理测试失败: ${result.error}`);
      }
    },
    onError: (error: any) => {
      message.error(error?.message || '代理测试失败');
    },
  });
};

/**
 * 报告代理问题
 */
export const useReportProxyIssue = () => {
  return useMutation({
    mutationFn: ({ proxyId, issue, description }: {
      proxyId: string;
      issue: string;
      description?: string;
    }) => reportProxyIssue(proxyId, issue, description),
    onSuccess: () => {
      message.success('问题报告已提交');
    },
    onError: (error: any) => {
      message.error(error?.message || '问题报告提交失败');
    },
  });
};
