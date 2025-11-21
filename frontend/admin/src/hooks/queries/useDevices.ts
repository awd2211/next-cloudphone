/**
 * Devices React Query Hooks
 *
 * 基于 @/services/device
 * 使用 React Query + Zod 进行数据获取和验证
 * ✅ 完全类型安全
 * ✅ 支持无限滚动（useInfiniteDevices）
 */

import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryOptions,
  type InfiniteData,
} from '@tanstack/react-query';
import { message } from 'antd';
import * as deviceService from '@/services/device';
import { useValidatedQuery } from './useValidatedQuery';
import {
  DeviceSchema,
  PaginatedResponseSchema,
} from '@/schemas/api.schemas';
import type {
  Device,
  PaginationParams,
  UpdateDeviceDto,
  PaginatedResponse,
} from '@/types';

// ============================================================================
// Query Keys
// ============================================================================

/**
 * 设备查询键工厂
 */
export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...deviceKeys.lists(), params] as const,
  infinite: (params?: Omit<PaginationParams, 'page'>) =>
    [...deviceKeys.all, 'infinite', params] as const,
  details: () => [...deviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...deviceKeys.details(), id] as const,
  stats: () => [...deviceKeys.all, 'stats'] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * 获取设备列表（带 Zod 验证）
 */
export const useDevices = (
  params?: PaginationParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<Device>, Error>, 'queryKey' | 'queryFn'>
) => {
  return useValidatedQuery({
    queryKey: deviceKeys.list(params),
    queryFn: () => deviceService.getDevices(params),
    schema: PaginatedResponseSchema(DeviceSchema) as any,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * 获取设备详情（带 Zod 验证）
 */
export const useDevice = (
  id: string,
  options?: Omit<UseQueryOptions<Device, Error>, 'queryKey' | 'queryFn'>
) => {
  return useValidatedQuery({
    queryKey: deviceKeys.detail(id),
    queryFn: () => deviceService.getDevice(id),
    schema: DeviceSchema as any,
    enabled: !!id,
    ...options,
  });
};

/**
 * 获取设备统计
 */
export const useDeviceStats = () => {
  return useQuery({
    queryKey: deviceKeys.stats(),
    queryFn: () => deviceService.getDeviceStats(),
    staleTime: 60 * 1000,
  });
};

/**
 * 无限滚动获取设备列表
 */
export const useInfiniteDevices = (params?: Omit<PaginationParams, 'page'>) => {
  return useInfiniteQuery<
    PaginatedResponse<Device>,
    Error,
    InfiniteData<PaginatedResponse<Device>>,
    ReturnType<typeof deviceKeys.infinite>,
    number
  >({
    queryKey: deviceKeys.infinite(params),
    queryFn: ({ pageParam = 1 }) =>
      deviceService.getDevices({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.page || 1;
      const totalPages = Math.ceil((lastPage.total || 0) / (lastPage.pageSize || 10));
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 30 * 1000,
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * 创建设备 Mutation
 */
export const useCreateDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceService.createDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.infinite() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      message.success('设备创建成功');
    },
    onError: (error: Error) => {
      message.error(`创建失败: ${error.message}`);
    },
  });
};

/**
 * 更新设备 Mutation
 */
export const useUpdateDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeviceDto }) =>
      deviceService.updateDevice(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.infinite() });
      message.success('设备更新成功');
    },
    onError: (error: Error) => {
      message.error(`更新失败: ${error.message}`);
    },
  });
};

/**
 * 启动设备 Mutation
 */
export const useStartDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceService.startDevice,
    onSuccess: (_, deviceId) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(deviceId) });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.infinite() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      message.success('设备启动成功');
    },
    onError: (error: Error) => {
      message.error(`启动失败: ${error.message}`);
    },
  });
};

/**
 * 停止设备 Mutation
 */
export const useStopDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceService.stopDevice,
    onSuccess: (_, deviceId) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(deviceId) });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.infinite() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      message.success('设备已停止');
    },
    onError: (error: Error) => {
      message.error(`停止失败: ${error.message}`);
    },
  });
};

/**
 * 重启设备 Mutation
 */
export const useRebootDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceService.rebootDevice,
    onSuccess: (_, deviceId) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(deviceId) });
      message.success('设备重启中...');
    },
    onError: (error: Error) => {
      message.error(`重启失败: ${error.message}`);
    },
  });
};

/**
 * 删除设备 Mutation
 */
export const useDeleteDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceService.deleteDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.infinite() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      message.success('设备已删除');
    },
    onError: (error: Error) => {
      message.error(`删除失败: ${error.message}`);
    },
  });
};
