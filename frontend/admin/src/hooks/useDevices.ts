import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as deviceService from '@/services/device';
import type { Device, PaginationParams } from '@/types';

/**
 * 设备相关的 React Query hooks
 *
 * 优势：
 * - 自动请求去重
 * - 自动缓存管理
 * - 后台自动刷新
 * - 乐观更新支持
 */

// Query Keys（统一管理缓存键）
export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...deviceKeys.lists(), params] as const,
  details: () => [...deviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...deviceKeys.details(), id] as const,
  stats: () => [...deviceKeys.all, 'stats'] as const,
};

/**
 * 获取设备列表
 *
 * 使用示例：
 * ```tsx
 * const { data, isLoading, error } = useDevices({ page: 1, pageSize: 10 });
 * ```
 */
export function useDevices(params?: PaginationParams) {
  return useQuery({
    queryKey: deviceKeys.list(params),
    queryFn: () => deviceService.getDevices(params),
    // 30秒内使用缓存，不重新请求
    staleTime: 30 * 1000,
  });
}

/**
 * 获取设备详情
 *
 * 使用示例：
 * ```tsx
 * const { data: device } = useDevice('device-id');
 * ```
 */
export function useDevice(id: string) {
  return useQuery({
    queryKey: deviceKeys.detail(id),
    queryFn: () => deviceService.getDevice(id),
    enabled: !!id, // 只有 id 存在时才请求
  });
}

/**
 * 获取设备统计
 *
 * 使用示例：
 * ```tsx
 * const { data: stats } = useDeviceStats();
 * ```
 */
export function useDeviceStats() {
  return useQuery({
    queryKey: deviceKeys.stats(),
    queryFn: () => deviceService.getDeviceStats(),
    // 统计数据 60秒刷新一次
    staleTime: 60 * 1000,
  });
}

/**
 * 创建设备 Mutation
 *
 * 使用示例：
 * ```tsx
 * const createDevice = useCreateDevice();
 *
 * const handleCreate = async () => {
 *   await createDevice.mutateAsync(deviceData);
 *   message.success('创建成功');
 * };
 * ```
 */
export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceService.createDevice,
    onSuccess: () => {
      // 自动失效设备列表缓存，触发重新请求
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      message.success('设备创建成功');
    },
    onError: (error: any) => {
      message.error(`创建失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 启动设备 Mutation
 *
 * 使用示例：
 * ```tsx
 * const startDevice = useStartDevice();
 * await startDevice.mutateAsync('device-id');
 * ```
 */
export function useStartDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceService.startDevice,
    onMutate: async (deviceId) => {
      // 乐观更新：立即更新UI
      await queryClient.cancelQueries({ queryKey: deviceKeys.detail(deviceId) });

      const previousDevice = queryClient.getQueryData<Device>(deviceKeys.detail(deviceId));

      if (previousDevice) {
        queryClient.setQueryData<Device>(deviceKeys.detail(deviceId), {
          ...previousDevice,
          status: 'running',
        });
      }

      return { previousDevice };
    },
    onSuccess: (_, deviceId) => {
      // 成功后失效相关缓存
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(deviceId) });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      message.success('设备启动成功');
    },
    onError: (error: any, deviceId, context) => {
      // 失败时回滚乐观更新
      if (context?.previousDevice) {
        queryClient.setQueryData(deviceKeys.detail(deviceId), context.previousDevice);
      }
      message.error(`启动失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 停止设备 Mutation
 *
 * ✅ 乐观更新：立即更新 UI 状态为已停止
 */
export function useStopDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceService.stopDevice,

    // ✅ 乐观更新
    onMutate: async (deviceId) => {
      await queryClient.cancelQueries({ queryKey: deviceKeys.detail(deviceId) });
      await queryClient.cancelQueries({ queryKey: deviceKeys.lists() });

      const previousDevice = queryClient.getQueryData<Device>(deviceKeys.detail(deviceId));
      const previousLists = queryClient.getQueriesData({ queryKey: deviceKeys.lists() });

      // 立即更新详情页状态
      if (previousDevice) {
        queryClient.setQueryData<Device>(deviceKeys.detail(deviceId), {
          ...previousDevice,
          status: 'stopped',
        });
      }

      // 立即更新列表页状态
      queryClient.setQueriesData(
        { queryKey: deviceKeys.lists() },
        (old: any) => {
          if (!old?.data?.data) return old;
          return {
            ...old,
            data: {
              ...old.data,
              data: old.data.data.map((d: Device) =>
                d.id === deviceId ? { ...d, status: 'stopped' as const } : d
              ),
            },
          };
        }
      );

      return { previousDevice, previousLists };
    },

    onSuccess: (_, deviceId) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(deviceId) });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      message.success('设备已停止');
    },

    onError: (error: any, deviceId, context) => {
      // 失败时回滚
      if (context?.previousDevice) {
        queryClient.setQueryData(deviceKeys.detail(deviceId), context.previousDevice);
      }
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      message.error(`停止失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 重启设备 Mutation
 */
export function useRebootDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceService.rebootDevice,
    onSuccess: (_, deviceId) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(deviceId) });
      message.success('设备重启中...');
    },
    onError: (error: any) => {
      message.error(`重启失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 删除设备 Mutation
 *
 * ✅ 乐观更新：立即从列表中移除设备
 */
export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deviceService.deleteDevice,

    // ✅ 乐观更新
    onMutate: async (deviceId: string) => {
      await queryClient.cancelQueries({ queryKey: deviceKeys.lists() });

      const previousLists = queryClient.getQueriesData({ queryKey: deviceKeys.lists() });

      // 立即从所有列表中移除该设备
      queryClient.setQueriesData(
        { queryKey: deviceKeys.lists() },
        (old: any) => {
          if (!old?.data?.data) return old;
          return {
            ...old,
            data: {
              ...old.data,
              data: old.data.data.filter((d: Device) => d.id !== deviceId),
              total: Math.max(0, (old.data.total || 0) - 1),
            },
          };
        }
      );

      return { previousLists };
    },

    onSuccess: (_, deviceId) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      message.success('设备已删除');
    },

    onError: (error: any, deviceId, context) => {
      // 失败时回滚
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      message.error(`删除失败: ${error.response?.data?.message || error.message}`);
    },
  });
}
