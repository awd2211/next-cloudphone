import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import {
  UserOutlined,
  MobileOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { MeteringOverview } from './constants';

interface MeteringStatsCardsProps {
  overview: MeteringOverview | null;
}

export const MeteringStatsCards: React.FC<MeteringStatsCardsProps> = React.memo(
  ({ overview }) => {
    return (
      <Card>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总用户数"
              value={overview?.totalUsers || 0}
              prefix={<UserOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="活跃用户"
              value={overview?.activeUsers || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<UserOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总设备数"
              value={overview?.totalDevices || 0}
              prefix={<MobileOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总运行时长 (h)"
              value={overview?.totalHours || 0}
              prefix={<ClockCircleOutlined />}
              precision={2}
            />
          </Col>
        </Row>
      </Card>
    );
  }
);

MeteringStatsCards.displayName = 'MeteringStatsCards';
