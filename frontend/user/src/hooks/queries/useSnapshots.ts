/**
 * 设备快照管理 React Query Hooks (用户端)
 *
 * 提供快照列表、创建、恢复、删除等功能
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import type { Snapshot } from '@/utils/snapshotConfig';
import * as snapshotService from '@/services/snapshot';
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig } from '../utils/cacheConfig';

// ==================== Query Keys ====================

export const snapshotKeys = {
  all: ['snapshots'] as const,
  lists: () => [...snapshotKeys.all, 'list'] as const,
  list: (deviceId?: string) => [...snapshotKeys.lists(), deviceId] as const,
  userSnapshots: () => [...snapshotKeys.all, 'user'] as const,
  details: () => [...snapshotKeys.all, 'detail'] as const,
  detail: (id: string) => [...snapshotKeys.details(), id] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取设备的所有快照
 */
export const useDeviceSnapshots = (deviceId: string, options?: { enabled?: boolean }) => {
  return useQuery<{ data: Snapshot[] }>({
    queryKey: snapshotKeys.list(deviceId),
    queryFn: () => snapshotService.getDeviceSnapshots(deviceId),
    enabled: options?.enabled !== false && !!deviceId,
    staleTime: StaleTimeConfig.snapshots,
  });
};

/**
 * 获取用户的所有快照
 */
export const useUserSnapshots = () => {
  return useQuery<Snapshot[]>({
    queryKey: snapshotKeys.userSnapshots(),
    queryFn: () => snapshotService.getUserSnapshots(),
    staleTime: StaleTimeConfig.snapshots,
  });
};

/**
 * 获取快照详情
 */
export const useSnapshot = (id: string, options?: { enabled?: boolean }) => {
  return useQuery<Snapshot>({
    queryKey: snapshotKeys.detail(id),
    queryFn: () => snapshotService.getSnapshot(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: StaleTimeConfig.snapshots,
  });
};

// ==================== Mutation Hooks ====================

/**
 * 创建快照
 */
export const useCreateSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, { deviceId: string; name: string; description?: string }>({
    mutationFn: ({ deviceId, name, description }) =>
      snapshotService.createSnapshot(deviceId, { name, description }),
    onSuccess: (_, variables) => {
      handleMutationSuccess('快照创建成功');
      // 刷新设备的快照列表
      queryClient.invalidateQueries({ queryKey: snapshotKeys.list(variables.deviceId) });
      queryClient.invalidateQueries({ queryKey: snapshotKeys.userSnapshots() });
    },
    onError: (error) => {
      handleMutationError(error, '快照创建失败');
    },
  });
};

/**
 * 恢复快照
 */
export const useRestoreSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, { snapshotId: string; deviceId?: string }>({
    mutationFn: ({ snapshotId }) => snapshotService.restoreSnapshot(snapshotId),
    onSuccess: (_, variables) => {
      handleMutationSuccess('快照恢复成功，设备正在重启...');
      // 刷新相关数据
      if (variables.deviceId) {
        queryClient.invalidateQueries({ queryKey: snapshotKeys.list(variables.deviceId) });
      }
      queryClient.invalidateQueries({ queryKey: snapshotKeys.userSnapshots() });
      // 刷新设备信息（设备可能在重启）
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error) => {
      handleMutationError(error, '快照恢复失败');
    },
  });
};

/**
 * 删除快照
 */
export const useDeleteSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, { snapshotId: string; deviceId?: string }>({
    mutationFn: ({ snapshotId }) => snapshotService.deleteSnapshot(snapshotId),
    onSuccess: (_, variables) => {
      handleMutationSuccess('快照删除成功');
      // 刷新快照列表
      if (variables.deviceId) {
        queryClient.invalidateQueries({ queryKey: snapshotKeys.list(variables.deviceId) });
      }
      queryClient.invalidateQueries({ queryKey: snapshotKeys.userSnapshots() });
    },
    onError: (error) => {
      handleMutationError(error, '快照删除失败');
    },
  });
};
