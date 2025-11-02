import React from 'react';
import { Card, Row, Col, Spin } from 'antd';
import { EChartsLazy } from '@/components/LazyComponents';
import {
  AnalyticsStatsCards,
  AnalyticsFilterBar,
  useRevenueChartOption,
  useUserGrowthChartOption,
  useDeviceStatusChartOption,
  usePlanDistributionChartOption,
  useHeatmapChartOption,
} from '@/components/ReportAnalytics';
import { useReportAnalytics } from '@/hooks/useReportAnalytics';

const Analytics: React.FC = () => {
  const {
    loading,
    dateRange,
    period,
    revenueData,
    userGrowthData,
    deviceData,
    planData,
    handleDateRangeChange,
    handlePeriodChange,
  } = useReportAnalytics();

  // 图表配置
  const revenueChartOption = useRevenueChartOption(revenueData.dailyStats);
  const userGrowthChartOption = useUserGrowthChartOption(userGrowthData);
  const deviceStatusChartOption = useDeviceStatusChartOption(deviceData);
  const planDistributionChartOption = usePlanDistributionChartOption(planData);
  const heatmapOption = useHeatmapChartOption();

  return (
    <div>
      <h2>数据分析</h2>

      <AnalyticsFilterBar
        dateRange={dateRange}
        period={period}
        onDateRangeChange={handleDateRangeChange}
        onPeriodChange={handlePeriodChange}
      />

      <Spin spinning={loading}>
        <AnalyticsStatsCards
          revenueData={revenueData}
          deviceTotal={deviceData.total}
        />

        {/* 图表 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card>
              <EChartsLazy option={revenueChartOption} style={{ height: 400 }} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card>
              <EChartsLazy option={deviceStatusChartOption} style={{ height: 400 }} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={16}>
            <Card>
              <EChartsLazy option={userGrowthChartOption} style={{ height: 400 }} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card>
              <EChartsLazy option={planDistributionChartOption} style={{ height: 400 }} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24}>
            <Card>
              <EChartsLazy option={heatmapOption} style={{ height: 500 }} />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default Analytics;
