import { memo } from 'react';
import { Row, Col, Card, Space, Tag } from 'antd';
import type { EventStats } from '@/types';

interface EventStatsTabProps {
  stats: EventStats | null;
  getEventTypeColor: (type: string) => string;
}

/**
 * 事件统计Tab组件
 * 包含按类型统计和系统说明
 */
export const EventStatsTab = memo<EventStatsTabProps>(({ stats, getEventTypeColor }) => {
  return (
    <Row gutter={16}>
      <Col span={12}>
        <Card title="按类型统计">
          <Space direction="vertical" style={{ width: '100%' }}>
            {stats &&
              Object.entries(stats.eventsByType).map(([type, count]) => (
                <div
                  key={type}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                  }}
                >
                  <Tag color={getEventTypeColor(type)}>{type}</Tag>
                  <strong>{count}</strong>
                </div>
              ))}
          </Space>
        </Card>
      </Col>
      <Col span={12}>
        <Card title="系统说明">
          <Space direction="vertical">
            <div>
              <strong>Event Sourcing (事件溯源)</strong>
            </div>
            <div>• 所有状态变更都保存为事件</div>
            <div>• 可以重放事件重建任意时间点的状态</div>
            <div>• 提供完整的审计日志</div>
            <div>• 支持时间旅行查看历史状态</div>
            <div style={{ marginTop: 16 }}>
              <strong>功能说明</strong>
            </div>
            <div>
              • <strong>重放事件</strong>: 重建用户当前完整状态
            </div>
            <div>
              • <strong>重放到版本</strong>: 查看用户在特定版本的状态
            </div>
            <div>
              • <strong>时间旅行</strong>: 查看用户在特定时间点的状态
            </div>
          </Space>
        </Card>
      </Col>
    </Row>
  );
});

EventStatsTab.displayName = 'EventStatsTab';
