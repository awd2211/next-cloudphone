import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import {
  getExceptionPayments,
  syncPaymentStatus,
  type PaymentDetail,
} from '@/services/payment-admin';
import { useSafeApi } from './useSafeApi';
import { ExceptionPaymentsResponseSchema } from '@/schemas/api.schemas';

export const useExceptionPayments = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetail | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // ✅ 使用 useSafeApi 加载异常支付记录
  const {
    data: paymentsResponse,
    loading,
    execute: executeLoadPayments,
  } = useSafeApi(
    () => getExceptionPayments(page, pageSize),
    ExceptionPaymentsResponseSchema,
    {
      errorMessage: '加载异常支付记录失败',
      fallbackValue: { data: [], pagination: { total: 0 } },
    }
  );

  const payments = paymentsResponse?.data || [];
  const total = paymentsResponse?.pagination?.total || 0;

  // 加载异常支付记录的包装函数
  const loadExceptionPayments = useCallback(async () => {
    await executeLoadPayments();
  }, [executeLoadPayments]);

  useEffect(() => {
    loadExceptionPayments();
  }, [loadExceptionPayments]);

  // 同步支付状态
  const handleSyncStatus = useCallback(
    async (paymentId: string) => {
      setSyncingId(paymentId);
      try {
        await syncPaymentStatus(paymentId);
        message.success('同步成功');
        loadExceptionPayments();
      } catch (error) {
        message.error('同步失败');
      } finally {
        setSyncingId(null);
      }
    },
    [loadExceptionPayments]
  );

  // 显示详情
  const showDetail = useCallback((payment: PaymentDetail) => {
    setSelectedPayment(payment);
    setDetailModalVisible(true);
  }, []);

  // 关闭详情
  const closeDetail = useCallback(() => {
    setDetailModalVisible(false);
  }, []);

  // 分页变化
  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  }, []);

  return {
    // 状态
    loading,
    payments,
    total,
    page,
    pageSize,
    selectedPayment,
    detailModalVisible,
    syncingId,
    // 操作
    loadExceptionPayments,
    handleSyncStatus,
    showDetail,
    closeDetail,
    handlePageChange,
  };
};
