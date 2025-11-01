import React from 'react';
import { Empty, Button } from 'antd';

interface EmptyStateProps {
  onGoToActivities: () => void;
}

/**
 * 优惠券空状态组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 引导用户去活动中心领取优惠券
 */
export const EmptyState: React.FC<EmptyStateProps> = React.memo(({ onGoToActivities }) => {
  return (
    <Empty
      description="暂无优惠券"
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      style={{ padding: '60px 0' }}
    >
      <Button type="primary" onClick={onGoToActivities}>
        去活动中心领取
      </Button>
    </Empty>
  );
});

EmptyState.displayName = 'EmptyState';
