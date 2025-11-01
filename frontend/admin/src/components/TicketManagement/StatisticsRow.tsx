/**
 * StatisticsRow - 工单统计行组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import type { TicketStatistics } from '@/types';

interface StatisticsRowProps {
  statistics: TicketStatistics | null;
}

/**
 * StatisticsRow 组件
 * 显示工单总数、待处理、处理中、已解决的统计信息
 */
export const StatisticsRow = memo<StatisticsRowProps>(({ statistics }) => {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={6}>
        <Card>
          <Statistic
            title="总工单数"
            value={statistics?.total || 0}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="待处理"
            value={statistics?.byStatus.open || 0}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="处理中"
            value={statistics?.byStatus.in_progress || 0}
            valueStyle={{ color: '#fa8c16' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="已解决"
            value={statistics?.byStatus.resolved || 0}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
    </Row>
  );
});

StatisticsRow.displayName = 'StatisticsRow';
