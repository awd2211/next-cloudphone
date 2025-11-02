import React from 'react';
import { Row, Col, Empty, Spin } from 'antd';
import type { Activity } from '@/services/activity';
import { ActivityCard } from './ActivityCard';

interface ActivityGridProps {
  activities: Activity[];
  loading: boolean;
  onActivityClick: (activityId: string) => void;
}

/**
 * 活动网格组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 响应式网格布局
 * - 空状态和 Loading 状态处理
 */
export const ActivityGrid: React.FC<ActivityGridProps> = React.memo(
  ({ activities, loading, onActivityClick }) => {
    return (
      <Spin spinning={loading}>
        {activities.length > 0 ? (
          <Row gutter={[16, 16]}>
            {activities.map((activity) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={activity.id}>
                <ActivityCard activity={activity} onClick={onActivityClick} />
              </Col>
            ))}
          </Row>
        ) : (
          <Empty
            description="暂无活动"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '60px 0' }}
          />
        )}
      </Spin>
    );
  }
);

ActivityGrid.displayName = 'ActivityGrid';
