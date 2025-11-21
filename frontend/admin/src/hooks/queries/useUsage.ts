/**
 * Usage & Metering React Query Hooks
 *
 * 提供使用记录、计量统计等功能的 React Query Hooks
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { message } from 'antd';
import {
  getAdminUsageRecords,
  getAdminUsageStats,
  exportAdminUsageRecords,
  getUserUsageStats,
  getDeviceUsageStats,
  getMeteringOverview,
  getUserMeterings,
  getDeviceMeterings,
  getMeteringTrend,
  getResourceUsageAnalysis,
  getUsageTrend,
} from '@/services/billing';
import {
  UsageRecordsResponseSchema,
  AdminUsageStatsResponseSchema,
} from '@/schemas/api.schemas';

// ==================== Query Keys ====================

export const usageKeys = {
  all: ['usage'] as const,
  lists: () => [...usageKeys.all, 'list'] as const,
  list: (params?: {
    page?: number;
    pageSize?: number;
    userId?: string;
    deviceId?: string;
    status?: 'active' | 'completed';
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => [...usageKeys.lists(), params] as const,
  stats: () => [...usageKeys.all, 'stats'] as const,
  adminStats: (params?: {
    userId?: string;
    deviceId?: string;
    status?: 'active' | 'completed';
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => [...usageKeys.stats(), 'admin', params] as const,
  userStats: (userId: string, startDate?: string, endDate?: string) =>
    [...usageKeys.stats(), 'user', userId, { startDate, endDate }] as const,
  deviceStats: (deviceId: string, startDate?: string, endDate?: string) =>
    [...usageKeys.stats(), 'device', deviceId, { startDate, endDate }] as const,
  trend: (startDate: string, endDate: string) =>
    [...usageKeys.all, 'trend', { startDate, endDate }] as const,
  metering: () => [...usageKeys.all, 'metering'] as const,
  meteringOverview: () => [...usageKeys.metering(), 'overview'] as const,
  userMeterings: (params: { userId: string; startDate?: string; endDate?: string }) =>
    [...usageKeys.metering(), 'user', params] as const,
  deviceMeterings: (params: { deviceId: string; startDate?: string; endDate?: string }) =>
    [...usageKeys.metering(), 'device', params] as const,
};

// ==================== 使用记录查询 ====================

/**
 * 获取管理员使用记录列表（分页）
 */
export function useAdminUsageRecords(params?: {
  page?: number;
  pageSize?: number;
  userId?: string;
  deviceId?: string;
  status?: 'active' | 'completed';
  startDate?: string;
  endDate?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: usageKeys.list(params),
    queryFn: async () => {
      const response = await getAdminUsageRecords(params || {});
      const validated = UsageRecordsResponseSchema.parse(response);
      return validated;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * 向后兼容：别名
 */
export const useUsageRecords = useAdminUsageRecords;

/**
 * 获取管理员使用统计
 */
export function useAdminUsageStats(params?: {
  userId?: string;
  deviceId?: string;
  status?: 'active' | 'completed';
  startDate?: string;
  endDate?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: usageKeys.adminStats(params),
    queryFn: async () => {
      const response = await getAdminUsageStats(params);
      const validated = AdminUsageStatsResponseSchema.parse(response);
      return validated.data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * 获取用户使用统计
 */
export function useUserUsageStats(
  userId: string,
  startDate?: string,
  endDate?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: usageKeys.userStats(userId, startDate, endDate),
    queryFn: () => getUserUsageStats(userId, startDate, endDate),
    enabled: options?.enabled !== false && !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * 获取设备使用统计
 */
export function useDeviceUsageStats(
  deviceId: string,
  startDate?: string,
  endDate?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: usageKeys.deviceStats(deviceId, startDate, endDate),
    queryFn: () => getDeviceUsageStats(deviceId, startDate, endDate),
    enabled: options?.enabled !== false && !!deviceId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * 获取使用趋势
 */
export function useUsageTrend(startDate: string, endDate: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: usageKeys.trend(startDate, endDate),
    queryFn: () => getUsageTrend(startDate, endDate),
    enabled: options?.enabled !== false && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ==================== 计量查询 ====================

/**
 * 获取计量概览
 */
export function useMeteringOverview() {
  return useQuery({
    queryKey: usageKeys.meteringOverview(),
    queryFn: getMeteringOverview,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * 获取用户计量数据
 */
export function useUserMeterings(params: {
  userId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: usageKeys.userMeterings(params),
    queryFn: () => getUserMeterings(params),
    enabled: !!params.userId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * 获取设备计量数据
 */
export function useDeviceMeterings(params: {
  deviceId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: usageKeys.deviceMeterings(params),
    queryFn: () => getDeviceMeterings(params),
    enabled: !!params.deviceId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * 获取计量趋势
 */
export function useMeteringTrend(
  type: 'daily' | 'weekly' | 'monthly',
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: [...usageKeys.metering(), 'trend', { type, startDate, endDate }] as const,
    queryFn: () => getMeteringTrend(type, startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * 获取资源使用分析
 */
export function useResourceUsageAnalysis(
  resourceType?: 'cpu' | 'memory' | 'storage' | 'bandwidth'
) {
  return useQuery({
    queryKey: [...usageKeys.metering(), 'resource-analysis', resourceType] as const,
    queryFn: () => getResourceUsageAnalysis(resourceType),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ==================== 导出操作 ====================

/**
 * 导出管理员使用记录
 */
export function useExportAdminUsageRecords() {
  return useMutation({
    mutationFn: (params: {
      userId?: string;
      deviceId?: string;
      status?: 'active' | 'completed';
      startDate?: string;
      endDate?: string;
      format?: 'csv' | 'excel';
    }) => exportAdminUsageRecords(params),
    onSuccess: () => {
      message.success('使用记录导出成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '使用记录导出失败');
    },
  });
}
