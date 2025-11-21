/**
 * Snapshots React Query Hooks
 *
 * 基于 @/services/snapshot
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as snapshotService from '@/services/snapshot';
import {
} from '@/schemas/api.schemas';
import type {
  CreateSnapshotDto,
  PaginationParams,
} from '@/types';

/**
 * Query Keys
 */
export const snapshotKeys = {
  all: ['snapshots'] as const,
  lists: () => [...snapshotKeys.all, 'list'] as const,
  list: (params?: PaginationParams & { deviceId?: string; status?: string }) =>
    [...snapshotKeys.lists(), params] as const,
  deviceSnapshots: (deviceId: string) => [...snapshotKeys.all, 'device', deviceId] as const,
  details: () => [...snapshotKeys.all, 'detail'] as const,
  detail: (id: string) => [...snapshotKeys.details(), id] as const,
  stats: () => [...snapshotKeys.all, 'stats'] as const,
};

/**
 * 获取快照列表
 */
export const useSnapshots = (params?: PaginationParams & { deviceId?: string; status?: string }) => {
  return useQuery({
    queryKey: snapshotKeys.list(params),
    queryFn: () => snapshotService.getSnapshots(params),
  });
};

/**
 * 获取设备的所有快照
 */
export const useDeviceSnapshots = (deviceId: string) => {
  return useQuery({
    queryKey: snapshotKeys.deviceSnapshots(deviceId),
    queryFn: () => snapshotService.getDeviceSnapshots(deviceId),
    enabled: !!deviceId,
  });
};

/**
 * 获取快照详情
 */
export const useSnapshot = (id: string) => {
  return useQuery({
    queryKey: snapshotKeys.detail(id),
    queryFn: () => snapshotService.getSnapshot(id),
    enabled: !!id,
  });
};

/**
 * 获取快照统计
 */
export const useSnapshotStats = () => {
  return useQuery({
    queryKey: snapshotKeys.stats(),
    queryFn: () => snapshotService.getSnapshotStats(),
    staleTime: 30 * 1000, // 30秒
  });
};

/**
 * 创建快照 Mutation
 */
export const useCreateSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSnapshotDto) => snapshotService.createSnapshot(data),
    onSuccess: (_, { deviceId }) => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: snapshotKeys.deviceSnapshots(deviceId) });
      queryClient.invalidateQueries({ queryKey: snapshotKeys.stats() });
      message.success('快照创建成功');
    },
    onError: () => {
      message.error('快照创建失败');
    },
  });
};

/**
 * 恢复快照 Mutation
 */
export const useRestoreSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => snapshotService.restoreSnapshot(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.detail(id) });
      message.success('快照恢复成功');
    },
    onError: () => {
      message.error('快照恢复失败');
    },
  });
};

/**
 * 压缩快照 Mutation
 */
export const useCompressSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => snapshotService.compressSnapshot(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: snapshotKeys.stats() });
      message.success('快照压缩成功');
    },
    onError: () => {
      message.error('快照压缩失败');
    },
  });
};

/**
 * 删除快照 Mutation
 */
export const useDeleteSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => snapshotService.deleteSnapshot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: snapshotKeys.stats() });
      message.success('快照删除成功');
    },
    onError: () => {
      message.error('快照删除失败');
    },
  });
};

/**
 * 批量删除快照 Mutation
 */
export const useBatchDeleteSnapshots = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (snapshotIds: string[]) => snapshotService.batchDeleteSnapshots(snapshotIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: snapshotKeys.stats() });
      message.success('批量删除成功');
    },
    onError: () => {
      message.error('批量删除失败');
    },
  });
};
