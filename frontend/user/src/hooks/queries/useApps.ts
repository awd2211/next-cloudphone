/**
 * 应用管理 React Query Hooks (用户端)
 *
 * 提供应用市场、已安装应用管理功能
 * ✅ 使用 Zod Schema 验证 API 响应
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PaginationParams, Application, PaginatedResponse } from '@/types';
import type { InstalledAppInfo } from '@/services/app';
import * as appService from '@/services/app';
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig } from '../utils/cacheConfig';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import { AppSchema, PaginatedAppsResponseSchema } from '@/schemas/api.schemas';
import { z } from 'zod';

// 已安装应用 Schema
const InstalledAppSchema = z.object({
  packageName: z.string(),
  appName: z.string(),
  versionName: z.string().optional(),
  versionCode: z.number().optional(),
  installedAt: z.string().optional(),
});
const InstalledAppsSchema = z.array(InstalledAppSchema);

// ==================== Query Keys ====================

export const appKeys = {
  all: ['apps'] as const,
  lists: () => [...appKeys.all, 'list'] as const,
  list: (params?: any) => [...appKeys.lists(), params] as const,
  details: () => [...appKeys.all, 'detail'] as const,
  detail: (id: string) => [...appKeys.details(), id] as const,
  installed: (deviceId: string) => [...appKeys.all, 'installed', deviceId] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取应用市场列表
 */
export const useApps = (params?: PaginationParams & { category?: string; search?: string }) => {
  return useValidatedQuery<PaginatedResponse<Application>>({
    queryKey: appKeys.list(params),
    queryFn: () => appService.getApps(params),
    schema: PaginatedAppsResponseSchema,
    staleTime: StaleTimeConfig.appMarket,
  });
};

/**
 * 获取应用详情
 */
export const useApp = (id: string, options?: { enabled?: boolean }) => {
  return useValidatedQuery<Application>({
    queryKey: appKeys.detail(id),
    queryFn: () => appService.getApp(id),
    schema: AppSchema,
    enabled: options?.enabled !== false && !!id,
    staleTime: StaleTimeConfig.appMarket,
  });
};

/**
 * 获取设备已安装应用列表
 */
export const useInstalledApps = (deviceId: string, options?: { enabled?: boolean }) => {
  return useValidatedQuery<InstalledAppInfo[]>({
    queryKey: appKeys.installed(deviceId),
    queryFn: () => appService.getInstalledApps(deviceId),
    schema: InstalledAppsSchema,
    enabled: options?.enabled !== false && !!deviceId,
    staleTime: StaleTimeConfig.installedApps,
  });
};

// ==================== Mutation Hooks ====================

/**
 * 安装应用到设备
 */
export const useInstallApp = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, { deviceId: string; appId: string }>({
    mutationFn: ({ deviceId, appId }) => appService.installAppToDevice(deviceId, appId),
    onSuccess: (_, variables) => {
      handleMutationSuccess('应用安装中...');
      // 刷新已安装应用列表
      queryClient.invalidateQueries({ queryKey: appKeys.installed(variables.deviceId) });
    },
    onError: (error) => {
      handleMutationError(error, '应用安装失败');
    },
  });
};

/**
 * 卸载应用
 */
export const useUninstallApp = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, { deviceId: string; packageName: string }>({
    mutationFn: ({ deviceId, packageName }) => appService.uninstallApp(deviceId, packageName),
    onSuccess: (_, variables) => {
      handleMutationSuccess('应用卸载成功');
      // 刷新已安装应用列表
      queryClient.invalidateQueries({ queryKey: appKeys.installed(variables.deviceId) });
    },
    onError: (error) => {
      handleMutationError(error, '应用卸载失败');
    },
  });
};

/**
 * 批量卸载应用
 */
export const useBatchUninstallApps = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deviceId, packageNames }: { deviceId: string; packageNames: string[] }) =>
      appService.batchUninstallApps(deviceId, { packageNames }),
    onSuccess: (_: unknown, variables: { deviceId: string; packageNames: string[] }) => {
      handleMutationSuccess('批量卸载成功');
      // 刷新已安装应用列表
      queryClient.invalidateQueries({ queryKey: appKeys.installed(variables.deviceId) });
    },
    onError: (error: Error) => {
      handleMutationError(error, '批量卸载失败');
    },
  });
};

/**
 * 更新应用
 */
export const useUpdateApp = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, { deviceId: string; packageName: string }>({
    mutationFn: ({ deviceId, packageName }) => appService.updateApp(deviceId, packageName),
    onSuccess: (_, variables) => {
      handleMutationSuccess('应用更新中...');
      // 刷新已安装应用列表
      queryClient.invalidateQueries({ queryKey: appKeys.installed(variables.deviceId) });
    },
    onError: (error) => {
      handleMutationError(error, '应用更新失败');
    },
  });
};
