import React from 'react';
import { Card, Space, Result, Button, Spin } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks';
import { useExceptionPayments } from '@/hooks/useExceptionPayments';
import {
  ExceptionHeader,
  ExceptionInfoAlert,
  ExceptionTable,
  ExceptionDetailModal,
} from '@/components/Exception';

const ExceptionPayments: React.FC = () => {
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

  if (!hasPermission('payment:exception:view')) {
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

  return <ExceptionPaymentsContent />;
};

const ExceptionPaymentsContent: React.FC = () => {
  const { hasPermission } = usePermission();
  const {
    loading,
    payments,
    total,
    page,
    pageSize,
    selectedPayment,
    detailModalVisible,
    syncingId,
    loadExceptionPayments,
    handleSyncStatus,
    showDetail,
    closeDetail,
    handlePageChange,
  } = useExceptionPayments();

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <ExceptionHeader total={total} onRefresh={loadExceptionPayments} />

        {/* 异常说明 */}
        <ExceptionInfoAlert />

        {/* 异常支付列表 */}
        <Card>
          <ExceptionTable
            payments={payments}
            loading={loading}
            hasSyncPermission={hasPermission('payment:sync')}
            syncingId={syncingId}
            page={page}
            pageSize={pageSize}
            total={total}
            onViewDetail={showDetail}
            onSync={handleSyncStatus}
            onPageChange={handlePageChange}
          />
        </Card>
      </Space>

      {/* 详情对话框 */}
      <ExceptionDetailModal visible={detailModalVisible} payment={selectedPayment} onCancel={closeDetail} />
    </div>
  );
};

export default ExceptionPayments;
