import { memo } from 'react';
import { Row, Col, Card, Statistic, theme } from 'antd';
import { ApiOutlined, CheckCircleOutlined, ClockCircleOutlined, BarChartOutlined } from '@ant-design/icons';
import type { ApiKeyStatistics } from '@/types';

interface ApiKeyStatsCardsProps {
  statistics: ApiKeyStatistics | null;
}

export const ApiKeyStatsCards = memo<ApiKeyStatsCardsProps>(({ statistics }) => {
  const { token } = theme.useToken();
  if (!statistics) return null;

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={6}>
        <Card>
          <Statistic
            title="总密钥数"
            value={statistics.total}
            prefix={<ApiOutlined />}
            valueStyle={{ color: token.colorPrimary }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="激活中"
            value={statistics.active}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="总使用次数"
            value={statistics.totalUsage}
            prefix={<BarChartOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="今日使用"
            value={statistics.recentUsage.day}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#fa8c16' }}
          />
        </Card>
      </Col>
    </Row>
  );
});

ApiKeyStatsCards.displayName = 'ApiKeyStatsCards';
