/**
 * 设备生命周期管理 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
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
export const getLifecycleRules = (
  params?: PaginationParams & { type?: string; enabled?: boolean }
): Promise<PaginatedResponse<LifecycleRule>> =>
  api.get<PaginatedResponse<LifecycleRule>>('/devices/lifecycle/rules', { params });

// 获取规则详情
export const getLifecycleRule = (id: string): Promise<LifecycleRule> =>
  api.get<LifecycleRule>(`/devices/lifecycle/rules/${id}`);

// 创建规则
export const createLifecycleRule = (data: CreateLifecycleRuleDto): Promise<LifecycleRule> =>
  api.post<LifecycleRule>('/devices/lifecycle/rules', data);

// 更新规则
export const updateLifecycleRule = (
  id: string,
  data: UpdateLifecycleRuleDto
): Promise<LifecycleRule> =>
  api.put<LifecycleRule>(`/devices/lifecycle/rules/${id}`, data);

// 删除规则
export const deleteLifecycleRule = (id: string): Promise<void> =>
  api.delete(`/devices/lifecycle/rules/${id}`);

// 启用/禁用规则
export const toggleLifecycleRule = (id: string, enabled: boolean): Promise<void> =>
  api.patch(`/devices/lifecycle/rules/${id}/toggle`, { enabled });

// 手动执行规则
export const executeLifecycleRule = (id: string): Promise<LifecycleExecutionHistory> =>
  api.post<LifecycleExecutionHistory>(`/devices/lifecycle/rules/${id}/execute`);

// 测试规则
export const testLifecycleRule = (id: string, dryRun: boolean = true): Promise<any> =>
  api.post(`/devices/lifecycle/rules/${id}/test`, { dryRun });

// ========== 执行历史 ==========

// 获取执行历史
export const getLifecycleHistory = (
  params?: PaginationParams & {
    ruleId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<PaginatedResponse<LifecycleExecutionHistory>> =>
  api.get<PaginatedResponse<LifecycleExecutionHistory>>('/devices/lifecycle/history', {
    params,
  });

// 获取执行详情
export const getLifecycleExecution = (id: string): Promise<LifecycleExecutionHistory> =>
  api.get<LifecycleExecutionHistory>(`/devices/lifecycle/history/${id}`);

// ========== 统计信息 ==========

// 获取生命周期统计
export const getLifecycleStats = (): Promise<LifecycleStats> =>
  api.get<LifecycleStats>('/devices/lifecycle/stats');

// 获取规则执行趋势
export const getLifecycleExecutionTrend = (
  type?: string,
  days: number = 30
): Promise<any> =>
  api.get('/devices/lifecycle/execution-trend', {
    params: { type, days },
  });

// ========== 规则模板 ==========

// 获取规则模板
export const getLifecycleRuleTemplates = (): Promise<any> =>
  api.get('/devices/lifecycle/rules/templates');

// 从模板创建规则
export const createRuleFromTemplate = (
  templateId: string,
  customConfig?: Record<string, any>
): Promise<LifecycleRule> =>
  api.post<LifecycleRule>(`/devices/lifecycle/rules/templates/${templateId}/create`, {
    config: customConfig,
  });
