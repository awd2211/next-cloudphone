import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import {
  getExceptionPayments,
  syncPaymentStatus,
  type PaymentDetail,
} from '@/services/payment-admin';

export const useExceptionPayments = () => {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<PaymentDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetail | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // 加载异常支付记录
  const loadExceptionPayments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getExceptionPayments(page, pageSize);
      setPayments(result.data || []);
      setTotal(result.pagination?.total || 0);
    } catch (error) {
      message.error('加载异常支付记录失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

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
