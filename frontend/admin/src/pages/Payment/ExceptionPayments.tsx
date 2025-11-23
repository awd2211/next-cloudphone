import React, { useEffect, useMemo } from 'react';
import { Card, Space, Result, Button, Tag, Row, Col, Statistic, message } from 'antd';
import {
  LockOutlined,
  ReloadOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks';
import { useExceptionPayments } from '@/hooks/useExceptionPayments';
import {
  ExceptionInfoAlert,
  ExceptionTable,
  ExceptionDetailModal,
} from '@/components/Exception';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

/**
 * 异常支付管理页面（优化版）
 *
 * 优化点：
 * 1. ErrorBoundary - 错误边界包裹
 * 2. LoadingState - 统一加载状态
 * 3. 统计卡片 - 异常支付统计
 * 4. 快捷键支持 - Ctrl+R 刷新
 * 5. 页面标题优化
 */
const ExceptionPayments: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, loading: permissionLoading } = usePermission();

  // 权限检查 - 使用 LoadingState 统一加载状态
  if (permissionLoading) {
    return (
      <LoadingState
        loading={true}
        loadingType="skeleton"
        skeletonRows={5}
      >
        <div />
      </LoadingState>
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

  return (
    <ErrorBoundary boundaryName="ExceptionPayments">
      <ExceptionPaymentsContent />
    </ErrorBoundary>
  );
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

  // ===== 统计计算 =====
  const stats = useMemo(() => {
    const pendingCount = payments.filter((p) => p.status === 'pending').length;
    const timeoutCount = payments.filter((p) => p.status === 'timeout').length;
    const errorCount = payments.filter((p) => p.status === 'error' || p.status === 'failed').length;
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    return { total, pendingCount, timeoutCount, errorCount, totalAmount };
  }, [payments, total]);

  // ===== 快捷键支持 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+R 或 Cmd+R 刷新数据
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        message.info('正在刷新异常支付数据...');
        loadExceptionPayments();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadExceptionPayments]);

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 - 优化版 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ marginBottom: 0 }}>
              <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
              异常支付管理
            </h2>
            <Tag
              icon={<ReloadOutlined spin={loading} />}
              color="processing"
              style={{ cursor: 'pointer' }}
              onClick={() => loadExceptionPayments()}
            >
              Ctrl+R 刷新
            </Tag>
          </div>
          <span style={{ fontSize: 12, color: '#999' }}>
            共 {total} 条异常记录
          </span>
        </div>

        {/* 统计卡片 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="异常总数"
                value={stats.total}
                prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="待处理"
                value={stats.pendingCount}
                prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="超时/失败"
                value={stats.timeoutCount + stats.errorCount}
                prefix={<WarningOutlined style={{ color: '#ff7875' }} />}
                valueStyle={{ color: '#ff7875' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="异常金额"
                value={stats.totalAmount}
                precision={2}
                prefix={<DollarOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff' }}
                suffix="元"
              />
            </Card>
          </Col>
        </Row>

        {/* 异常说明 */}
        <ExceptionInfoAlert />

        {/* 异常支付列表 - 使用 LoadingState 统一管理加载状态 */}
        <LoadingState
          loading={loading}
          empty={!loading && payments.length === 0}
          onRetry={loadExceptionPayments}
          loadingType="skeleton"
          skeletonRows={5}
          emptyDescription="暂无异常支付记录"
        >
          <Card>
            <ExceptionTable
              payments={payments}
              loading={false}
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
        </LoadingState>
      </Space>

      {/* 详情对话框 */}
      <ExceptionDetailModal visible={detailModalVisible} payment={selectedPayment} onCancel={closeDetail} />
    </div>
  );
};

export default ExceptionPayments;
