/**
 * 用户设备管理 React Query Hooks
 * 用于管理用户自己的云手机设备
 *
 * ✅ 统一使用 const 箭头函数风格
 * ✅ 使用类型化的错误处理
 * ✅ 使用 Zod Schema 验证 API 响应
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PaginationParams, Device, PaginatedResponse } from '@/types';
import * as deviceService from '@/services/device';
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig } from '../utils/cacheConfig';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import {
  PaginatedDevicesResponseSchema,
  DeviceSchema,
  DeviceStatsSchema,
} from '@/schemas/api.schemas';

// ==================== 类型定义 ====================

/** 设备统计数据 */
export interface DeviceStats {
  total: number;
  running: number;
  stopped: number;
  idle?: number;
  error?: number;
}

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
  return useValidatedQuery<PaginatedResponse<Device>>({
    queryKey: deviceKeys.list(params),
    queryFn: () => deviceService.getMyDevices(params),
    schema: PaginatedDevicesResponseSchema,
    staleTime: StaleTimeConfig.devices,
  });
};

/**
 * 获取设备详情
 */
export const useDevice = (id: string, options?: { enabled?: boolean }) => {
  return useValidatedQuery<Device>({
    queryKey: deviceKeys.detail(id),
    queryFn: () => deviceService.getDevice(id),
    schema: DeviceSchema,
    enabled: options?.enabled !== false && !!id,
    staleTime: StaleTimeConfig.deviceDetail,
  });
};

/**
 * 获取设备统计数据
 */
export const useDeviceStats = () => {
  return useValidatedQuery<DeviceStats>({
    queryKey: deviceKeys.stats(),
    queryFn: () => deviceService.getMyDeviceStats(),
    schema: DeviceStatsSchema,
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
