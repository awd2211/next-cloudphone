/**
 * Physical Devices React Query Hooks
 *
 * 提供物理设备管理功能的 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  getPhysicalDevices,
  scanNetworkDevices,
  registerPhysicalDevice,
  deleteDevice,
} from '@/services/device';
import { PhysicalDevicesResponseSchema } from '@/schemas/api.schemas';

// ==================== Query Keys ====================
export const physicalDeviceKeys = {
  all: ['physicalDevices'] as const,
  lists: () => [...physicalDeviceKeys.all, 'list'] as const,
  list: (params?: { page?: number; pageSize?: number }) =>
    [...physicalDeviceKeys.lists(), params] as const,
};

// Queries
export function usePhysicalDevices(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: physicalDeviceKeys.list(params),
    queryFn: async () => {
      const response = await getPhysicalDevices(params || {});
      // ✅ 添加 Zod 验证
      const validated = PhysicalDevicesResponseSchema.parse(response);
      return validated;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Mutations
export function useScanNetworkDevices() {
  return useMutation({
    mutationFn: (params: {
      networkCidr: string;
      portStart?: number;
      portEnd?: number;
      concurrency?: number;
      timeoutMs?: number;
    }) => scanNetworkDevices(params),
    onSuccess: (results: any) => {
      if (results.length === 0) {
        message.info('未发现任何设备，请检查网络配置');
      } else {
        message.success(`发现 ${results.length} 个设备`);
      }
    },
    onError: (error: any) => {
      message.error(error.message || '扫描失败');
    },
  });
}

export function useRegisterPhysicalDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => registerPhysicalDevice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: physicalDeviceKeys.lists() });
      message.success('设备注册成功');
    },
    onError: (error: any) => {
      message.error(error.message || '注册设备失败');
    },
  });
}

export function useDeletePhysicalDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Call the unified deleteDevice API (works for both physical and virtual devices)
      await deleteDevice(id);
    },
    onSuccess: () => {
      // Invalidate both physical device queries and general device queries
      queryClient.invalidateQueries({ queryKey: physicalDeviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      message.success('设备删除成功');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || error.message || '删除设备失败');
    },
  });
}
