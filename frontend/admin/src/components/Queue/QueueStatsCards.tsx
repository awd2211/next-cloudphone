import { memo } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import type { QueueSummary } from '@/types';

interface QueueStatsCardsProps {
  summary: QueueSummary | null;
}

export const QueueStatsCards = memo<QueueStatsCardsProps>(({ summary }) => {
  if (!summary) return null;

  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic
            title="队列总数"
            value={summary.totalQueues || 0}
            prefix={<DatabaseOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="等待任务"
            value={summary.totalWaiting || 0}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="处理中任务"
            value={summary.totalActive || 0}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="失败任务"
            value={summary.totalFailed || 0}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Card>
      </Col>
    </Row>
  );
});

QueueStatsCards.displayName = 'QueueStatsCards';
