/**
 * 用户设备管理 React Query Hooks
 * 用于管理用户自己的云手机设备
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as deviceService from '@/services/device';
import type { Device, PaginationParams } from '@/types';

/**
 * Query Keys 定义
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

/**
 * 获取我的设备列表
 */
export function useMyDevices(params: PaginationParams) {
  return useQuery({
    queryKey: deviceKeys.list(params),
    queryFn: () => deviceService.getMyDevices(params),
    staleTime: 30 * 1000, // 30秒内不重新请求
    // 保持上一次的数据，避免页面切换时闪烁
    placeholderData: (previousData) => previousData,
  });
}

/**
 * 获取设备详情
 */
export function useDevice(id: string) {
  return useQuery({
    queryKey: deviceKeys.detail(id),
    queryFn: () => deviceService.getDevice(id),
    enabled: !!id, // 只有 id 存在时才查询
    staleTime: 30 * 1000,
  });
}

/**
 * 获取设备统计数据
 */
export function useDeviceStats() {
  return useQuery({
    queryKey: deviceKeys.stats(),
    queryFn: () => deviceService.getMyDeviceStats(),
    staleTime: 60 * 1000, // 统计数据可以缓存久一点
  });
}

/**
 * 启动设备
 */
export function useStartDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deviceService.startDevice(id),
    onSuccess: (_, id) => {
      message.success('设备启动成功');
      // 刷新设备详情和列表
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '设备启动失败');
    },
  });
}

/**
 * 停止设备
 */
export function useStopDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deviceService.stopDevice(id),
    onSuccess: (_, id) => {
      message.success('设备已停止');
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '设备停止失败');
    },
  });
}

/**
 * 重启设备
 */
export function useRebootDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deviceService.rebootDevice(id),
    onSuccess: (_, id) => {
      message.success('设备重启中...');
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '设备重启失败');
    },
  });
}
