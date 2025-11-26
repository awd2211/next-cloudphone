import React from 'react';
import { Row, Col, Card, Statistic, Spin } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  UserOutlined,
  MobileOutlined,
  AppstoreOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { SEMANTIC } from '@/theme';

interface OverviewData {
  totalUsers?: number;
  userGrowthRate?: number;
  activeDevices?: number;
  deviceGrowthRate?: number;
  totalApps?: number;
  monthlyRevenue?: number;
}

interface StatsOverviewCardsProps {
  overview?: OverviewData;
  loading: boolean;
}

export const StatsOverviewCards: React.FC<StatsOverviewCardsProps> = React.memo(
  ({ overview, loading }) => {
    const renderGrowthRate = (rate?: number) => {
      if (!rate) return null;
      return (
        <span
          style={{
            fontSize: 14,
            color: rate > 0 ? SEMANTIC.success.dark : SEMANTIC.error.dark,
          }}
        >
          {rate > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          {Math.abs(rate)}%
        </span>
      );
    };

    return (
      <Spin spinning={loading}>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总用户数"
                value={overview?.totalUsers || 0}
                prefix={<UserOutlined />}
                suffix={renderGrowthRate(overview?.userGrowthRate)}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="活跃设备"
                value={overview?.activeDevices || 0}
                prefix={<MobileOutlined />}
                suffix={renderGrowthRate(overview?.deviceGrowthRate)}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="应用总数"
                value={overview?.totalApps || 0}
                prefix={<AppstoreOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="本月收入"
                value={overview?.monthlyRevenue || 0}
                prefix={<DollarOutlined />}
                precision={2}
                suffix="¥"
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    );
  }
);

StatsOverviewCards.displayName = 'StatsOverviewCards';
