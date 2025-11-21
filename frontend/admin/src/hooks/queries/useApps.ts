/**
 * Apps React Query Hooks
 *
 * 基于 @/services/app
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { message } from 'antd';
import * as appService from '@/services/app';
import { useValidatedQuery } from './useValidatedQuery';
import {
  ApplicationSchema,
  PaginatedResponseSchema,
  CursorPaginatedResponseSchema,
  DeviceApplicationSchema,
  AppStatsSchema,
  AppReviewRecordSchema,
} from '@/schemas/api.schemas';
import type {
  Application,
  InstallAppDto,
  PaginationParams,
  CursorPaginationParams,
  ApproveAppDto,
  RejectAppDto,
  RequestChangesDto,
} from '@/types';

/**
 * Query Keys
 */
export const appKeys = {
  all: ['apps'] as const,
  lists: () => [...appKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...appKeys.lists(), params] as const,
  listCursor: (params?: CursorPaginationParams) => [...appKeys.lists(), 'cursor', params] as const,
  details: () => [...appKeys.all, 'detail'] as const,
  detail: (id: string) => [...appKeys.details(), id] as const,
  stats: () => [...appKeys.all, 'stats'] as const,
  pending: () => [...appKeys.all, 'pending'] as const,
  pendingList: (params?: PaginationParams) => [...appKeys.pending(), params] as const,
  deviceApps: (deviceId: string) => [...appKeys.all, 'device', deviceId] as const,
  reviews: () => [...appKeys.all, 'reviews'] as const,
  reviewList: (params?: PaginationParams & { applicationId?: string }) => [...appKeys.reviews(), params] as const,
  reviewHistory: (applicationId: string) => [...appKeys.reviews(), 'history', applicationId] as const,
};

/**
 * 获取应用列表 (传统分页)
 */
export const useApps = (params?: PaginationParams) => {
  return useValidatedQuery({
    queryKey: appKeys.list(params),
    queryFn: () => appService.getApps(params),
    schema: PaginatedResponseSchema(ApplicationSchema),
  });
};

/**
 * 获取应用列表 (游标分页 - 高性能)
 */
export const useAppsCursor = (
  params?: CursorPaginationParams & {
    tenantId?: string;
    category?: string;
  }
) => {
  return useValidatedQuery({
    queryKey: appKeys.listCursor(params),
    queryFn: () => appService.getAppsCursor(params),
    schema: CursorPaginatedResponseSchema(ApplicationSchema),
  });
};

/**
 * 获取应用详情
 */
export const useApp = (id: string, options?: Omit<UseQueryOptions<Application, Error>, 'queryKey' | 'queryFn'>) => {
  return useValidatedQuery({
    queryKey: appKeys.detail(id),
    queryFn: () => appService.getApp(id),
    schema: ApplicationSchema,
    ...options,
  });
};

/**
 * 获取应用统计
 */
export const useAppStats = () => {
  return useValidatedQuery({
    queryKey: appKeys.stats(),
    queryFn: () => appService.getAppStats(),
    schema: AppStatsSchema,
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 获取待审核应用列表
 */
export const usePendingApps = (params?: PaginationParams) => {
  return useValidatedQuery({
    queryKey: appKeys.pendingList(params),
    queryFn: () => appService.getPendingApps(params),
    schema: PaginatedResponseSchema(ApplicationSchema),
    refetchInterval: 30 * 1000, // 每30秒自动刷新
  });
};

/**
 * 获取设备已安装应用
 */
export const useDeviceApps = (deviceId: string) => {
  return useValidatedQuery({
    queryKey: appKeys.deviceApps(deviceId),
    queryFn: () => appService.getDeviceApps(deviceId),
    schema: PaginatedResponseSchema(DeviceApplicationSchema),
  });
};

/**
 * 获取应用审核记录
 */
export const useAppReviewRecords = (params?: PaginationParams & { applicationId?: string }) => {
  return useValidatedQuery({
    queryKey: appKeys.reviewList(params),
    queryFn: () => appService.getAppReviewRecords(params),
    schema: PaginatedResponseSchema(AppReviewRecordSchema),
  });
};

/**
 * 获取应用审核历史
 */
export const useAppReviewHistory = (applicationId: string) => {
  return useValidatedQuery({
    queryKey: appKeys.reviewHistory(applicationId),
    queryFn: () => appService.getAppReviewHistory(applicationId),
    schema: PaginatedResponseSchema(AppReviewRecordSchema),
  });
};

/**
 * 上传应用 Mutation
 */
export const useUploadApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (percent: number) => void }) =>
      appService.uploadApp(file, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appKeys.lists() });
      message.success('应用上传成功');
    },
    onError: () => {
      message.error('应用上传失败');
    },
  });
};

/**
 * 更新应用 Mutation
 */
export const useUpdateApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Application> }) =>
      appService.updateApp(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: appKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appKeys.detail(id) });
      message.success('应用更新成功');
    },
    onError: () => {
      message.error('应用更新失败');
    },
  });
};

/**
 * 删除应用 Mutation
 */
export const useDeleteApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appService.deleteApp(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appKeys.stats() });
      message.success('应用删除成功');
    },
    onError: () => {
      message.error('应用删除失败');
    },
  });
};

/**
 * 发布应用 Mutation
 */
export const usePublishApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appService.publishApp(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: appKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: appKeys.stats() });
      message.success('应用发布成功');
    },
    onError: () => {
      message.error('应用发布失败');
    },
  });
};

/**
 * 取消发布应用 Mutation
 */
export const useUnpublishApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appService.unpublishApp(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: appKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appKeys.detail(id) });
      message.success('应用已取消发布');
    },
    onError: () => {
      message.error('取消发布失败');
    },
  });
};

/**
 * 安装应用到设备 Mutation
 */
export const useInstallAppToDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InstallAppDto) => appService.installAppToDevice(data),
    onSuccess: (_, { deviceId }) => {
      queryClient.invalidateQueries({ queryKey: appKeys.deviceApps(deviceId) });
      message.success('应用安装任务已提交');
    },
    onError: () => {
      message.error('应用安装失败');
    },
  });
};

/**
 * 从设备卸载应用 Mutation
 */
export const useUninstallAppFromDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deviceId, applicationId }: { deviceId: string; applicationId: string }) =>
      appService.uninstallAppFromDevice(deviceId, applicationId),
    onSuccess: (_, { deviceId }) => {
      queryClient.invalidateQueries({ queryKey: appKeys.deviceApps(deviceId) });
      message.success('应用卸载任务已提交');
    },
    onError: () => {
      message.error('应用卸载失败');
    },
  });
};

/**
 * 提交应用审核 Mutation
 */
export const useSubmitAppForReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appService.submitAppForReview(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: appKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: appKeys.pending() });
      message.success('已提交审核');
    },
    onError: () => {
      message.error('提交审核失败');
    },
  });
};

/**
 * 审核通过应用 Mutation
 */
export const useApproveApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ApproveAppDto }) =>
      appService.approveApp(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: appKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: appKeys.pending() });
      queryClient.invalidateQueries({ queryKey: appKeys.reviews() });
      message.success('审核通过');
    },
    onError: () => {
      message.error('审核操作失败');
    },
  });
};

/**
 * 拒绝应用 Mutation
 */
export const useRejectApp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectAppDto }) =>
      appService.rejectApp(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: appKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: appKeys.pending() });
      queryClient.invalidateQueries({ queryKey: appKeys.reviews() });
      message.success('已拒绝');
    },
    onError: () => {
      message.error('拒绝操作失败');
    },
  });
};

/**
 * 请求修改应用 Mutation
 */
export const useRequestAppChanges = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RequestChangesDto }) =>
      appService.requestAppChanges(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: appKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: appKeys.pending() });
      queryClient.invalidateQueries({ queryKey: appKeys.reviews() });
      message.success('已请求修改');
    },
    onError: () => {
      message.error('请求修改失败');
    },
  });
};
