import { memo } from 'react';
import { Row, Col, Card, Statistic , theme } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import type { EventStats } from '@/types';
import { SEMANTIC } from '@/theme';

interface EventStatsCardsProps {
  stats: EventStats | null;
}

/**
 * 事件统计卡片组件
 * 显示总事件数、UserCreated、UserUpdated、UserDeleted 统计
 */
export const EventStatsCards = memo<EventStatsCardsProps>(({ stats }) => {
  const { token } = theme.useToken();
  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic
            title="总事件数"
            value={stats?.totalEvents || 0}
            prefix={<LineChartOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="UserCreated"
            value={stats?.eventsByType?.UserCreated || 0}
            valueStyle={{ color: SEMANTIC.success.main }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="UserUpdated"
            value={stats?.eventsByType?.UserUpdated || 0}
            valueStyle={{ color: token.colorPrimary }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="UserDeleted"
            value={stats?.eventsByType?.UserDeleted || 0}
            valueStyle={{ color: SEMANTIC.error.main }}
          />
        </Card>
      </Col>
    </Row>
  );
});

EventStatsCards.displayName = 'EventStatsCards';
