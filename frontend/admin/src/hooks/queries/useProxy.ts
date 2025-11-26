import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  // 代理池管理
  getProxyList,
  getProxyStats,
  testProxy,
  refreshProxyPool,
  releaseProxy,
  batchReleaseProxies,
  batchTestProxies,
  // 供应商管理
  getProxyProviders,
  getProxyProvider,
  getProxyProviderConfig,
  createProxyProvider,
  updateProxyProvider,
  deleteProxyProvider,
  toggleProxyProvider,
  testProxyProvider,
  getProxyProviderRanking,
  // 报表
  getProxyUsageReport,
  exportProxyUsageReport,
  getProxyCostReport,
  exportProxyCostReport,
  // 代理信息解析
  parseProxyInfo,
  parseAllProxyInfo,
  // 类型
  type ProxyListParams,
  type ProxyListResponse,
  type ProxyRecord,
  type ProxyStats,
  type ProxyCostReport,
  type ProxyProvider,
  type ProxyProviderRanking,
  type CreateProxyProviderDto,
  type ProxyUsageReport,
  type ProxyParsedInfo,
} from '@/services/proxy';

/**
 * Proxy 代理管理 React Query Hooks (管理员后台)
 *
 * 提供完整的代理池管理、监控、统计功能
 */

// ==================== 导出类型 ====================

export type {
  ProxyListParams,
  ProxyListResponse,
  ProxyRecord,
  ProxyStats,
  ProxyCostReport,
  ProxyProvider,
  ProxyProviderRanking,
  CreateProxyProviderDto,
  ProxyUsageReport,
  ProxyParsedInfo,
};

// ==================== Query Keys ====================

export const proxyKeys = {
  all: ['proxy'] as const,
  lists: () => [...proxyKeys.all, 'list'] as const,
  list: (params?: ProxyListParams) => [...proxyKeys.lists(), params] as const,
  stats: () => [...proxyKeys.all, 'stats'] as const,
  costReport: (params?: any) => [...proxyKeys.all, 'cost-report', params] as const,
  usageReport: (params?: any) => [...proxyKeys.all, 'usage-report', params] as const,
  providers: () => [...proxyKeys.all, 'providers'] as const,
  provider: (id: string) => [...proxyKeys.providers(), id] as const,
  providerConfig: (id: string) => [...proxyKeys.providers(), id, 'config'] as const,
  providerRanking: () => [...proxyKeys.providers(), 'ranking'] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取代理列表
 */
export const useProxyList = (params?: ProxyListParams) => {
  return useQuery<ProxyListResponse>({
    queryKey: proxyKeys.list(params),
    queryFn: () => getProxyList(params),
  });
};

/**
 * 获取代理池统计
 */
export const useProxyStats = () => {
  return useQuery<ProxyStats>({
    queryKey: proxyKeys.stats(),
    queryFn: getProxyStats,
    refetchInterval: 60000, // 代理池统计 - 中等实时性
  });
};

/**
 * 获取成本报告
 */
export const useProxyCostReport = (params: {
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
  provider?: string;
}) => {
  return useQuery<ProxyCostReport>({
    queryKey: proxyKeys.costReport(params),
    queryFn: () => getProxyCostReport(params),
  });
};

/**
 * 获取使用报告
 */
export const useProxyUsageReport = (params: {
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
  provider?: string;
  country?: string;
}) => {
  return useQuery<ProxyUsageReport>({
    queryKey: proxyKeys.usageReport(params),
    queryFn: () => getProxyUsageReport(params),
  });
};

// ==================== Mutation Hooks ====================

/**
 * 批量释放代理
 */
export const useBatchReleaseProxies = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchReleaseProxies,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: proxyKeys.stats() });
      message.success('代理批量释放成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '代理批量释放失败');
    },
  });
};

/**
 * 批量测试代理
 */
export const useBatchTestProxies = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchTestProxies,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.lists() });
      message.success('代理批量测试成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '代理批量测试失败');
    },
  });
};

/**
 * 测试代理
 */
export const useTestProxy = () => {
  return useMutation({
    mutationFn: testProxy,
    onSuccess: () => {
      message.success('代理测试成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '代理测试失败');
    },
  });
};

/**
 * 刷新代理池
 */
export const useRefreshProxyPool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: refreshProxyPool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: proxyKeys.stats() });
      message.success('代理池刷新成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '代理池刷新失败');
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
      queryClient.invalidateQueries({ queryKey: proxyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: proxyKeys.stats() });
      message.success('代理释放成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '代理释放失败');
    },
  });
};

/**
 * 导出使用报表
 */
export const useExportProxyUsageReport = () => {
  return useMutation({
    mutationFn: exportProxyUsageReport,
    onSuccess: () => {
      message.success('使用报表导出成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '使用报表导出失败');
    },
  });
};

/**
 * 导出成本报表
 */
export const useExportProxyCostReport = () => {
  return useMutation({
    mutationFn: exportProxyCostReport,
    onSuccess: () => {
      message.success('成本报表导出成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '成本报表导出失败');
    },
  });
};

// ==================== Proxy Provider Hooks ====================

/**
 * 获取代理供应商列表
 */
export const useProxyProviders = () => {
  return useQuery<ProxyProvider[]>({
    queryKey: proxyKeys.providers(),
    queryFn: getProxyProviders,
  });
};

/**
 * 获取代理供应商详情
 */
export const useProxyProvider = (id: string, options?: { enabled?: boolean }) => {
  return useQuery<ProxyProvider>({
    queryKey: proxyKeys.provider(id),
    queryFn: () => getProxyProvider(id),
    enabled: options?.enabled !== false && !!id,
  });
};

/**
 * 获取供应商的解密配置（用于编辑）
 */
export const useProxyProviderConfig = (id: string, options?: { enabled?: boolean }) => {
  return useQuery<Record<string, any>>({
    queryKey: proxyKeys.providerConfig(id),
    queryFn: () => getProxyProviderConfig(id),
    enabled: options?.enabled !== false && !!id,
  });
};

/**
 * 获取供应商排名
 */
export const useProxyProviderRanking = () => {
  return useQuery<ProxyProviderRanking[]>({
    queryKey: proxyKeys.providerRanking(),
    queryFn: getProxyProviderRanking,
    refetchInterval: 60000, // 供应商排名 - 中等实时性
  });
};

/**
 * 创建代理供应商
 */
export const useCreateProxyProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProxyProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.providers() });
      message.success('供应商创建成功');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || error?.message || '供应商创建失败');
    },
  });
};

/**
 * 更新代理供应商
 */
export const useUpdateProxyProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProxyProviderDto> }) =>
      updateProxyProvider(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.providers() });
      queryClient.invalidateQueries({ queryKey: proxyKeys.provider(variables.id) });
      message.success('供应商更新成功');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || error?.message || '供应商更新失败');
    },
  });
};

/**
 * 删除代理供应商
 */
export const useDeleteProxyProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProxyProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.providers() });
      message.success('供应商删除成功');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || error?.message || '供应商删除失败');
    },
  });
};

/**
 * 切换供应商启用状态
 */
export const useToggleProxyProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      toggleProxyProvider(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.providers() });
      message.success('状态切换成功');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || error?.message || '状态切换失败');
    },
  });
};

/**
 * 测试供应商连接
 */
export const useTestProxyProvider = () => {
  return useMutation({
    mutationFn: testProxyProvider,
    onSuccess: () => {
      message.success('连接测试成功');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || error?.message || '测试失败');
    },
  });
};

// ==================== 代理信息解析 Hooks ====================

/**
 * 解析单个代理信息（从 URL/配置解析，不进行网络检测）
 */
export const useParseProxyInfo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: parseProxyInfo,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.lists() });
      const typeDisplay = data?.parsedInfo?.proxyType || '未知';
      const country = data?.parsedInfo?.countryName || data?.parsedInfo?.country || '未知';
      message.success(`解析完成: ${typeDisplay} · ${country}`);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || error?.message || '信息解析失败');
    },
  });
};

/**
 * 批量解析所有代理信息（即时解析，不进行网络检测）
 */
export const useParseAllProxyInfo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: parseAllProxyInfo,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.lists() });
      const typeStats = data?.byType
        ? Object.entries(data.byType).map(([k, v]) => `${k}: ${v}`).join(', ')
        : '';
      message.success(`批量解析完成，共 ${data?.parsed || 0} 个代理。${typeStats}`);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || error?.message || '批量解析失败');
    },
  });
};
