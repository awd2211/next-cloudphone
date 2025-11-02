import React from 'react';
import { Button, Space } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';

interface ParticipateActionsProps {
  canParticipate: boolean;
  participating: boolean;
  onParticipate: () => void;
  onViewCoupons: () => void;
}

/**
 * 参与按钮组组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 条件渲染（只在可参与时显示）
 * - 统一的按钮布局
 */
export const ParticipateActions: React.FC<ParticipateActionsProps> = React.memo(
  ({ canParticipate, participating, onParticipate, onViewCoupons }) => {
    if (!canParticipate) return null;

    return (
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <Space size="large">
          <Button
            type="primary"
            size="large"
            loading={participating}
            onClick={onParticipate}
            icon={<TrophyOutlined />}
          >
            立即参与
          </Button>
          <Button size="large" onClick={onViewCoupons}>
            查看我的优惠券
          </Button>
        </Space>
      </div>
    );
  }
);

ParticipateActions.displayName = 'ParticipateActions';
