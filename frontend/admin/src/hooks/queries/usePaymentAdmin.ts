/**
 * PaymentAdmin React Query Hooks
 *
 * 基于 @/services/payment-admin
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as paymentAdminService from '@/services/payment-admin';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import {
  PaymentStatisticsSchema,
  PaymentDetailSchema,
  PaymentConfigSchema,
} from '@/schemas/api.schemas';
import type {
  PaymentConfig,
  PaymentListParams,
  RefundRequest,
} from '@/services/payment-admin';

/**
 * Query Keys
 */
export const paymentAdminKeys = {
  all: ['payment-admin'] as const,
  statistics: (params?: { startDate?: string; endDate?: string }) =>
    [...paymentAdminKeys.all, 'statistics', params] as const,
  methodsStats: (params?: { startDate?: string; endDate?: string }) =>
    [...paymentAdminKeys.all, 'methods-stats', params] as const,
  dailyStats: (days: number) => [...paymentAdminKeys.all, 'daily-stats', days] as const,
  payments: (params?: PaymentListParams) => [...paymentAdminKeys.all, 'payments', params] as const,
  payment: (id: string) => [...paymentAdminKeys.all, 'payment', id] as const,
  pendingRefunds: () => [...paymentAdminKeys.all, 'pending-refunds'] as const,
  exceptions: (page: number, limit: number) =>
    [...paymentAdminKeys.all, 'exceptions', { page, limit }] as const,
  config: () => [...paymentAdminKeys.all, 'config'] as const,
  webhookLogs: (params?: { page?: number; limit?: number; provider?: string }) =>
    [...paymentAdminKeys.all, 'webhook-logs', params] as const,
};

/**
 * 获取支付统计数据
 */
export const usePaymentStatistics = (startDate?: string, endDate?: string) => {
  return useValidatedQuery({
    queryKey: paymentAdminKeys.statistics({ startDate, endDate }),
    queryFn: () => paymentAdminService.getPaymentStatistics(startDate, endDate),
    schema: PaymentStatisticsSchema,
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 获取支付方式统计
 */
export const usePaymentMethodsStats = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: paymentAdminKeys.methodsStats({ startDate, endDate }),
    queryFn: () => paymentAdminService.getPaymentMethodsStats(startDate, endDate),
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 获取每日统计
 */
export const useDailyStatistics = (days: number = 30) => {
  return useQuery({
    queryKey: paymentAdminKeys.dailyStats(days),
    queryFn: () => paymentAdminService.getDailyStatistics(days),
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 获取所有支付记录（管理员）
 */
export const useAdminPayments = (params: PaymentListParams) => {
  return useQuery({
    queryKey: paymentAdminKeys.payments(params),
    queryFn: () => paymentAdminService.getAdminPayments(params),
  });
};

/**
 * 获取支付详情（管理员）
 */
export const useAdminPaymentDetail = (id: string) => {
  return useValidatedQuery({
    queryKey: paymentAdminKeys.payment(id),
    queryFn: () => paymentAdminService.getAdminPaymentDetail(id),
    schema: PaymentDetailSchema,
    enabled: !!id,
  });
};

/**
 * 获取待审核退款列表
 */
export const usePendingRefunds = () => {
  return useQuery({
    queryKey: paymentAdminKeys.pendingRefunds(),
    queryFn: () => paymentAdminService.getPendingRefunds(),
    refetchInterval: 60 * 1000, // 待审核退款 - 中等实时性
  });
};

/**
 * 获取异常支付列表
 */
export const useExceptionPayments = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: paymentAdminKeys.exceptions(page, limit),
    queryFn: () => paymentAdminService.getExceptionPayments(page, limit),
  });
};

/**
 * 获取支付配置
 */
export const usePaymentConfig = () => {
  return useValidatedQuery({
    queryKey: paymentAdminKeys.config(),
    queryFn: () => paymentAdminService.getPaymentConfig(),
    schema: PaymentConfigSchema,
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};

/**
 * 获取 Webhook 日志
 */
export const useWebhookLogs = (params?: { page?: number; limit?: number; provider?: string }) => {
  return useQuery({
    queryKey: paymentAdminKeys.webhookLogs(params),
    queryFn: () => paymentAdminService.getWebhookLogs(params || {}),
  });
};

/**
 * 手动发起退款 Mutation
 */
export const useManualRefund = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, data }: { paymentId: string; data: RefundRequest }) =>
      paymentAdminService.manualRefund(paymentId, data),
    onSuccess: (_, { paymentId }) => {
      queryClient.invalidateQueries({ queryKey: paymentAdminKeys.payments() });
      queryClient.invalidateQueries({ queryKey: paymentAdminKeys.payment(paymentId) });
      queryClient.invalidateQueries({ queryKey: paymentAdminKeys.statistics() });
      message.success('退款成功');
    },
    onError: () => {
      message.error('退款失败');
    },
  });
};

/**
 * 批准退款 Mutation
 */
export const useApproveRefund = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, adminNote }: { paymentId: string; adminNote?: string }) =>
      paymentAdminService.approveRefund(paymentId, adminNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentAdminKeys.pendingRefunds() });
      queryClient.invalidateQueries({ queryKey: paymentAdminKeys.payments() });
      message.success('退款已批准');
    },
    onError: () => {
      message.error('批准退款失败');
    },
  });
};

/**
 * 拒绝退款 Mutation
 */
export const useRejectRefund = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paymentId,
      reason,
      adminNote,
    }: {
      paymentId: string;
      reason: string;
      adminNote?: string;
    }) => paymentAdminService.rejectRefund(paymentId, reason, adminNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentAdminKeys.pendingRefunds() });
      queryClient.invalidateQueries({ queryKey: paymentAdminKeys.payments() });
      message.success('已拒绝退款');
    },
    onError: () => {
      message.error('拒绝退款失败');
    },
  });
};

/**
 * 手动同步支付状态 Mutation
 */
export const useSyncPaymentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: string) => paymentAdminService.syncPaymentStatus(paymentId),
    onSuccess: (_, paymentId) => {
      queryClient.invalidateQueries({ queryKey: paymentAdminKeys.payment(paymentId) });
      message.success('同步成功');
    },
    onError: () => {
      message.error('同步失败');
    },
  });
};

/**
 * 更新支付配置 Mutation
 */
export const useUpdatePaymentConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: Partial<PaymentConfig>) => paymentAdminService.updatePaymentConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentAdminKeys.config() });
      message.success('配置更新成功');
    },
    onError: () => {
      message.error('配置更新失败');
    },
  });
};

/**
 * 测试支付提供商连接 Mutation
 */
export const useTestPaymentProviderConnection = () => {
  return useMutation({
    mutationFn: (provider: string) => paymentAdminService.testProviderConnection(provider),
    onSuccess: () => {
      message.success('连接测试成功');
    },
    onError: () => {
      message.error('连接测试失败');
    },
  });
};

/**
 * 导出支付数据 Mutation
 */
export const useExportPayments = () => {
  return useMutation({
    mutationFn: (params: {
      startDate?: string;
      endDate?: string;
      status?: string;
      method?: string;
    }) => paymentAdminService.downloadExcelFile(params),
    onSuccess: () => {
      message.success('导出成功');
    },
    onError: () => {
      message.error('导出失败');
    },
  });
};
