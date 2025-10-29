import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as appService from '@/services/app';
import type { App, CreateAppDto, UpdateAppDto, PaginationParams } from '@/types';

/**
 * App Query Keys
 */
export const appKeys = {
  all: ['apps'] as const,
  lists: () => [...appKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...appKeys.lists(), params] as const,
  details: () => [...appKeys.all, 'detail'] as const,
  detail: (id: string) => [...appKeys.details(), id] as const,
  stats: () => [...appKeys.all, 'stats'] as const,
};

/**
 * 获取应用列表
 */
export function useApps(params?: PaginationParams) {
  return useQuery({
    queryKey: appKeys.list(params),
    queryFn: () => appService.getApps(params),
    staleTime: 30 * 1000,
  });
}

/**
 * 获取应用详情
 */
export function useApp(id: string) {
  return useQuery({
    queryKey: appKeys.detail(id),
    queryFn: () => appService.getApp(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * 获取应用统计
 */
export function useAppStats() {
  return useQuery({
    queryKey: appKeys.stats(),
    queryFn: () => appService.getAppStats(),
    staleTime: 60 * 1000,
  });
}

/**
 * 上传应用
 */
export function useUploadApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => appService.uploadApp(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appKeys.stats() });
      message.success('应用上传成功');
    },
    onError: (error: any) => {
      message.error(`上传失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 更新应用
 */
export function useUpdateApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppDto }) =>
      appService.updateApp(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: appKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: appKeys.lists() });
      message.success('应用更新成功');
    },
    onError: (error: any) => {
      message.error(`更新失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 删除应用
 */
export function useDeleteApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: appService.deleteApp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appKeys.stats() });
      message.success('应用删除成功');
    },
    onError: (error: any) => {
      message.error(`删除失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 发布应用
 */
export function usePublishApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: appService.publishApp,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: appKeys.detail(id) });

      const previousApp = queryClient.getQueryData<App>(appKeys.detail(id));

      if (previousApp) {
        queryClient.setQueryData<App>(appKeys.detail(id), {
          ...previousApp,
          status: 'published',
        });
      }

      return { previousApp };
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: appKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: appKeys.lists() });
      message.success('应用发布成功');
    },
    onError: (error: any, id, context) => {
      if (context?.previousApp) {
        queryClient.setQueryData(appKeys.detail(id), context.previousApp);
      }
      message.error(`发布失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 下架应用
 */
export function useUnpublishApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: appService.unpublishApp,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: appKeys.detail(id) });

      const previousApp = queryClient.getQueryData<App>(appKeys.detail(id));

      if (previousApp) {
        queryClient.setQueryData<App>(appKeys.detail(id), {
          ...previousApp,
          status: 'draft',
        });
      }

      return { previousApp };
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: appKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: appKeys.lists() });
      message.success('应用下架成功');
    },
    onError: (error: any, id, context) => {
      if (context?.previousApp) {
        queryClient.setQueryData(appKeys.detail(id), context.previousApp);
      }
      message.error(`下架失败: ${error.response?.data?.message || error.message}`);
    },
  });
}
