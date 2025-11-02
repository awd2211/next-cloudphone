import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { ClockCircleOutlined, SyncOutlined } from '@ant-design/icons';
import type { TicketStats } from '@/services/ticket';

interface StatsCardsProps {
  stats: TicketStats | null;
}

/**
 * 工单统计卡片组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 3 个统计卡片：全部、待处理、处理中
 */
export const StatsCards: React.FC<StatsCardsProps> = React.memo(({ stats }) => {
  if (!stats) return null;

  return (
    <Row gutter={16} style={{ marginBottom: '24px' }}>
      <Col xs={24} sm={12} lg={8}>
        <Card>
          <Statistic title="全部工单" value={stats.total} prefix={<ClockCircleOutlined />} />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={8}>
        <Card>
          <Statistic
            title="待处理"
            value={stats.open}
            valueStyle={{ color: '#faad14' }}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={8}>
        <Card>
          <Statistic
            title="处理中"
            value={stats.inProgress}
            valueStyle={{ color: '#1890ff' }}
            prefix={<SyncOutlined spin />}
          />
        </Card>
      </Col>
    </Row>
  );
});

StatsCards.displayName = 'StatsCards';
