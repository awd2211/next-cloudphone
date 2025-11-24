import React from 'react';
import { Row, Col, Card, Statistic, theme } from 'antd';

const { useToken } = theme;

interface DeviceStats {
  total: number;
  running: number;
  stopped: number;
}

interface DeviceStatsCardsProps {
  stats: DeviceStats | null;
}

export const DeviceStatsCards: React.FC<DeviceStatsCardsProps> = React.memo(({ stats }) => {
  const { token } = useToken();

  if (!stats) return null;

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={8}>
        <Card>
          <Statistic title="总设备数" value={stats.total || 0} />
        </Card>
      </Col>
      <Col span={8}>
        <Card>
          <Statistic
            title="运行中"
            value={stats.running || 0}
            valueStyle={{ color: token.colorSuccess }}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card>
          <Statistic
            title="已停止"
            value={stats.stopped || 0}
            valueStyle={{ color: token.colorError }}
          />
        </Card>
      </Col>
    </Row>
  );
});

DeviceStatsCards.displayName = 'DeviceStatsCards';
