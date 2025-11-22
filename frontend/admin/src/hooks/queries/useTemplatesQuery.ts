/**
 * Templates React Query Hooks
 *
 * 基于 @/services/template
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { message } from 'antd';
import * as templateService from '@/services/template';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import {
  DeviceTemplateSchema,
  TemplateStatsSchema,
  PaginatedResponseSchema,
} from '@/schemas/api.schemas';
import type {
  DeviceTemplate,
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateDeviceFromTemplateDto,
  PaginationParams,
} from '@/types';

/**
 * Query Keys
 */
export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (params?: PaginationParams & { category?: string; isPublic?: boolean; search?: string }) =>
    [...templateKeys.lists(), params] as const,
  popular: () => [...templateKeys.all, 'popular'] as const,
  search: (keyword: string, params?: PaginationParams) =>
    [...templateKeys.all, 'search', keyword, params] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
  stats: () => [...templateKeys.all, 'stats'] as const,
};

/**
 * 获取模板列表
 */
export const useTemplates = (
  params?: PaginationParams & { category?: string; isPublic?: boolean; search?: string }
) => {
  return useValidatedQuery({
    queryKey: templateKeys.list(params),
    queryFn: () => templateService.getTemplates(params),
    schema: PaginatedResponseSchema(DeviceTemplateSchema),
  });
};

/**
 * 获取热门模板
 */
export const usePopularTemplates = () => {
  return useQuery({
    queryKey: templateKeys.popular(),
    queryFn: () => templateService.getPopularTemplates(),
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};

/**
 * 搜索模板
 */
export const useSearchTemplates = (keyword: string, params?: PaginationParams) => {
  return useValidatedQuery({
    queryKey: templateKeys.search(keyword, params),
    queryFn: () => templateService.searchTemplates(keyword, params),
    schema: PaginatedResponseSchema(DeviceTemplateSchema),
    enabled: !!keyword,
  });
};

/**
 * 获取模板详情
 */
export const useTemplate = (
  id: string,
  options?: Omit<UseQueryOptions<DeviceTemplate, Error>, 'queryKey' | 'queryFn'>
) => {
  return useValidatedQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => templateService.getTemplate(id),
    schema: DeviceTemplateSchema,
    enabled: !!id,
    ...options,
  });
};

/**
 * 获取模板统计
 */
export const useTemplateStats = () => {
  return useValidatedQuery({
    queryKey: templateKeys.stats(),
    queryFn: () => templateService.getTemplateStats(),
    schema: TemplateStatsSchema,
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 创建模板 Mutation
 */
export const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTemplateDto) => templateService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: templateKeys.stats() });
      message.success('模板创建成功');
    },
    onError: () => {
      message.error('模板创建失败');
    },
  });
};

/**
 * 从现有设备创建模板 Mutation
 */
export const useCreateTemplateFromDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      deviceId,
      data,
    }: {
      deviceId: string;
      data: Omit<CreateTemplateDto, 'androidVersion' | 'cpuCores' | 'memoryMB' | 'storageMB'>;
    }) => templateService.createTemplateFromDevice(deviceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: templateKeys.stats() });
      message.success('从设备创建模板成功');
    },
    onError: () => {
      message.error('从设备创建模板失败');
    },
  });
};

/**
 * 更新模板 Mutation
 */
export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateDto }) =>
      templateService.updateTemplate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) });
      message.success('模板更新成功');
    },
    onError: () => {
      message.error('模板更新失败');
    },
  });
};

/**
 * 删除模板 Mutation
 */
export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => templateService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: templateKeys.stats() });
      message.success('模板删除成功');
    },
    onError: () => {
      message.error('模板删除失败');
    },
  });
};

/**
 * 从模板创建设备 Mutation
 */
export const useCreateDeviceFromTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Omit<CreateDeviceFromTemplateDto, 'templateId'>;
    }) => templateService.createDeviceFromTemplate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) });
      // Invalidate devices queries too
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      message.success('设备创建成功');
    },
    onError: () => {
      message.error('设备创建失败');
    },
  });
};

/**
 * 从模板批量创建设备 Mutation
 */
export const useBatchCreateDevicesFromTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Omit<CreateDeviceFromTemplateDto, 'templateId'> & { count: number };
    }) => templateService.batchCreateDevicesFromTemplate(id, data),
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) });
      // Invalidate devices queries too
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      message.success(`成功创建 ${data.count} 个设备`);
    },
    onError: () => {
      message.error('批量创建设备失败');
    },
  });
};
