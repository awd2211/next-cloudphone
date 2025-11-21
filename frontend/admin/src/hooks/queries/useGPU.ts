/**
 * GPU React Query Hooks
 *
 * 基于 @/services/gpu
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as gpuService from '@/services/gpu';
import { useValidatedQuery } from './useValidatedQuery';
import {
  GPUDeviceSchema,
  GPUAllocationSchema,
  GPUStatsSchema,
  
  PaginatedResponseSchema,
} from '@/schemas/api.schemas';
import type {
  
  
  
  PaginationParams,
} from '@/types';

/**
 * Query Keys
 */
export const gpuKeys = {
  all: ['gpu'] as const,
  devices: () => [...gpuKeys.all, 'devices'] as const,
  deviceList: (params?: PaginationParams & { status?: string; nodeId?: string }) =>
    [...gpuKeys.devices(), params] as const,
  device: (id: string) => [...gpuKeys.all, 'device', id] as const,
  deviceStatus: (id: string) => [...gpuKeys.device(id), 'status'] as const,
  allocations: (params?: PaginationParams & { gpuId?: string; deviceId?: string; status?: string }) =>
    [...gpuKeys.all, 'allocations', params] as const,
  stats: () => [...gpuKeys.all, 'stats'] as const,
  usageTrend: (gpuId: string, params?: { startDate?: string; endDate?: string }) =>
    [...gpuKeys.all, 'usage-trend', gpuId, params] as const,
  clusterTrend: (params?: { startDate?: string; endDate?: string }) =>
    [...gpuKeys.all, 'cluster-trend', params] as const,
  performance: (gpuId: string) => [...gpuKeys.all, 'performance', gpuId] as const,
  driver: (nodeId: string) => [...gpuKeys.all, 'driver', nodeId] as const,
};

/**
 * 获取 GPU 设备列表
 */
export const useGPUDevices = (params?: PaginationParams & { status?: string; nodeId?: string }) => {
  return useValidatedQuery({
    queryKey: gpuKeys.deviceList(params),
    queryFn: () => gpuService.getGPUDevices(params),
    schema: PaginatedResponseSchema(GPUDeviceSchema),
  });
};

/**
 * 获取 GPU 设备详情
 */
export const useGPUDevice = (id: string) => {
  return useValidatedQuery({
    queryKey: gpuKeys.device(id),
    queryFn: () => gpuService.getGPUDevice(id),
    schema: GPUDeviceSchema,
    enabled: !!id,
  });
};

/**
 * 获取 GPU 实时状态
 */
export const useGPUStatus = (id: string) => {
  return useQuery({
    queryKey: gpuKeys.deviceStatus(id),
    queryFn: () => gpuService.getGPUStatus(id),
    enabled: !!id,
    refetchInterval: 5 * 1000, // 每5秒刷新
  });
};

/**
 * 获取分配记录
 */
export const useGPUAllocations = (
  params?: PaginationParams & { gpuId?: string; deviceId?: string; status?: string }
) => {
  return useValidatedQuery({
    queryKey: gpuKeys.allocations(params),
    queryFn: () => gpuService.getGPUAllocations(params),
    schema: PaginatedResponseSchema(GPUAllocationSchema),
  });
};

/**
 * 获取 GPU 统计信息
 */
export const useGPUStats = () => {
  return useValidatedQuery({
    queryKey: gpuKeys.stats(),
    queryFn: () => gpuService.getGPUStats(),
    schema: GPUStatsSchema,
    staleTime: 30 * 1000, // 30秒
  });
};

/**
 * 获取 GPU 使用趋势
 */
export const useGPUUsageTrend = (gpuId: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: gpuKeys.usageTrend(gpuId, { startDate, endDate }),
    queryFn: () => gpuService.getGPUUsageTrend(gpuId, startDate, endDate),
    enabled: !!gpuId,
  });
};

/**
 * 获取集群 GPU 使用趋势
 */
export const useClusterGPUTrend = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: gpuKeys.clusterTrend({ startDate, endDate }),
    queryFn: () => gpuService.getClusterGPUTrend(startDate, endDate),
  });
};

/**
 * 获取 GPU 性能分析
 */
export const useGPUPerformanceAnalysis = (gpuId: string) => {
  return useQuery({
    queryKey: gpuKeys.performance(gpuId),
    queryFn: () => gpuService.getGPUPerformanceAnalysis(gpuId),
    enabled: !!gpuId,
  });
};

/**
 * 获取驱动信息
 */
export const useGPUDriverInfo = (nodeId: string) => {
  return useQuery({
    queryKey: gpuKeys.driver(nodeId),
    queryFn: () => gpuService.getGPUDriverInfo(nodeId),
    enabled: !!nodeId,
  });
};

/**
 * 分配 GPU 到设备 Mutation
 */
export const useAllocateGPU = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      gpuId,
      deviceId,
      mode = 'exclusive',
    }: {
      gpuId: string;
      deviceId: string;
      mode?: 'exclusive' | 'shared';
    }) => gpuService.allocateGPU(gpuId, deviceId, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gpuKeys.devices() });
      queryClient.invalidateQueries({ queryKey: gpuKeys.allocations() });
      queryClient.invalidateQueries({ queryKey: gpuKeys.stats() });
      message.success('GPU 分配成功');
    },
    onError: () => {
      message.error('GPU 分配失败');
    },
  });
};

/**
 * 释放 GPU 分配 Mutation
 */
export const useDeallocateGPU = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gpuId, deviceId }: { gpuId: string; deviceId?: string }) =>
      gpuService.deallocateGPU(gpuId, deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gpuKeys.devices() });
      queryClient.invalidateQueries({ queryKey: gpuKeys.allocations() });
      queryClient.invalidateQueries({ queryKey: gpuKeys.stats() });
      message.success('GPU 已释放');
    },
    onError: () => {
      message.error('GPU 释放失败');
    },
  });
};

/**
 * 更新驱动 Mutation
 */
export const useUpdateGPUDriver = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nodeId, driverVersion }: { nodeId: string; driverVersion: string }) =>
      gpuService.updateGPUDriver(nodeId, driverVersion),
    onSuccess: (_, { nodeId }) => {
      queryClient.invalidateQueries({ queryKey: gpuKeys.driver(nodeId) });
      message.success('驱动更新任务已提交');
    },
    onError: () => {
      message.error('驱动更新失败');
    },
  });
};
