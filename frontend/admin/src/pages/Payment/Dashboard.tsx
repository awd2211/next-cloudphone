import React, { useEffect } from 'react';
import { Row, Col, Card, Space, Tag, message } from 'antd';
import { ReloadOutlined, DashboardOutlined } from '@ant-design/icons';
import ReactECharts from '@/components/ReactECharts';
import { PermissionGuard } from '@/components/PaymentConfig';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import {
  PaymentStatsCards,
  DateRangeFilter,
  PaymentMethodTable,
  usePaymentMethodChartOption,
  useDailyTrendChartOption,
} from '@/components/PaymentDashboard';
import { usePaymentDashboard } from '@/hooks/usePaymentDashboard';

const PaymentDashboard: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="PaymentDashboard">
      <PermissionGuard permission="payment:dashboard:view">
        <PaymentDashboardContent />
      </PermissionGuard>
    </ErrorBoundary>
  );
};

const PaymentDashboardContent: React.FC = () => {
  const {
    loading,
    statistics,
    methodStats,
    dailyStats,
    dateRange,
    handleDateRangeChange,
    refetch,
  } = usePaymentDashboard();

  // 图表配置
  const paymentMethodChartOption = usePaymentMethodChartOption(methodStats as any);
  const dailyTrendChartOption = useDailyTrendChartOption(dailyStats as any);

  // 快捷键支持 - Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch?.();
        message.info('正在刷新...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refetch]);

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ marginBottom: 0 }}>
            <DashboardOutlined style={{ marginRight: 8 }} />
            支付数据看板
            <Tag
              icon={<ReloadOutlined spin={loading} />}
              color="processing"
              style={{ marginLeft: 12, cursor: 'pointer' }}
              onClick={() => refetch?.()}
            >
              Ctrl+R 刷新
            </Tag>
          </h2>
        </div>

        <DateRangeFilter dateRange={dateRange} onChange={handleDateRangeChange} />

        <LoadingState loading={loading}>
          <PaymentStatsCards statistics={statistics} />

          {/* 图表 */}
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card>
                <ReactECharts option={paymentMethodChartOption as any} style={{ height: 400 }} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card>
                <ReactECharts option={dailyTrendChartOption as any} style={{ height: 400 }} />
              </Card>
            </Col>
          </Row>

          <PaymentMethodTable dataSource={methodStats as any} />
        </LoadingState>
      </Space>
    </div>
  );
};

export default PaymentDashboard;
