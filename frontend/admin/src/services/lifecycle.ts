import request from '@/utils/request';
import type {
  LifecycleRule,
  CreateLifecycleRuleDto,
  UpdateLifecycleRuleDto,
  LifecycleExecutionHistory,
  LifecycleStats,
  PaginationParams,
  PaginatedResponse,
} from '@/types';

// ========== 生命周期规则管理 ==========

// 获取规则列表
export const getLifecycleRules = (params?: PaginationParams & { type?: string; enabled?: boolean }) => {
  return request.get<PaginatedResponse<LifecycleRule>>('/devices/lifecycle/rules', { params });
};

// 获取规则详情
export const getLifecycleRule = (id: string) => {
  return request.get<LifecycleRule>(`/devices/lifecycle/rules/${id}`);
};

// 创建规则
export const createLifecycleRule = (data: CreateLifecycleRuleDto) => {
  return request.post<LifecycleRule>('/devices/lifecycle/rules', data);
};

// 更新规则
export const updateLifecycleRule = (id: string, data: UpdateLifecycleRuleDto) => {
  return request.put<LifecycleRule>(`/devices/lifecycle/rules/${id}`, data);
};

// 删除规则
export const deleteLifecycleRule = (id: string) => {
  return request.delete(`/devices/lifecycle/rules/${id}`);
};

// 启用/禁用规则
export const toggleLifecycleRule = (id: string, enabled: boolean) => {
  return request.patch(`/devices/lifecycle/rules/${id}/toggle`, { enabled });
};

// 手动执行规则
export const executeLifecycleRule = (id: string) => {
  return request.post<LifecycleExecutionHistory>(`/devices/lifecycle/rules/${id}/execute`);
};

// 测试规则
export const testLifecycleRule = (id: string, dryRun: boolean = true) => {
  return request.post(`/devices/lifecycle/rules/${id}/test`, { dryRun });
};

// ========== 执行历史 ==========

// 获取执行历史
export const getLifecycleHistory = (
  params?: PaginationParams & { ruleId?: string; status?: string; startDate?: string; endDate?: string }
) => {
  return request.get<PaginatedResponse<LifecycleExecutionHistory>>('/devices/lifecycle/history', { params });
};

// 获取执行详情
export const getLifecycleExecution = (id: string) => {
  return request.get<LifecycleExecutionHistory>(`/devices/lifecycle/history/${id}`);
};

// ========== 统计信息 ==========

// 获取生命周期统计
export const getLifecycleStats = () => {
  return request.get<LifecycleStats>('/devices/lifecycle/stats');
};

// 获取规则执行趋势
export const getLifecycleExecutionTrend = (type?: string, days: number = 30) => {
  return request.get('/devices/lifecycle/execution-trend', {
    params: { type, days },
  });
};

// ========== 规则模板 ==========

// 获取规则模板
export const getLifecycleRuleTemplates = () => {
  return request.get('/devices/lifecycle/templates');
};

// 从模板创建规则
export const createRuleFromTemplate = (templateId: string, customConfig?: Record<string, any>) => {
  return request.post<LifecycleRule>(`/devices/lifecycle/templates/${templateId}/create`, { config: customConfig });
};
