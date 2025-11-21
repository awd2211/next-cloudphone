/**
 * Billing React Query Hooks
 *
 * 提供计费规则、账单管理等功能的 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  getBillingRules,
  getBillingRule,
  createBillingRule,
  updateBillingRule,
  deleteBillingRule,
  toggleBillingRule,
  testBillingRule,
  getBillingRuleTemplates,
  getUserBill,
  exportUserBill,
} from '@/services/billing';
import type { CreateBillingRuleDto, UpdateBillingRuleDto, PaginationParams } from '@/types';
import {
  BillingRulesResponseSchema,
  BillingRuleTemplatesResponseSchema,
} from '@/schemas/api.schemas';

// ==================== Query Keys ====================
export const billingKeys = {
  all: ['billing'] as const,
  rules: () => [...billingKeys.all, 'rules'] as const,
  rulesList: (params?: PaginationParams & { isActive?: boolean }) =>
    [...billingKeys.rules(), 'list', params] as const,
  ruleDetail: (id: string) => [...billingKeys.rules(), id] as const,
  ruleTemplates: () => [...billingKeys.rules(), 'templates'] as const,
  bills: () => [...billingKeys.all, 'bills'] as const,
  userBill: (userId: string, startDate: string, endDate: string) =>
    [...billingKeys.bills(), 'user', userId, { startDate, endDate }] as const,
};

// 向后兼容别名
export const billingRuleKeys = {
  all: billingKeys.rules(),
  lists: billingKeys.rules,
  list: billingKeys.rulesList,
  templates: billingKeys.ruleTemplates,
};

// ==================== 计费规则查询 ====================
export function useBillingRules(params?: PaginationParams & { isActive?: boolean }) {
  return useQuery({
    queryKey: billingRuleKeys.list(params),
    queryFn: async () => {
      const response = await getBillingRules(params || {});
      // ✅ 添加 Zod 验证
      const validated = BillingRulesResponseSchema.parse(response);
      return validated;
    },
    staleTime: 30 * 1000,
  });
}

export function useBillingRuleTemplates() {
  return useQuery({
    queryKey: billingRuleKeys.templates(),
    queryFn: async () => {
      const response = await getBillingRuleTemplates();
      // ✅ 添加 Zod 验证
      const validated = BillingRuleTemplatesResponseSchema.parse(response);
      return validated;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

// Mutations
export function useCreateBillingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBillingRuleDto) => createBillingRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingRuleKeys.lists() });
      message.success('计费规则创建成功');
    },
    onError: (error: any) => {
      message.error(error.message || '创建失败');
    },
  });
}

export function useUpdateBillingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBillingRuleDto }) =>
      updateBillingRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingRuleKeys.lists() });
      message.success('计费规则更新成功');
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败');
    },
  });
}

export function useDeleteBillingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBillingRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingRuleKeys.lists() });
      message.success('计费规则删除成功');
    },
    onError: () => {
      message.error('删除失败');
    },
  });
}

export function useToggleBillingRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleBillingRule(id, isActive),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: billingRuleKeys.lists() });
      message.success(`规则已${isActive ? '激活' : '停用'}`);
    },
    onError: () => {
      message.error('操作失败');
    },
  });
}

export function useTestBillingRule() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => testBillingRule(id, data),
    onSuccess: () => {
      message.success('测试完成');
    },
    onError: () => {
      message.error('测试失败');
    },
  });
}

/**
 * 获取单个计费规则详情
 */
export function useBillingRule(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: billingKeys.ruleDetail(id),
    queryFn: () => getBillingRule(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: 30 * 1000,
  });
}

// ==================== 账单管理 ====================

/**
 * 获取用户账单
 */
export function useUserBill(
  userId: string,
  startDate: string,
  endDate: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: billingKeys.userBill(userId, startDate, endDate),
    queryFn: () => getUserBill(userId, startDate, endDate),
    enabled: options?.enabled !== false && !!userId && !!startDate && !!endDate,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * 导出用户账单
 */
export function useExportUserBill() {
  return useMutation({
    mutationFn: (params: {
      userId: string;
      startDate: string;
      endDate: string;
      format?: 'excel' | 'csv';
    }) => exportUserBill(params.userId, params.startDate, params.endDate, params.format),
    onSuccess: () => {
      message.success('账单导出成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '账单导出失败');
    },
  });
}
