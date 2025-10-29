import request from '@/utils/request';
import type { PaginationParams, PaginatedResponse } from '@/types';

// ========== 节点管理 ==========

export interface SchedulerNode {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'online' | 'offline' | 'maintenance' | 'draining';
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
  status?: 'online' | 'offline' | 'maintenance' | 'draining';
  labels?: Record<string, string>;
}

// 获取节点列表
export const getNodes = (params?: PaginationParams & { status?: string; region?: string }) => {
  return request.get<PaginatedResponse<SchedulerNode>>('/scheduler/nodes', { params });
};

// 获取节点详情
export const getNode = (id: string) => {
  return request.get<SchedulerNode>(`/scheduler/nodes/${id}`);
};

// 创建节点
export const createNode = (data: CreateNodeDto) => {
  return request.post<SchedulerNode>('/scheduler/nodes', data);
};

// 更新节点
export const updateNode = (id: string, data: UpdateNodeDto) => {
  return request.put<SchedulerNode>(`/scheduler/nodes/${id}`, data);
};

// 删除节点
export const deleteNode = (id: string) => {
  return request.delete(`/scheduler/nodes/${id}`);
};

// 节点进入维护模式
export const setNodeMaintenance = (id: string, enable: boolean) => {
  return request.post(`/scheduler/nodes/${id}/maintenance`, { enable });
};

// 排空节点
export const drainNode = (id: string) => {
  return request.post(`/scheduler/nodes/${id}/drain`);
};

// ========== 调度策略 ==========

export interface SchedulingStrategy {
  id: string;
  name: string;
  type: 'round-robin' | 'least-loaded' | 'random' | 'priority' | 'custom';
  description?: string;
  config: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 获取调度策略
export const getStrategies = () => {
  return request.get<SchedulingStrategy[]>('/scheduler/strategies');
};

// 获取当前激活的策略
export const getActiveStrategy = () => {
  return request.get<SchedulingStrategy>('/scheduler/strategies/active');
};

// 设置激活的策略
export const setActiveStrategy = (id: string) => {
  return request.post(`/scheduler/strategies/${id}/activate`);
};

// 创建策略
export const createStrategy = (data: Partial<SchedulingStrategy>) => {
  return request.post<SchedulingStrategy>('/scheduler/strategies', data);
};

// 更新策略
export const updateStrategy = (id: string, data: Partial<SchedulingStrategy>) => {
  return request.put<SchedulingStrategy>(`/scheduler/strategies/${id}`, data);
};

// 删除策略
export const deleteStrategy = (id: string) => {
  return request.delete(`/scheduler/strategies/${id}`);
};

// ========== 调度任务 ==========

export interface SchedulingTask {
  id: string;
  deviceId: string;
  userId: string;
  requestedAt: string;
  scheduledAt?: string;
  completedAt?: string;
  status: 'pending' | 'scheduled' | 'running' | 'completed' | 'failed';
  nodeId?: string;
  requirements: {
    cpuCores: number;
    memoryMB: number;
    storageMB: number;
    region?: string;
    zone?: string;
  };
  error?: string;
}

// 获取调度任务列表
export const getTasks = (params?: PaginationParams & { status?: string; userId?: string }) => {
  return request.get<PaginatedResponse<SchedulingTask>>('/scheduler/tasks', { params });
};

// 手动调度设备
export const scheduleDevice = (deviceId: string, nodeId?: string) => {
  return request.post('/scheduler/schedule', { deviceId, nodeId });
};

// 重新调度
export const rescheduleDevice = (deviceId: string) => {
  return request.post(`/scheduler/reschedule/${deviceId}`);
};

// ========== 集群统计 ==========

export interface ClusterStats {
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  maintenanceNodes: number;
  totalCapacity: {
    cpu: number;
    memory: number;
    storage: number;
    maxDevices: number;
  };
  totalUsage: {
    cpu: number;
    memory: number;
    storage: number;
    deviceCount: number;
  };
  utilizationRate: {
    cpu: number;
    memory: number;
    storage: number;
    devices: number;
  };
}

// 获取集群统计
export const getClusterStats = () => {
  return request.get<ClusterStats>('/scheduler/stats');
};

// 获取节点资源使用趋势
export const getNodeUsageTrend = (nodeId: string, startDate?: string, endDate?: string) => {
  return request.get(`/scheduler/nodes/${nodeId}/usage-trend`, {
    params: { startDate, endDate },
  });
};

// 获取集群资源使用趋势
export const getClusterUsageTrend = (startDate?: string, endDate?: string) => {
  return request.get('/scheduler/cluster/usage-trend', {
    params: { startDate, endDate },
  });
};
