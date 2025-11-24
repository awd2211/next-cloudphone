/**
 * 调度器管理 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { PaginationParams, PaginatedResponse } from '@/types';

// ========== 节点管理 ==========

export interface SchedulerNode {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'active' | 'inactive' | 'maintenance' | 'draining';
  region?: string;
  zone?: string;
  capacity: {
    cpu: number;
    memory: number;
    storage: number;
    maxDevices: number;
  };
  usage: {
    cpu: number;
    memory: number;
    storage: number;
    deviceCount: number;
  };
  labels?: Record<string, string>;
  lastHeartbeat?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNodeDto {
  name: string;
  host: string;
  port: number;
  region?: string;
  zone?: string;
  capacity: {
    cpu: number;
    memory: number;
    storage: number;
    maxDevices: number;
  };
  labels?: Record<string, string>;
}

export interface UpdateNodeDto {
  name?: string;
  status?: 'active' | 'inactive' | 'maintenance' | 'draining';
  labels?: Record<string, string>;
}

// 获取节点列表
export const getNodes = (
  params?: PaginationParams & { status?: string; region?: string }
): Promise<PaginatedResponse<SchedulerNode>> =>
  api.get<PaginatedResponse<SchedulerNode>>('/scheduler/nodes', { params });

// 获取节点详情
export const getNode = (id: string): Promise<SchedulerNode> =>
  api.get<SchedulerNode>(`/scheduler/nodes/${id}`);

// 创建节点
export const createNode = (data: CreateNodeDto): Promise<SchedulerNode> =>
  api.post<SchedulerNode>('/scheduler/nodes', data);

// 更新节点
export const updateNode = (id: string, data: UpdateNodeDto): Promise<SchedulerNode> =>
  api.put<SchedulerNode>(`/scheduler/nodes/${id}`, data);

// 删除节点
export const deleteNode = (id: string): Promise<void> =>
  api.delete(`/scheduler/nodes/${id}`);

// 节点进入维护模式
export const setNodeMaintenance = (id: string, enable: boolean): Promise<void> =>
  api.post(`/scheduler/nodes/${id}/maintenance`, { enable });

// 排空节点
export const drainNode = (id: string): Promise<void> =>
  api.post(`/scheduler/nodes/${id}/drain`);

// ========== 调度策略 ==========

export interface SchedulingStrategy {
  id: string;
  name: string;
  type: string;
  description?: string;
  config?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
}

// 获取调度策略
export const getStrategies = (): Promise<SchedulingStrategy[]> =>
  api.get<SchedulingStrategy[]>('/scheduler/strategies');

// 获取当前激活的策略
export const getActiveStrategy = (): Promise<SchedulingStrategy> =>
  api.get<SchedulingStrategy>('/scheduler/strategies/active');

// 设置激活的策略
export const setActiveStrategy = (id: string): Promise<void> =>
  api.post(`/scheduler/strategies/${id}/activate`);

// 创建策略
export const createStrategy = (data: Partial<SchedulingStrategy>): Promise<SchedulingStrategy> =>
  api.post<SchedulingStrategy>('/scheduler/strategies', data);

// 更新策略
export const updateStrategy = (
  id: string,
  data: Partial<SchedulingStrategy>
): Promise<SchedulingStrategy> =>
  api.put<SchedulingStrategy>(`/scheduler/strategies/${id}`, data);

// 删除策略
export const deleteStrategy = (id: string): Promise<void> =>
  api.delete(`/scheduler/strategies/${id}`);

// ========== 调度任务 ==========

export interface SchedulingTask {
  id: string;
  nodeId: string;
  deviceId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// 获取调度任务列表
export const getTasks = (
  params?: PaginationParams & { status?: string; userId?: string }
): Promise<PaginatedResponse<SchedulingTask>> =>
  api.get<PaginatedResponse<SchedulingTask>>('/scheduler/tasks', { params });

// 手动调度设备
export const scheduleDevice = (deviceId: string, nodeId?: string): Promise<void> =>
  api.post('/scheduler/schedule', { deviceId, nodeId });

// 重新调度
export const rescheduleDevice = (deviceId: string): Promise<void> =>
  api.post(`/scheduler/reschedule/${deviceId}`);

// ========== 集群统计 ==========

export interface ClusterStats {
  nodes: {
    total: number;
    online: number;
    offline: number;
  };
  capacity: {
    cpuCores: number;
    memoryMB: number;
    storageGB: number;
    maxDevices: number;
  };
  usage: {
    cpuCores: number;
    memoryMB: number;
    storageGB: number;
    devices: number;
  };
  utilization: {
    cpu: number;
    memory: number;
    storage: number;
    devices: number;
  };
  // 兼容旧的访问方式 (computed properties for backwards compatibility)
  totalNodes?: number;
  activeNodes?: number;
  totalCapacity?: {
    cpu: number;
    memory: number;
    storage: number;
  };
  totalUsage?: {
    cpu: number;
    memory: number;
    storage: number;
  };
  utilizationRate?: {
    cpu: number;
    memory: number;
    storage: number;
  };
}

// 获取集群统计
export const getClusterStats = (): Promise<ClusterStats> =>
  api.get<ClusterStats>('/scheduler/resources/cluster-stats');

// 获取节点资源使用趋势
export const getNodeUsageTrend = (
  nodeId: string,
  startDate?: string,
  endDate?: string
): Promise<any> =>
  api.get(`/scheduler/nodes/${nodeId}/usage-trend`, {
    params: { startDate, endDate },
  });

// 获取集群资源使用趋势
export const getClusterUsageTrend = (startDate?: string, endDate?: string): Promise<any> =>
  api.get('/scheduler/cluster/usage-trend', {
    params: { startDate, endDate },
  });
