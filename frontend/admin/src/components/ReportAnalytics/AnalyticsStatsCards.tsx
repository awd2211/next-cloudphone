import React from 'react';
import { Row, Col, Card, Statistic , theme } from 'antd';
import {
  ArrowUpOutlined,
  MobileOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import { SEMANTIC } from '@/theme';

interface AnalyticsStatsCardsProps {
  revenueData: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
  };
  deviceTotal: number;
}

export const AnalyticsStatsCards: React.FC<AnalyticsStatsCardsProps> = React.memo(
  ({ revenueData, deviceTotal }) => {
    const { token } = theme.useToken();
    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总收入"
              value={revenueData.totalRevenue || 0}
              precision={2}
              prefix="¥"
              valueStyle={{ color: SEMANTIC.success.dark }}
              suffix={
                <span style={{ fontSize: 14 }}>
                  <ArrowUpOutlined /> 12%
                </span>
              }
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总订单数"
              value={revenueData.totalOrders || 0}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: token.colorPrimary }}
              suffix={
                <span style={{ fontSize: 14 }}>
                  <ArrowUpOutlined /> 8%
                </span>
              }
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="设备总数"
              value={deviceTotal || 0}
              prefix={<MobileOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均订单金额"
              value={revenueData.avgOrderValue || 0}
              precision={2}
              prefix="¥"
              valueStyle={{ color: SEMANTIC.error.dark }}
            />
          </Card>
        </Col>
      </Row>
    );
  }
);

AnalyticsStatsCards.displayName = 'AnalyticsStatsCards';
