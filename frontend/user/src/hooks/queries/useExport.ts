/**
 * 导出中心 React Query Hooks (用户端)
 *
 * 提供导出任务的创建、查询、下载、管理功能
 * ✅ 使用 Zod Schema 验证 API 响应
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import type {
  ExportTask,
  ExportRequest,
  ExportTaskListQuery,
  ExportTaskListResponse as ServiceExportTaskListResponse,
  ExportStats as ServiceExportStats,
} from '@/services/export';
import * as exportService from '@/services/export';

// 重新导出 service 类型供 pages 使用
export type { ExportTask, ExportRequest, ExportTaskListQuery } from '@/services/export';
export type ExportStats = ServiceExportStats;
export type ExportTasksResponse = ServiceExportTaskListResponse;
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig } from '../utils/cacheConfig';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import { ExportTaskSchema } from '@/schemas/api.schemas';
import { z } from 'zod';

// 导出任务列表响应 Schema
const ExportTasksResponseSchema = z.object({
  items: z.array(ExportTaskSchema),
  total: z.number().int(),
});

// 导出统计 Schema
const ExportStatsSchema = z.object({
  totalTasks: z.number().int().nonnegative().optional(),
  pendingTasks: z.number().int().nonnegative().optional(),
  processingTasks: z.number().int().nonnegative().optional(),
  completedTasks: z.number().int().nonnegative().optional(),
  failedTasks: z.number().int().nonnegative().optional(),
  totalSize: z.number().nonnegative().optional(),
}).passthrough();


// ==================== Query Keys ====================

export const exportKeys = {
  all: ['exports'] as const,
  lists: () => [...exportKeys.all, 'list'] as const,
  list: (params?: ExportTaskListQuery) => [...exportKeys.lists(), params] as const,
  stats: () => [...exportKeys.all, 'stats'] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取导出任务列表
 */
export const useExportTasks = (params?: ExportTaskListQuery) => {
  return useValidatedQuery<ServiceExportTaskListResponse>({
    queryKey: exportKeys.list(params),
    queryFn: () => exportService.getExportTasks(params),
    schema: ExportTasksResponseSchema,
    staleTime: StaleTimeConfig.MEDIUM, // 30秒
    placeholderData: (previousData: ServiceExportTaskListResponse | undefined) => previousData,
  });
};

/**
 * 获取导出统计
 */
export const useExportStats = () => {
  return useValidatedQuery<ServiceExportStats>({
    queryKey: exportKeys.stats(),
    queryFn: () => exportService.getExportStats(),
    schema: ExportStatsSchema,
    staleTime: StaleTimeConfig.MEDIUM, // 30秒
  });
};

// ==================== Mutation Hooks ====================

/**
 * 创建导出任务
 */
export const useCreateExportTask = () => {
  const queryClient = useQueryClient();

  return useMutation<ExportTask, unknown, ExportRequest>({
    mutationFn: (data) => exportService.createExportTask(data),
    onSuccess: () => {
      handleMutationSuccess('导出任务创建成功');
      queryClient.invalidateQueries({ queryKey: exportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: exportKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '导出任务创建失败');
    },
  });
};

/**
 * 下载导出文件
 */
export const useDownloadExportFile = () => {
  return useMutation<Blob, unknown, { taskId: string; fileName: string }>({
    mutationFn: ({ taskId }) => exportService.downloadExportFile(taskId),
    onMutate: () => {
      message.loading({ content: '正在下载...', key: 'download-export' });
    },
    onSuccess: (blob, { fileName }) => {
      exportService.triggerDownload(blob, fileName);
      message.success({ content: '下载成功！', key: 'download-export' });
    },
    onError: (_error: unknown) => {
      message.error({
        content: '下载失败',
        key: 'download-export',
      });
    },
  });
};

/**
 * 重试导出任务
 */
export const useRetryExportTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => exportService.retryExportTask(taskId),
    onSuccess: () => {
      handleMutationSuccess('任务已重新开始');
      queryClient.invalidateQueries({ queryKey: exportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: exportKeys.stats() });
    },
    onError: (error: Error) => {
      handleMutationError(error, '重试失败');
    },
  });
};

/**
 * 删除单个导出任务
 */
export const useDeleteExportTask = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string>({
    mutationFn: (taskId) => exportService.deleteExportTask(taskId),
    onSuccess: () => {
      handleMutationSuccess('任务删除成功');
      queryClient.invalidateQueries({ queryKey: exportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: exportKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '任务删除失败');
    },
  });
};

/**
 * 批量删除导出任务
 */
export const useDeleteExportTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskIds: string[]) => exportService.deleteExportTasks(taskIds),
    onSuccess: () => {
      handleMutationSuccess('批量删除成功');
      queryClient.invalidateQueries({ queryKey: exportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: exportKeys.stats() });
    },
    onError: (error: Error) => {
      handleMutationError(error, '批量删除失败');
    },
  });
};

/**
 * 清除已完成的任务
 */
export const useClearCompletedTasks = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, void>({
    mutationFn: () => exportService.clearCompletedTasks(),
    onSuccess: () => {
      handleMutationSuccess('已完成的任务已清除');
      queryClient.invalidateQueries({ queryKey: exportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: exportKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '清除失败');
    },
  });
};

/**
 * 清除失败的任务
 */
export const useClearFailedTasks = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, void>({
    mutationFn: () => exportService.clearFailedTasks(),
    onSuccess: () => {
      handleMutationSuccess('失败的任务已清除');
      queryClient.invalidateQueries({ queryKey: exportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: exportKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '清除失败');
    },
  });
};
