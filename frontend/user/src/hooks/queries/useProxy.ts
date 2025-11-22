/**
 * Proxy 代理管理 React Query Hooks (用户端)
 *
 * 提供用户自助代理管理功能
 *
 * ✅ 统一使用 const 箭头函数风格
 * ✅ 使用类型化的错误处理
 * ✅ 使用 Zod Schema 验证 API 响应
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  type ProxyRecord,
} from '@/services/proxy';
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig, RefetchIntervalConfig } from '../utils/cacheConfig';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import { ProxySchema, PaginatedProxiesResponseSchema } from '@/schemas/api.schemas';
import { z } from 'zod';

// 代理列表 Schema
const ProxiesSchema = z.array(ProxySchema);

// 代理统计 Schema
const ProxyStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  expired: z.number().int().nonnegative().optional(),
  available: z.number().int().nonnegative().optional(),
  totalBandwidthUsed: z.number().nonnegative().optional(),
}).passthrough();

// ==================== 类型定义 ====================

export interface ProxyStats {
  total: number;
  active: number;
  expired?: number;
  available?: number;
  totalBandwidthUsed?: number;
}

export interface ProxyListResponse {
  data: ProxyRecord[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface ProxyUsageRecord {
  id: string;
  proxyId: string;
  bytesIn?: number;
  bytesOut?: number;
  requestCount?: number;
  date?: string;
  createdAt?: string;
}

export interface ProxyUsageHistoryResponse {
  data: ProxyUsageRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// ==================== Query Keys ====================

export const proxyKeys = {
  all: ['proxy'] as const,
  myProxies: (params?: ProxyListParams) => [...proxyKeys.all, 'my', params] as const,
  detail: (id: string) => [...proxyKeys.all, 'detail', id] as const,
  stats: () => [...proxyKeys.all, 'stats'] as const,
  usage: (params?: Record<string, unknown>) => [...proxyKeys.all, 'usage', params] as const,
  available: (params?: Record<string, unknown>) => [...proxyKeys.all, 'available', params] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取我的代理列表
 */
export const useMyProxies = (params?: ProxyListParams) => {
  return useValidatedQuery<ProxyListResponse>({
    queryKey: proxyKeys.myProxies(params),
    queryFn: () => getMyProxies(params),
    schema: PaginatedProxiesResponseSchema,
    staleTime: StaleTimeConfig.proxies,
  });
};

/**
 * 获取代理详情
 */
export const useProxyDetail = (id: string, options?: { enabled?: boolean }) => {
  return useValidatedQuery<ProxyRecord>({
    queryKey: proxyKeys.detail(id),
    queryFn: () => getProxyDetail(id),
    schema: ProxySchema,
    enabled: options?.enabled !== false && !!id,
    staleTime: StaleTimeConfig.proxies,
  });
};

/**
 * 获取我的代理统计
 */
export const useMyProxyStats = () => {
  return useValidatedQuery<ProxyStats>({
    queryKey: proxyKeys.stats(),
    queryFn: getMyProxyStats,
    schema: ProxyStatsSchema,
    staleTime: StaleTimeConfig.proxyStats,
    refetchInterval: RefetchIntervalConfig.normal,
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
  return useValidatedQuery<ProxyRecord[]>({
    queryKey: proxyKeys.available(params),
    queryFn: () => getAvailableProxies(params),
    schema: ProxiesSchema,
    staleTime: StaleTimeConfig.proxies,
  });
};

// 代理使用历史 Schema
const ProxyUsageHistorySchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    proxyId: z.string(),
    bytesIn: z.number().optional(),
    bytesOut: z.number().optional(),
    requestCount: z.number().optional(),
    date: z.string().optional(),
    createdAt: z.string().optional(),
  }).passthrough()),
  meta: z.object({
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
  }),
});

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
  return useValidatedQuery<ProxyUsageHistoryResponse>({
    queryKey: proxyKeys.usage(params),
    queryFn: () => getProxyUsageHistory(params),
    schema: ProxyUsageHistorySchema,
    staleTime: StaleTimeConfig.proxies,
  });
};

// ==================== Mutation Hooks ====================

/**
 * 获取代理 (分配新代理)
 */
export const useAcquireProxy = () => {
  const queryClient = useQueryClient();

  return useMutation<ProxyRecord, Error, Parameters<typeof acquireProxy>[0]>({
    mutationFn: acquireProxy,
    onSuccess: () => {
      handleMutationSuccess('代理获取成功');
      queryClient.invalidateQueries({ queryKey: proxyKeys.myProxies() });
      queryClient.invalidateQueries({ queryKey: proxyKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '代理获取失败');
    },
  });
};

/**
 * 释放代理
 */
export const useReleaseProxy = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: releaseProxy,
    onSuccess: () => {
      handleMutationSuccess('代理释放成功');
      queryClient.invalidateQueries({ queryKey: proxyKeys.myProxies() });
      queryClient.invalidateQueries({ queryKey: proxyKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '代理释放失败');
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
    onSuccess: () => {
      handleMutationSuccess('批量释放成功');
      queryClient.invalidateQueries({ queryKey: proxyKeys.myProxies() });
      queryClient.invalidateQueries({ queryKey: proxyKeys.stats() });
    },
    onError: (error: Error) => {
      handleMutationError(error, '批量释放失败');
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
      renewProxy(proxyId, duration ?? 30),
    onSuccess: (_: void, variables: { proxyId: string; duration?: number }) => {
      handleMutationSuccess('代理续期成功');
      queryClient.invalidateQueries({ queryKey: proxyKeys.myProxies() });
      queryClient.invalidateQueries({ queryKey: proxyKeys.detail(variables.proxyId) });
    },
    onError: (error: Error) => {
      handleMutationError(error, '代理续期失败');
    },
  });
};

/**
 * 测试代理
 */
export const useTestProxy = () => {
  return useMutation<
    { success: boolean; responseTime?: number; error?: string },
    Error,
    string
  >({
    mutationFn: testProxy,
    onSuccess: (result) => {
      if (result.success) {
        handleMutationSuccess(`代理测试成功 - 响应时间: ${result.responseTime}ms`);
      } else {
        handleMutationError(new Error(result.error), '代理测试失败');
      }
    },
    onError: (error) => {
      handleMutationError(error, '代理测试失败');
    },
  });
};

/**
 * 报告代理问题
 */
export const useReportProxyIssue = () => {
  return useMutation<void, Error, {
    proxyId: string;
    issue: string;
    description?: string;
  }>({
    mutationFn: ({ proxyId, issue, description }) => reportProxyIssue(proxyId, issue, description),
    onSuccess: () => {
      handleMutationSuccess('问题报告已提交');
    },
    onError: (error) => {
      handleMutationError(error, '问题报告提交失败');
    },
  });
};
