import { memo } from 'react';
import { Card, Statistic, Row, Col } from 'antd';
import { PRIMARY, SEMANTIC } from '@/theme';

interface DeviceStats {
  total?: number;
  running?: number;
  idle?: number;
  stopped?: number;
}

interface DeviceStatsCardsProps {
  stats?: DeviceStats;
}

/**
 * 设备统计卡片组件
 * 显示设备总数、运行中、空闲、已停止的统计信息
 */
export const DeviceStatsCards = memo<DeviceStatsCardsProps>(({ stats }) => {
  return (
    <Row gutter={16} style={{ marginBottom: '24px' }}>
      <Col span={6}>
        <Card>
          <Statistic
            title="设备总数"
            value={stats?.total || 0}
            valueStyle={{ color: PRIMARY.main }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="运行中"
            value={stats?.running || 0}
            valueStyle={{ color: SEMANTIC.success.main }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="空闲" value={stats?.idle || 0} valueStyle={{ color: SEMANTIC.warning.main }} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="已停止"
            value={stats?.stopped || 0}
            valueStyle={{ color: SEMANTIC.error.main }}
          />
        </Card>
      </Col>
    </Row>
  );
});

DeviceStatsCards.displayName = 'DeviceStatsCards';
