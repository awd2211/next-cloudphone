import React from 'react';
import { Card, Space, Result, Button, Spin } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks';
import { useRefundManagement } from '@/hooks/useRefundManagement';
import {
  RefundHeader,
  RefundTable,
  RefundDetailModal,
  RefundApproveModal,
  RefundRejectModal,
} from '@/components/Refund';

const RefundManagement: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, loading: permissionLoading } = usePermission();

  // 权限检查
  if (permissionLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" tip="正在加载权限..." />
      </div>
    );
  }

  if (!hasPermission('payment:refund:view')) {
    return (
      <div style={{ padding: '24px' }}>
        <Result
          status="403"
          title="403"
          subTitle="抱歉，您没有权限访问此页面。"
          icon={<LockOutlined />}
          extra={
            <Button type="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
          }
        />
      </div>
    );
  }

  return <RefundManagementContent />;
};

const RefundManagementContent: React.FC = () => {
  const { hasPermission } = usePermission();
  const {
    loading,
    refunds,
    selectedRefund,
    approveModalVisible,
    rejectModalVisible,
    detailModalVisible,
    loadRefunds,
    handleApprove,
    handleReject,
    showDetail,
    showApproveModal,
    showRejectModal,
    closeDetail,
    closeApproveModal,
    closeRejectModal,
  } = useRefundManagement();

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <RefundHeader refundCount={refunds.length} onRefresh={loadRefunds} />

        {/* 退款列表 */}
        <Card>
          <RefundTable
            refunds={refunds}
            loading={loading}
            hasApprovePermission={hasPermission('payment:refund:approve')}
            hasRejectPermission={hasPermission('payment:refund:reject')}
            onViewDetail={showDetail}
            onApprove={showApproveModal}
            onReject={showRejectModal}
          />
        </Card>
      </Space>

      {/* 退款详情对话框 */}
      <RefundDetailModal visible={detailModalVisible} refund={selectedRefund} onCancel={closeDetail} />

      {/* 批准退款对话框 */}
      <RefundApproveModal
        visible={approveModalVisible}
        refund={selectedRefund}
        onCancel={closeApproveModal}
        onSubmit={handleApprove}
      />

      {/* 拒绝退款对话框 */}
      <RefundRejectModal
        visible={rejectModalVisible}
        refund={selectedRefund}
        onCancel={closeRejectModal}
        onSubmit={handleReject}
      />
    </div>
  );
};

export default RefundManagement;
