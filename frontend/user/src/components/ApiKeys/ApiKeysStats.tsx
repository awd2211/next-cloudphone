import { memo } from 'react';
import { Row, Col, Card, Statistic, theme } from 'antd';
import {
  KeyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LineChartOutlined,
} from '@ant-design/icons';

const { useToken } = theme;

interface StatsData {
  total: number;
  active: number;
  revoked: number;
  totalRequests: number;
}

interface ApiKeysStatsProps {
  stats: StatsData;
}

export const ApiKeysStats = memo<ApiKeysStatsProps>(({ stats }) => {
  const { token } = useToken();

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="全部密钥"
            value={stats.total}
            prefix={<KeyOutlined />}
            valueStyle={{ color: token.colorPrimary }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="活跃密钥"
            value={stats.active}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: token.colorSuccess }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="已撤销"
            value={stats.revoked}
            prefix={<CloseCircleOutlined />}
            valueStyle={{ color: token.colorError }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="总请求次数"
            value={stats.totalRequests}
            prefix={<LineChartOutlined />}
            valueStyle={{ color: token['purple-6'] ?? '#722ed1' }}
          />
        </Card>
      </Col>
    </Row>
  );
});

ApiKeysStats.displayName = 'ApiKeysStats';
