import React from 'react';
import { Card, Space } from 'antd';
import { GiftOutlined } from '@ant-design/icons';

interface ActivityRewardsProps {
  rewards?: string[];
}

/**
 * 活动奖励组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 条件渲染（无奖励时不显示）
 * - 卡片列表展示
 */
export const ActivityRewards: React.FC<ActivityRewardsProps> = React.memo(({ rewards }) => {
  if (!rewards || rewards.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <h3>活动奖励</h3>
      <Space direction="vertical" style={{ width: '100%' }}>
        {rewards.map((reward, index) => (
          <Card key={index} size="small">
            <Space>
              <GiftOutlined style={{ fontSize: 20, color: '#faad14' }} />
              <span>{reward}</span>
            </Space>
          </Card>
        ))}
      </Space>
    </div>
  );
});

ActivityRewards.displayName = 'ActivityRewards';
