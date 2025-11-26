import React, { useEffect, useMemo } from 'react';
import { Space, Result, Button, Row, Col, Card, Statistic, Tag, message } from 'antd';
import {
  LockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ApiOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';
import { usePermission } from '@/hooks';
import { FilterBar, LogsTable, DetailModal } from '@/components/WebhookLogs';
import { useWebhookLogs } from '@/hooks/useWebhookLogs';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

/**
 * Webhook 日志页面（优化版）
 *
 * 优化点：
 * 1. ErrorBoundary - 错误边界包裹
 * 2. LoadingState - 统一加载状态管理
 * 3. 统计卡片 - 显示日志统计（成功/失败/待处理）
 * 4. 快捷键支持 - Ctrl+R 刷新
 * 5. 页面标题优化 - 显示刷新状态和快捷键提示
 */
const WebhookLogs: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, loading: permissionLoading } = usePermission();

  // 权限检查 - 使用 LoadingState 统一加载状态
  if (permissionLoading) {
    return (
      <LoadingState
        loading={true}
        loadingType="spinner"
        style={{ padding: '24px', minHeight: '400px' }}
      >
        <div />
      </LoadingState>
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

  return (
    <ErrorBoundary boundaryName="WebhookLogs">
      <WebhookLogsContent />
    </ErrorBoundary>
  );
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

  // ===== 统计计算 =====
  const stats = useMemo(() => {
    const successCount = logs.filter((log) => log.status === 'success').length;
    const failedCount = logs.filter((log) => log.status === 'failed').length;
    const pendingCount = logs.filter((log) => log.status === 'pending').length;
    const totalRetries = logs.reduce((sum, log) => sum + (log.retryCount || 0), 0);
    return { total, successCount, failedCount, pendingCount, totalRetries };
  }, [logs, total]);

  // ===== 快捷键支持 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+R 或 Cmd+R 刷新数据
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        message.info('正在刷新 Webhook 日志...');
        loadLogs();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadLogs]);

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
            Webhook 日志
            <Tag
              icon={<ReloadOutlined spin={loading} />}
              color="processing"
              style={{ marginLeft: 12, cursor: 'pointer' }}
              onClick={() => loadLogs()}
            >
              Ctrl+R 刷新
            </Tag>
          </h2>
          <span style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.tertiary }}>实时查看支付回调日志</span>
        </div>

        {/* 统计卡片 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="日志总数"
                value={stats.total}
                prefix={<ApiOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="处理成功"
                value={stats.successCount}
                prefix={<CheckCircleOutlined style={{ color: SEMANTIC.success.main }} />}
                valueStyle={{ color: SEMANTIC.success.main }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="处理失败"
                value={stats.failedCount}
                prefix={<CloseCircleOutlined style={{ color: SEMANTIC.error.main }} />}
                valueStyle={{ color: SEMANTIC.error.main }}
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
        </Row>

        {/* 筛选栏 */}
        <FilterBar provider={provider} onProviderChange={handleProviderChange} onRefresh={loadLogs} />

        {/* 数据表格 - 使用 LoadingState 统一管理加载状态 */}
        <LoadingState
          loading={loading}
          empty={!loading && logs.length === 0}
          onRetry={loadLogs}
          loadingType="skeleton"
          skeletonRows={5}
          emptyDescription="暂无 Webhook 日志数据"
        >
          <LogsTable
            loading={false}
            logs={logs}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onViewDetail={handleViewDetail}
          />
        </LoadingState>
      </Space>

      <DetailModal visible={detailModalVisible} log={selectedLog} onClose={handleCloseDetail} />
    </div>
  );
};

export default WebhookLogs;
