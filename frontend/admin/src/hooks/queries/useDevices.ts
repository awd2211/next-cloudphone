/**
 * 设备相关的 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  startDevice,
  stopDevice,
} from '../../services/device';
import type { Device, CreateDeviceDto, UpdateDeviceDto, PaginationParams } from '../../types';

/**
 * Query Keys
 */
export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...deviceKeys.lists(), params] as const,
  details: () => [...deviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...deviceKeys.details(), id] as const,
};

/**
 * 获取设备列表
 */
export function useDevices(params: PaginationParams) {
  return useQuery({
    queryKey: deviceKeys.list(params),
    queryFn: () => getDevices(params),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * 获取单个设备详情
 */
export function useDevice(id: string, enabled = true) {
  return useQuery({
    queryKey: deviceKeys.detail(id),
    queryFn: () => getDevice(id),
    enabled: enabled && !!id,
  });
}

/**
 * 创建设备
 */
export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDeviceDto) => createDevice(data),
    onSuccess: () => {
      // 使所有设备列表查询失效，触发重新获取
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      message.success('设备创建成功');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '设备创建失败');
    },
  });
}

/**
 * 更新设备
 */
export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeviceDto }) => updateDevice(id, data),
    onSuccess: (_, variables) => {
      // 使设备详情和列表查询失效
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      message.success('设备更新成功');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '设备更新失败');
    },
  });
}

/**
 * 删除设备
 */
export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDevice(id),
    onSuccess: (_, id) => {
      // 移除设备详情缓存
      queryClient.removeQueries({ queryKey: deviceKeys.detail(id) });
      // 使列表查询失效
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      message.success('设备删除成功');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '设备删除失败');
    },
  });
}

/**
 * 启动设备
 */
export function useStartDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => startDevice(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      message.success('设备启动成功');
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
    mutationFn: (id: string) => stopDevice(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      message.success('设备停止成功');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '设备停止失败');
    },
  });
}

/**
 * 批量操作设备
 */
export function useBatchDeviceOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      operation,
    }: {
      ids: string[];
      operation: 'start' | 'stop' | 'delete';
    }) => {
      const promises = ids.map((id) => {
        switch (operation) {
          case 'start':
            return startDevice(id);
          case 'stop':
            return stopDevice(id);
          case 'delete':
            return deleteDevice(id);
        }
      });
      return Promise.all(promises);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });

      if (variables.operation === 'delete') {
        variables.ids.forEach((id) => {
          queryClient.removeQueries({ queryKey: deviceKeys.detail(id) });
        });
      } else {
        variables.ids.forEach((id) => {
          queryClient.invalidateQueries({ queryKey: deviceKeys.detail(id) });
        });
      }

      message.success(
        `批量${
          variables.operation === 'start'
            ? '启动'
            : variables.operation === 'stop'
              ? '停止'
              : '删除'
        }成功`
      );
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '批量操作失败');
    },
  });
}
