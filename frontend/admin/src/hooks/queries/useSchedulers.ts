/**
 * Scheduler React Query Hooks
 *
 * 基于 @/services/scheduler
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as schedulerService from '@/services/scheduler';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import {
  SchedulingStrategySchema,
} from '@/schemas/api.schemas';
import type {
  CreateNodeDto,
  UpdateNodeDto,
  SchedulingStrategy,
} from '@/services/scheduler';
import type { PaginationParams } from '@/types';

/**
 * Query Keys
 */
export const schedulerKeys = {
  all: ['scheduler'] as const,
  // Nodes
  nodes: () => [...schedulerKeys.all, 'nodes'] as const,
  nodeList: (params?: PaginationParams & { status?: string; region?: string }) =>
    [...schedulerKeys.nodes(), params] as const,
  node: (id: string) => [...schedulerKeys.all, 'node', id] as const,
  nodeUsageTrend: (nodeId: string, startDate?: string, endDate?: string) =>
    [...schedulerKeys.node(nodeId), 'usage-trend', { startDate, endDate }] as const,
  // Strategies
  strategies: () => [...schedulerKeys.all, 'strategies'] as const,
  activeStrategy: () => [...schedulerKeys.strategies(), 'active'] as const,
  // Tasks
  tasks: (params?: PaginationParams & { status?: string; userId?: string }) =>
    [...schedulerKeys.all, 'tasks', params] as const,
  // Stats
  clusterStats: () => [...schedulerKeys.all, 'cluster-stats'] as const,
  clusterUsageTrend: (startDate?: string, endDate?: string) =>
    [...schedulerKeys.all, 'cluster-usage-trend', { startDate, endDate }] as const,
};

// ========== 节点管理 ==========

/**
 * 获取节点列表
 */
export const useNodes = (params?: PaginationParams) => {
  return useQuery({
    queryKey: schedulerKeys.nodeList(params),
    queryFn: () => schedulerService.getNodes(params),
  });
};

/**
 * 获取节点详情
 */
export const useNode = (id: string) => {
  return useQuery({
    queryKey: schedulerKeys.node(id),
    queryFn: () => schedulerService.getNode(id),
    enabled: !!id,
  });
};

/**
 * 获取节点资源使用趋势
 */
export const useNodeUsageTrend = (nodeId: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: schedulerKeys.nodeUsageTrend(nodeId, startDate, endDate),
    queryFn: () => schedulerService.getNodeUsageTrend(nodeId, startDate, endDate),
    enabled: !!nodeId,
  });
};

/**
 * 创建节点 Mutation
 */
export const useCreateNode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateNodeDto) => schedulerService.createNode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.nodes() });
      queryClient.invalidateQueries({ queryKey: schedulerKeys.clusterStats() });
      message.success('节点创建成功');
    },
    onError: () => {
      message.error('节点创建失败');
    },
  });
};

/**
 * 更新节点 Mutation
 */
export const useUpdateNode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNodeDto }) =>
      schedulerService.updateNode(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.nodes() });
      queryClient.invalidateQueries({ queryKey: schedulerKeys.node(id) });
      message.success('节点更新成功');
    },
    onError: () => {
      message.error('节点更新失败');
    },
  });
};

/**
 * 删除节点 Mutation
 */
export const useDeleteNode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => schedulerService.deleteNode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.nodes() });
      queryClient.invalidateQueries({ queryKey: schedulerKeys.clusterStats() });
      message.success('节点删除成功');
    },
    onError: () => {
      message.error('节点删除失败');
    },
  });
};

/**
 * 设置节点维护模式 Mutation
 */
export const useSetNodeMaintenance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enable }: { id: string; enable: boolean }) =>
      schedulerService.setNodeMaintenance(id, enable),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.node(id) });
      queryClient.invalidateQueries({ queryKey: schedulerKeys.nodes() });
      message.success('维护模式设置成功');
    },
    onError: () => {
      message.error('维护模式设置失败');
    },
  });
};

/**
 * 排空节点 Mutation
 */
export const useDrainNode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => schedulerService.drainNode(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.node(id) });
      queryClient.invalidateQueries({ queryKey: schedulerKeys.nodes() });
      message.success('节点排空任务已启动');
    },
    onError: () => {
      message.error('节点排空失败');
    },
  });
};

// ========== 调度策略 ==========

/**
 * 获取调度策略列表
 */
export const useSchedulingStrategies = () => {
  return useQuery({
    queryKey: schedulerKeys.strategies(),
    queryFn: () => schedulerService.getStrategies(),
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};

/**
 * 获取当前激活的策略
 */
export const useActiveStrategy = () => {
  return useValidatedQuery({
    queryKey: schedulerKeys.activeStrategy(),
    queryFn: () => schedulerService.getActiveStrategy(),
    schema: SchedulingStrategySchema,
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 设置激活的策略 Mutation
 */
export const useSetActiveStrategy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => schedulerService.setActiveStrategy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.activeStrategy() });
      queryClient.invalidateQueries({ queryKey: schedulerKeys.strategies() });
      message.success('策略激活成功');
    },
    onError: () => {
      message.error('策略激活失败');
    },
  });
};

/**
 * 创建策略 Mutation
 */
export const useCreateStrategy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<SchedulingStrategy>) => schedulerService.createStrategy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.strategies() });
      message.success('策略创建成功');
    },
    onError: () => {
      message.error('策略创建失败');
    },
  });
};

/**
 * 更新策略 Mutation
 */
export const useUpdateStrategy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SchedulingStrategy> }) =>
      schedulerService.updateStrategy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.strategies() });
      message.success('策略更新成功');
    },
    onError: () => {
      message.error('策略更新失败');
    },
  });
};

/**
 * 删除策略 Mutation
 */
export const useDeleteStrategy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => schedulerService.deleteStrategy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.strategies() });
      message.success('策略删除成功');
    },
    onError: () => {
      message.error('策略删除失败');
    },
  });
};

// ========== 调度任务 ==========

/**
 * 获取调度任务列表
 */
export const useTasks = (params?: PaginationParams) => {
  return useQuery({
    queryKey: schedulerKeys.tasks(params),
    queryFn: () => schedulerService.getTasks(params),
  });
};

/**
 * 手动调度设备 Mutation
 */
export const useScheduleDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deviceId, nodeId }: { deviceId: string; nodeId?: string }) =>
      schedulerService.scheduleDevice(deviceId, nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.tasks() });
      message.success('设备调度成功');
    },
    onError: () => {
      message.error('设备调度失败');
    },
  });
};

/**
 * 重新调度设备 Mutation
 */
export const useRescheduleDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deviceId: string) => schedulerService.rescheduleDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulerKeys.tasks() });
      message.success('重新调度成功');
    },
    onError: () => {
      message.error('重新调度失败');
    },
  });
};

// ========== 集群统计 ==========

/**
 * 获取集群统计
 */
export const useClusterStats = () => {
  return useQuery({
    queryKey: schedulerKeys.clusterStats(),
    queryFn: () => schedulerService.getClusterStats(),
    staleTime: 30 * 1000, // 30秒
    refetchInterval: 60 * 1000, // 每分钟自动刷新
  });
};

/**
 * 获取集群资源使用趋势
 */
export const useClusterUsageTrend = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: schedulerKeys.clusterUsageTrend(startDate, endDate),
    queryFn: () => schedulerService.getClusterUsageTrend(startDate, endDate),
  });
};
