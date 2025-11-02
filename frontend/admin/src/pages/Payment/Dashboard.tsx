import React from 'react';
import { Row, Col, Card, Space, Spin } from 'antd';
import ReactECharts from '@/components/ReactECharts';
import { PermissionGuard } from '@/components/PaymentConfig';
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
    <PermissionGuard permission="payment:dashboard:view">
      <PaymentDashboardContent />
    </PermissionGuard>
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
  } = usePaymentDashboard();

  // 图表配置
  const paymentMethodChartOption = usePaymentMethodChartOption(methodStats);
  const dailyTrendChartOption = useDailyTrendChartOption(dailyStats);

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <DateRangeFilter dateRange={dateRange} onChange={handleDateRangeChange} />

        <Spin spinning={loading}>
          <PaymentStatsCards statistics={statistics} />

          {/* 图表 */}
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card>
                <ReactECharts option={paymentMethodChartOption} style={{ height: 400 }} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card>
                <ReactECharts option={dailyTrendChartOption} style={{ height: 400 }} />
              </Card>
            </Col>
          </Row>

          <PaymentMethodTable dataSource={methodStats} />
        </Spin>
      </Space>
    </div>
  );
};

export default PaymentDashboard;
