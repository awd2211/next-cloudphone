/**
 * 用户设备管理 React Query Hooks
 * 用于管理用户自己的云手机设备
 *
 * ✅ 统一使用 const 箭头函数风格
 * ✅ 使用类型化的错误处理
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PaginationParams } from '@/types';
import * as deviceService from '@/services/device';
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig } from '../utils/cacheConfig';

// ==================== Query Keys ====================

/**
 * 设备查询键工厂
 * 遵循层级结构: devices -> list/detail -> 具体参数
 */
export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...deviceKeys.lists(), params] as const,
  details: () => [...deviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...deviceKeys.details(), id] as const,
  stats: () => [...deviceKeys.all, 'stats'] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取我的设备列表
 */
export const useMyDevices = (params: PaginationParams) => {
  return useQuery({
    queryKey: deviceKeys.list(params),
    queryFn: () => deviceService.getMyDevices(params),
    staleTime: StaleTimeConfig.devices,
    // 保持上一次的数据，避免页面切换时闪烁
    placeholderData: (previousData) => previousData,
  });
};

/**
 * 获取设备详情
 */
export const useDevice = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: deviceKeys.detail(id),
    queryFn: () => deviceService.getDevice(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: StaleTimeConfig.deviceDetail,
  });
};

/**
 * 获取设备统计数据
 */
export const useDeviceStats = () => {
  return useQuery({
    queryKey: deviceKeys.stats(),
    queryFn: () => deviceService.getMyDeviceStats(),
    staleTime: StaleTimeConfig.deviceStats,
  });
};

// ==================== Mutation Hooks ====================

/**
 * 启动设备
 */
export const useStartDevice = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => deviceService.startDevice(id),
    onSuccess: (_, id) => {
      handleMutationSuccess('设备启动成功');
      // 刷新设备详情和列表
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '设备启动失败');
    },
  });
};

/**
 * 停止设备
 */
export const useStopDevice = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => deviceService.stopDevice(id),
    onSuccess: (_, id) => {
      handleMutationSuccess('设备已停止');
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '设备停止失败');
    },
  });
};

/**
 * 重启设备
 */
export const useRebootDevice = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => deviceService.rebootDevice(id),
    onSuccess: (_, id) => {
      handleMutationSuccess('设备重启中...');
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
    },
    onError: (error) => {
      handleMutationError(error, '设备重启失败');
    },
  });
};
