import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import {
  getPendingRefunds,
  approveRefund,
  rejectRefund,
  type PaymentDetail,
} from '@/services/payment-admin';

export const useRefundManagement = () => {
  const [loading, setLoading] = useState(false);
  const [refunds, setRefunds] = useState<PaymentDetail[]>([]);
  const [selectedRefund, setSelectedRefund] = useState<PaymentDetail | null>(null);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // 加载待审核退款列表
  const loadRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPendingRefunds();
      setRefunds(res.data);
    } catch (error) {
      message.error('加载退款列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  // 批准退款
  const handleApprove = useCallback(
    async (values: { adminNote?: string }) => {
      if (!selectedRefund) return;
      try {
        await approveRefund(selectedRefund.id, values.adminNote);
        message.success('退款已批准');
        setApproveModalVisible(false);
        loadRefunds();
      } catch (error) {
        message.error('批准退款失败');
      }
    },
    [selectedRefund, loadRefunds]
  );

  // 拒绝退款
  const handleReject = useCallback(
    async (values: { reason: string; adminNote?: string }) => {
      if (!selectedRefund) return;
      try {
        await rejectRefund(selectedRefund.id, values.reason, values.adminNote);
        message.success('退款已拒绝');
        setRejectModalVisible(false);
        loadRefunds();
      } catch (error) {
        message.error('拒绝退款失败');
      }
    },
    [selectedRefund, loadRefunds]
  );

  // 显示详情
  const showDetail = useCallback((refund: PaymentDetail) => {
    setSelectedRefund(refund);
    setDetailModalVisible(true);
  }, []);

  // 显示批准对话框
  const showApproveModal = useCallback((refund: PaymentDetail) => {
    setSelectedRefund(refund);
    setApproveModalVisible(true);
  }, []);

  // 显示拒绝对话框
  const showRejectModal = useCallback((refund: PaymentDetail) => {
    setSelectedRefund(refund);
    setRejectModalVisible(true);
  }, []);

  // 关闭详情
  const closeDetail = useCallback(() => {
    setDetailModalVisible(false);
  }, []);

  // 关闭批准对话框
  const closeApproveModal = useCallback(() => {
    setApproveModalVisible(false);
  }, []);

  // 关闭拒绝对话框
  const closeRejectModal = useCallback(() => {
    setRejectModalVisible(false);
  }, []);

  return {
    // 状态
    loading,
    refunds,
    selectedRefund,
    approveModalVisible,
    rejectModalVisible,
    detailModalVisible,
    // 操作
    loadRefunds,
    handleApprove,
    handleReject,
    showDetail,
    showApproveModal,
    showRejectModal,
    closeDetail,
    closeApproveModal,
    closeRejectModal,
  };
};
