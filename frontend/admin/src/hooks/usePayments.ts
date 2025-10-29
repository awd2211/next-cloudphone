import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  getAdminPayments,
  manualRefund,
  syncPaymentStatus,
  downloadExcelFile,
  type PaymentDetail,
  type PaymentListParams,
} from '@/services/payment-admin';

// Query Keys
export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (params?: PaymentListParams) => [...paymentKeys.lists(), params] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
};

// Queries
export function usePayments(params?: PaymentListParams) {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: async () => {
      const response = await getAdminPayments(params || {});
      return {
        data: response.data.data,
        pagination: response.data.pagination,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Mutations
export function useSyncPaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: string) => syncPaymentStatus(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      message.success('同步成功');
    },
    onError: (error: any) => {
      message.error(`同步失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

export function useManualRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paymentId,
      data,
    }: {
      paymentId: string;
      data: { amount?: number; reason: string; adminNote?: string };
    }) => manualRefund(paymentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      message.success('退款成功');
    },
    onError: (error: any) => {
      message.error(`退款失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

export function useExportPayments() {
  return useMutation({
    mutationFn: (params: {
      startDate?: string;
      endDate?: string;
      status?: string;
      method?: string;
    }) => downloadExcelFile(params),
    onSuccess: () => {
      message.success('导出成功');
    },
    onError: (error: any) => {
      message.error(`导出失败: ${error.response?.data?.message || error.message}`);
    },
  });
}
