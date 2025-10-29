import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  getTemplates,
  getPopularTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createDeviceFromTemplate,
  batchCreateDevicesFromTemplate,
  getTemplateStats,
} from '@/services/template';
import type { CreateTemplateDto } from '@/types';

// Query Keys
export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (params?: any) => [...templateKeys.lists(), params] as const,
  popular: () => [...templateKeys.all, 'popular'] as const,
  stats: () => [...templateKeys.all, 'stats'] as const,
};

// Queries
export function useTemplates(params?: any) {
  return useQuery({
    queryKey: templateKeys.list(params),
    queryFn: async () => {
      const response = await getTemplates(params || {});
      return {
        data: response.data,
        total: response.total,
      };
    },
    staleTime: 30 * 1000,
  });
}

export function usePopularTemplates() {
  return useQuery({
    queryKey: templateKeys.popular(),
    queryFn: () => getPopularTemplates(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTemplateStats() {
  return useQuery({
    queryKey: templateKeys.stats(),
    queryFn: () => getTemplateStats(),
    staleTime: 60 * 1000, // 1 minute
  });
}

// Mutations
export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateDto) => createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: templateKeys.stats() });
      message.success('模板创建成功');
    },
    onError: (error: any) => {
      message.error(error.message || '创建失败');
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      message.success('模板更新成功');
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败');
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: templateKeys.stats() });
      message.success('模板删除成功');
    },
    onError: () => {
      message.error('删除失败');
    },
  });
}

export function useCreateDeviceFromTemplate() {
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: any }) =>
      createDeviceFromTemplate(templateId, data),
    onSuccess: () => {
      message.success('设备创建成功');
    },
    onError: (error: any) => {
      message.error(error.message || '创建设备失败');
    },
  });
}

export function useBatchCreateDevicesFromTemplate() {
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: any }) =>
      batchCreateDevicesFromTemplate(templateId, data),
    onSuccess: (_, { data }) => {
      message.success(`成功创建 ${data.count} 个设备`);
    },
    onError: (error: any) => {
      message.error(error.message || '批量创建失败');
    },
  });
}
