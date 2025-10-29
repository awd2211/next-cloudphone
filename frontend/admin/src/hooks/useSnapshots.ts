import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as snapshotService from '@/services/snapshot';
import type { DeviceSnapshot, PaginationParams } from '@/types';

/**
 * Snapshot Query Keys
 * 用于 React Query 缓存管理的键定义
 */
export const snapshotKeys = {
  all: ['snapshots'] as const,
  lists: () => [...snapshotKeys.all, 'list'] as const,
  list: (params?: PaginationParams & { deviceId?: string; status?: string }) =>
    [...snapshotKeys.lists(), params] as const,
  details: () => [...snapshotKeys.all, 'detail'] as const,
  detail: (id: string) => [...snapshotKeys.details(), id] as const,
  stats: () => [...snapshotKeys.all, 'stats'] as const,
  deviceSnapshots: (deviceId: string) => [...snapshotKeys.all, 'device', deviceId] as const,
};

/**
 * 获取快照列表
 */
export function useSnapshots(params?: PaginationParams & { deviceId?: string; status?: string }) {
  return useQuery({
    queryKey: snapshotKeys.list(params),
    queryFn: () => snapshotService.getSnapshots(params),
    staleTime: 30 * 1000, // 30秒内认为数据新鲜
  });
}

/**
 * 获取单个快照详情
 */
export function useSnapshot(id: string) {
  return useQuery({
    queryKey: snapshotKeys.detail(id),
    queryFn: () => snapshotService.getSnapshot(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * 获取快照统计信息
 */
export function useSnapshotStats() {
  return useQuery({
    queryKey: snapshotKeys.stats(),
    queryFn: () => snapshotService.getSnapshotStats(),
    staleTime: 60 * 1000, // 统计数据可以缓存1分钟
  });
}

/**
 * 获取设备的快照列表
 */
export function useDeviceSnapshots(deviceId: string) {
  return useQuery({
    queryKey: snapshotKeys.deviceSnapshots(deviceId),
    queryFn: () => snapshotService.getDeviceSnapshots(deviceId),
    enabled: !!deviceId,
    staleTime: 30 * 1000,
  });
}

/**
 * 创建快照
 */
export function useCreateSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { deviceId: string; name: string; description?: string }) =>
      snapshotService.createSnapshot(data),
    onSuccess: () => {
      // 创建成功后，失效列表和统计缓存
      queryClient.invalidateQueries({ queryKey: snapshotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: snapshotKeys.stats() });
      message.success('快照创建任务已提交，请稍后刷新查看');
    },
    onError: (error: any) => {
      message.error(`创建失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 恢复快照
 */
export function useRestoreSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, deviceName }: { id: string; deviceName: string }) =>
      snapshotService.restoreSnapshot(id),
    onSuccess: (_, { deviceName }) => {
      // 恢复成功后，失效相关缓存
      queryClient.invalidateQueries({ queryKey: snapshotKeys.lists() });
      message.success(`快照恢复任务已提交，设备 ${deviceName} 将在几分钟内恢复`);
    },
    onError: (error: any) => {
      message.error(`恢复失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 压缩快照
 */
export function useCompressSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => snapshotService.compressSnapshot(id),
    onSuccess: () => {
      // 压缩成功后，失效列表缓存
      queryClient.invalidateQueries({ queryKey: snapshotKeys.lists() });
      message.success('快照压缩任务已提交，请稍后刷新查看');
    },
    onError: (error: any) => {
      message.error(`压缩失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 删除快照
 */
export function useDeleteSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => snapshotService.deleteSnapshot(id),
    onSuccess: () => {
      // 删除成功后，失效列表和统计缓存
      queryClient.invalidateQueries({ queryKey: snapshotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: snapshotKeys.stats() });
      message.success('快照删除成功');
    },
    onError: (error: any) => {
      message.error(`删除失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 批量删除快照
 */
export function useBatchDeleteSnapshots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => snapshotService.batchDeleteSnapshots(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: snapshotKeys.stats() });
      message.success(`成功删除 ${ids.length} 个快照`);
    },
    onError: (error: any) => {
      message.error(`批量删除失败: ${error.response?.data?.message || error.message}`);
    },
  });
}
