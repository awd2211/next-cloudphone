import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  getBillingRules,
  createBillingRule,
  updateBillingRule,
  deleteBillingRule,
  toggleBillingRule,
  testBillingRule,
  getBillingRuleTemplates,
} from '@/services/billing';
import type { CreateBillingRuleDto, UpdateBillingRuleDto, PaginationParams } from '@/types';
import {
  BillingRulesResponseSchema,
  BillingRuleTemplatesResponseSchema,
} from '@/schemas/api.schemas';

// Query Keys
export const billingRuleKeys = {
  all: ['billingRules'] as const,
  lists: () => [...billingRuleKeys.all, 'list'] as const,
  list: (params?: PaginationParams & { isActive?: boolean }) =>
    [...billingRuleKeys.lists(), params] as const,
  templates: () => [...billingRuleKeys.all, 'templates'] as const,
};

// Queries
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
