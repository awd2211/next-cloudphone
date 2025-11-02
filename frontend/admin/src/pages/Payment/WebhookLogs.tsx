import React from 'react';
import { Space, Spin, Result, Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks';
import { FilterBar, LogsTable, DetailModal } from '@/components/WebhookLogs';
import { useWebhookLogs } from '@/hooks/useWebhookLogs';

const WebhookLogs: React.FC = () => {
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

  if (!hasPermission('payment:webhook:view')) {
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

  return <WebhookLogsContent />;
};

const WebhookLogsContent: React.FC = () => {
  const {
    loading,
    logs,
    total,
    page,
    pageSize,
    provider,
    selectedLog,
    detailModalVisible,
    loadLogs,
    handleProviderChange,
    handlePageChange,
    handleViewDetail,
    handleCloseDetail,
  } = useWebhookLogs();

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <FilterBar provider={provider} onProviderChange={handleProviderChange} onRefresh={loadLogs} />

        <LogsTable
          loading={loading}
          logs={logs}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onViewDetail={handleViewDetail}
        />
      </Space>

      <DetailModal visible={detailModalVisible} log={selectedLog} onClose={handleCloseDetail} />
    </div>
  );
};

export default WebhookLogs;
