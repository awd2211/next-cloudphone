import { memo } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import {
  KeyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LineChartOutlined,
} from '@ant-design/icons';

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
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="全部密钥"
            value={stats.total}
            prefix={<KeyOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="活跃密钥"
            value={stats.active}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="已撤销"
            value={stats.revoked}
            prefix={<CloseCircleOutlined />}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card>
          <Statistic
            title="总请求次数"
            value={stats.totalRequests}
            prefix={<LineChartOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>
    </Row>
  );
});

ApiKeysStats.displayName = 'ApiKeysStats';
