import { memo } from 'react';
import { Card, Row, Col, Statistic , theme } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface AppReviewStatsCardProps {
  pending: number;
  approved: number;
  rejected: number;
}

export const AppReviewStatsCard = memo<AppReviewStatsCardProps>(
  ({ pending, approved, rejected }) => {
    const { token } = theme.useToken();
    return (
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="待审核"
              value={pending}
              valueStyle={{ color: token.colorPrimary }}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="已批准"
              value={approved}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="已拒绝"
              value={rejected}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Col>
        </Row>
      </Card>
    );
  }
);

AppReviewStatsCard.displayName = 'AppReviewStatsCard';
