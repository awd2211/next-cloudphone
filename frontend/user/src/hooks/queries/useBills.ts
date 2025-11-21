/**
 * 账单管理 React Query Hooks (用户端)
 *
 * 提供账单列表、详情、支付、取消、下载等功能
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import type {
  Bill,
  BillListQuery,
  BillListResponse,
  BillStats,
  PaymentRequest,
  PaymentResult,
  Invoice,
  InvoiceRequest,
} from '@/services/billing';
import * as billingService from '@/services/billing';
import { triggerDownload } from '@/services/export';
import {
  getErrorMessage,
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig } from '../utils/cacheConfig';

// ==================== Query Keys ====================

export const billKeys = {
  all: ['bills'] as const,
  lists: () => [...billKeys.all, 'list'] as const,
  list: (params?: BillListQuery) => [...billKeys.lists(), params] as const,
  details: () => [...billKeys.all, 'detail'] as const,
  detail: (id: string) => [...billKeys.details(), id] as const,
  stats: (params?: { startDate?: string; endDate?: string }) =>
    [...billKeys.all, 'stats', params] as const,
  invoices: () => [...billKeys.all, 'invoices'] as const,
  invoiceList: (params?: { page?: number; pageSize?: number }) =>
    [...billKeys.invoices(), params] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取账单列表
 */
export const useBills = (params?: BillListQuery) => {
  return useQuery<BillListResponse>({
    queryKey: billKeys.list(params),
    queryFn: () => billingService.getBills(params),
    staleTime: StaleTimeConfig.bills,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * 获取账单详情
 */
export const useBillDetail = (id: string, options?: { enabled?: boolean }) => {
  return useQuery<Bill>({
    queryKey: billKeys.detail(id),
    queryFn: () => billingService.getBillDetail(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: StaleTimeConfig.billDetail,
  });
};

/**
 * 获取账单统计
 */
export const useBillStats = (params?: { startDate?: string; endDate?: string }) => {
  return useQuery<BillStats>({
    queryKey: billKeys.stats(params),
    queryFn: () => billingService.getBillStats(params),
    staleTime: StaleTimeConfig.billDetail,
  });
};

/**
 * 获取发票列表
 */
export const useInvoices = (params?: { page?: number; pageSize?: number }) => {
  return useQuery<{ items: Invoice[]; total: number }>({
    queryKey: billKeys.invoiceList(params),
    queryFn: () => billingService.getInvoices(params),
    staleTime: StaleTimeConfig.bills,
  });
};

// ==================== Mutation Hooks ====================

/**
 * 支付账单
 */
export const usePayBill = () => {
  const queryClient = useQueryClient();

  return useMutation<PaymentResult, unknown, PaymentRequest>({
    mutationFn: (data) => billingService.payBill(data),
    onSuccess: (result, variables) => {
      if (result.success) {
        if (result.redirectUrl) {
          // 如果需要跳转到第三方支付
          window.location.href = result.redirectUrl;
        } else {
          handleMutationSuccess('支付成功！');
          // 刷新账单列表和统计
          queryClient.invalidateQueries({ queryKey: billKeys.lists() });
          queryClient.invalidateQueries({ queryKey: billKeys.stats() });
          queryClient.invalidateQueries({ queryKey: billKeys.detail(variables.billId) });
        }
      } else {
        message.error(result.message || '支付失败');
      }
    },
    onError: (error) => {
      handleMutationError(error, '支付失败');
    },
  });
};

/**
 * 取消账单
 */
export const useCancelBill = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string>({
    mutationFn: (id) => billingService.cancelBill(id),
    onSuccess: (_, id) => {
      handleMutationSuccess('账单已取消');
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
      queryClient.invalidateQueries({ queryKey: billKeys.stats() });
      queryClient.invalidateQueries({ queryKey: billKeys.detail(id) });
    },
    onError: (error) => {
      handleMutationError(error, '取消失败');
    },
  });
};

/**
 * 申请退款
 */
export const useRequestRefund = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) => billingService.requestRefund(id, reason),
    onSuccess: (_, { id }) => {
      handleMutationSuccess('退款申请已提交');
      queryClient.invalidateQueries({ queryKey: billKeys.lists() });
      queryClient.invalidateQueries({ queryKey: billKeys.detail(id) });
    },
    onError: (error) => {
      handleMutationError(error, '退款申请失败');
    },
  });
};

/**
 * 下载账单
 */
export const useDownloadBill = () => {
  return useMutation<Blob, unknown, Bill>({
    mutationFn: (bill) => billingService.downloadBill(bill.id),
    onMutate: () => {
      message.loading({ content: '正在下载...', key: 'download-bill' });
    },
    onSuccess: (blob, bill) => {
      triggerDownload(blob, `账单-${bill.billNo}.pdf`);
      message.success({ content: '下载成功！', key: 'download-bill' });
    },
    onError: (error) => {
      message.error({ content: getErrorMessage(error), key: 'download-bill' });
    },
  });
};

/**
 * 申请发票
 */
export const useApplyInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<Invoice, unknown, InvoiceRequest>({
    mutationFn: (data) => billingService.applyInvoice(data),
    onSuccess: () => {
      handleMutationSuccess('发票申请已提交');
      queryClient.invalidateQueries({ queryKey: billKeys.invoices() });
    },
    onError: (error) => {
      handleMutationError(error, '发票申请失败');
    },
  });
};

/**
 * 下载发票
 */
export const useDownloadInvoice = () => {
  return useMutation<Blob, unknown, { id: string; invoiceNo: string }>({
    mutationFn: ({ id }) => billingService.downloadInvoice(id),
    onMutate: () => {
      message.loading({ content: '正在下载发票...', key: 'download-invoice' });
    },
    onSuccess: (blob, { invoiceNo }) => {
      triggerDownload(blob, `发票-${invoiceNo}.pdf`);
      message.success({ content: '下载成功！', key: 'download-invoice' });
    },
    onError: (error) => {
      message.error({ content: getErrorMessage(error), key: 'download-invoice' });
    },
  });
};
