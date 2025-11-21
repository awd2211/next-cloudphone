/**
 * Lifecycle React Query Hooks
 *
 * 基于 @/services/lifecycle
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as lifecycleService from '@/services/lifecycle';
import { useValidatedQuery } from './useValidatedQuery';
import {
  LifecycleRuleSchema,
  LifecycleExecutionHistorySchema,
  LifecycleStatsSchema,
  PaginatedResponseSchema,
} from '@/schemas/api.schemas';
import type {
  
  CreateLifecycleRuleDto,
  UpdateLifecycleRuleDto,
  
  
  PaginationParams,
} from '@/types';

/**
 * Query Keys
 */
export const lifecycleKeys = {
  all: ['lifecycle'] as const,
  // Rules
  rules: () => [...lifecycleKeys.all, 'rules'] as const,
  ruleList: (params?: PaginationParams & { type?: string; enabled?: boolean }) =>
    [...lifecycleKeys.rules(), params] as const,
  rule: (id: string) => [...lifecycleKeys.all, 'rule', id] as const,
  // History
  history: (params?: PaginationParams & { ruleId?: string; status?: string; startDate?: string; endDate?: string }) =>
    [...lifecycleKeys.all, 'history', params] as const,
  execution: (id: string) => [...lifecycleKeys.all, 'execution', id] as const,
  // Stats
  stats: () => [...lifecycleKeys.all, 'stats'] as const,
  executionTrend: (type?: string, days?: number) =>
    [...lifecycleKeys.all, 'execution-trend', { type, days }] as const,
  // Templates
  templates: () => [...lifecycleKeys.all, 'templates'] as const,
};

// ========== 生命周期规则管理 ==========

/**
 * 获取规则列表
 */
export const useLifecycleRules = (params?: PaginationParams & { type?: string; enabled?: boolean }) => {
  return useValidatedQuery({
    queryKey: lifecycleKeys.ruleList(params),
    queryFn: () => lifecycleService.getLifecycleRules(params),
    schema: PaginatedResponseSchema(LifecycleRuleSchema),
  });
};

/**
 * 获取规则详情
 */
export const useLifecycleRule = (id: string) => {
  return useValidatedQuery({
    queryKey: lifecycleKeys.rule(id),
    queryFn: () => lifecycleService.getLifecycleRule(id).then((res: any) => res.data),
    schema: LifecycleRuleSchema,
    enabled: !!id,
  });
};

/**
 * 创建规则 Mutation
 */
export const useCreateLifecycleRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLifecycleRuleDto) => lifecycleService.createLifecycleRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifecycleKeys.rules() });
      queryClient.invalidateQueries({ queryKey: lifecycleKeys.stats() });
      message.success('规则创建成功');
    },
    onError: () => {
      message.error('规则创建失败');
    },
  });
};

/**
 * 更新规则 Mutation
 */
export const useUpdateLifecycleRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLifecycleRuleDto }) =>
      lifecycleService.updateLifecycleRule(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: lifecycleKeys.rules() });
      queryClient.invalidateQueries({ queryKey: lifecycleKeys.rule(id) });
      message.success('规则更新成功');
    },
    onError: () => {
      message.error('规则更新失败');
    },
  });
};

/**
 * 删除规则 Mutation
 */
export const useDeleteLifecycleRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => lifecycleService.deleteLifecycleRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifecycleKeys.rules() });
      queryClient.invalidateQueries({ queryKey: lifecycleKeys.stats() });
      message.success('规则删除成功');
    },
    onError: () => {
      message.error('规则删除失败');
    },
  });
};

/**
 * 启用/禁用规则 Mutation
 */
export const useToggleLifecycleRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      lifecycleService.toggleLifecycleRule(id, enabled),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: lifecycleKeys.rule(id) });
      queryClient.invalidateQueries({ queryKey: lifecycleKeys.rules() });
      message.success('规则状态更新成功');
    },
    onError: () => {
      message.error('规则状态更新失败');
    },
  });
};

/**
 * 手动执行规则 Mutation
 */
export const useExecuteLifecycleRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => lifecycleService.executeLifecycleRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifecycleKeys.history() });
      message.success('规则执行已启动');
    },
    onError: () => {
      message.error('规则执行失败');
    },
  });
};

/**
 * 测试规则 Mutation
 */
export const useTestLifecycleRule = () => {
  return useMutation({
    mutationFn: ({ id, dryRun = true }: { id: string; dryRun?: boolean }) =>
      lifecycleService.testLifecycleRule(id, dryRun),
    onSuccess: () => {
      message.success('测试完成');
    },
    onError: () => {
      message.error('测试失败');
    },
  });
};

// ========== 执行历史 ==========

/**
 * 获取执行历史
 */
export const useLifecycleHistory = (
  params?: PaginationParams & {
    ruleId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }
) => {
  return useValidatedQuery({
    queryKey: lifecycleKeys.history(params),
    queryFn: () => lifecycleService.getLifecycleHistory(params),
    schema: PaginatedResponseSchema(LifecycleExecutionHistorySchema),
  });
};

/**
 * 获取执行详情
 */
export const useLifecycleExecution = (id: string) => {
  return useValidatedQuery({
    queryKey: lifecycleKeys.execution(id),
    queryFn: () => lifecycleService.getLifecycleExecution(id).then((res: any) => res.data),
    schema: LifecycleExecutionHistorySchema,
    enabled: !!id,
  });
};

// ========== 统计信息 ==========

/**
 * 获取生命周期统计
 */
export const useLifecycleStats = () => {
  return useValidatedQuery({
    queryKey: lifecycleKeys.stats(),
    queryFn: () => lifecycleService.getLifecycleStats().then((res: any) => res.data),
    schema: LifecycleStatsSchema,
    staleTime: 30 * 1000, // 30秒
  });
};

/**
 * 获取规则执行趋势
 */
export const useLifecycleExecutionTrend = (type?: string, days: number = 30) => {
  return useQuery({
    queryKey: lifecycleKeys.executionTrend(type, days),
    queryFn: () => lifecycleService.getLifecycleExecutionTrend(type, days).then((res: any) => res.data),
  });
};

// ========== 规则模板 ==========

/**
 * 获取规则模板
 */
export const useLifecycleRuleTemplates = () => {
  return useQuery({
    queryKey: lifecycleKeys.templates(),
    queryFn: () => lifecycleService.getLifecycleRuleTemplates().then((res: any) => res.data),
    staleTime: 10 * 60 * 1000, // 10分钟
  });
};

/**
 * 从模板创建规则 Mutation
 */
export const useCreateRuleFromTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, customConfig }: { templateId: string; customConfig?: Record<string, any> }) =>
      lifecycleService.createRuleFromTemplate(templateId, customConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifecycleKeys.rules() });
      message.success('从模板创建规则成功');
    },
    onError: () => {
      message.error('从模板创建规则失败');
    },
  });
};
