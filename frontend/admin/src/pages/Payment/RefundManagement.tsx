import React, { useEffect, useMemo } from 'react';
import { Card, Space, Result, Button, Spin, Row, Col, Statistic, Tag, message } from 'antd';
import {
  LockOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';
import { usePermission } from '@/hooks';
import { useRefundManagement } from '@/hooks/useRefundManagement';
import {
  RefundTable,
  RefundDetailModal,
  RefundApproveModal,
  RefundRejectModal,
} from '@/components/Refund';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

/**
 * 退款管理页面（优化版）
 *
 * 优化点：
 * 1. ErrorBoundary - 错误边界包裹
 * 2. LoadingState - 统一加载状态
 * 3. 统计卡片 - 显示待处理、已批准、已拒绝等数据
 * 4. 快捷键支持 - Ctrl+R 刷新, Ctrl+K 搜索
 * 5. 页面标题优化 - 添加刷新标签
 */
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

  return (
    <ErrorBoundary boundaryName="RefundManagement">
      <RefundManagementContent />
    </ErrorBoundary>
  );
};

const RefundManagementContent: React.FC = () => {
  const { hasPermission } = usePermission();
  const {
    loading,
    error,
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

  // ===== 统计计算 =====
  const stats = useMemo(() => {
    const pendingCount = refunds.filter((r) => r.status === 'pending').length;
    const approvedCount = refunds.filter((r) => r.status === 'success' || r.status === 'refunded').length;
    const rejectedCount = refunds.filter((r) => r.status === 'failed').length;
    const totalAmount = refunds.reduce((sum, r) => sum + (r.amount || 0), 0);
    return { total: refunds.length, pendingCount, approvedCount, rejectedCount, totalAmount };
  }, [refunds]);

  // ===== 快捷键支持 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+R 或 Cmd+R 刷新数据
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        message.info('正在刷新退款列表...');
        loadRefunds();
      }
      // Ctrl+K 或 Cmd+K 聚焦搜索（如果有搜索框）
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          '.ant-input-search input'
        );
        if (searchInput) {
          searchInput.focus();
          message.info('搜索框已聚焦');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadRefunds]);

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 0,
          }}
        >
          <h2 style={{ marginBottom: 0 }}>
            退款管理
            <Tag
              icon={<ReloadOutlined spin={loading} />}
              color="processing"
              style={{ marginLeft: 12, cursor: 'pointer' }}
              onClick={() => loadRefunds()}
            >
              Ctrl+R 刷新
            </Tag>
          </h2>
          <span style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.tertiary }}>快捷键: Ctrl+K 搜索</span>
        </div>

        {/* 统计卡片 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="退款总数"
                value={stats.total}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="待处理"
                value={stats.pendingCount}
                prefix={<ClockCircleOutlined style={{ color: SEMANTIC.warning.main }} />}
                valueStyle={{ color: SEMANTIC.warning.main }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="已批准"
                value={stats.approvedCount}
                prefix={<CheckCircleOutlined style={{ color: SEMANTIC.success.main }} />}
                valueStyle={{ color: SEMANTIC.success.main }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="已拒绝"
                value={stats.rejectedCount}
                prefix={<CloseCircleOutlined style={{ color: SEMANTIC.error.main }} />}
                valueStyle={{ color: SEMANTIC.error.main }}
              />
            </Card>
          </Col>
        </Row>

        {/* 退款列表 - 使用 LoadingState 统一管理加载状态 */}
        <Card>
          <LoadingState
            loading={loading}
            error={error}
            empty={!loading && !error && refunds.length === 0}
            onRetry={loadRefunds}
            loadingType="skeleton"
            skeletonRows={5}
            emptyDescription="暂无退款数据"
          >
            <RefundTable
              refunds={refunds}
              loading={false}
              hasApprovePermission={hasPermission('payment:refund:approve')}
              hasRejectPermission={hasPermission('payment:refund:reject')}
              onViewDetail={showDetail}
              onApprove={showApproveModal}
              onReject={showRejectModal}
            />
          </LoadingState>
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
