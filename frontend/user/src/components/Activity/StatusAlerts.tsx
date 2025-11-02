import React from 'react';
import { Alert } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { ActivityStatus } from '@/services/activity';
import { getStatusAlertConfig } from '@/utils/activityConfig';

interface StatusAlertsProps {
  status: ActivityStatus;
  hasParticipated: boolean;
}

/**
 * 状态提示组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 配置驱动的状态提示
 * - 条件渲染（只在需要时显示）
 */
export const StatusAlerts: React.FC<StatusAlertsProps> = React.memo(
  ({ status, hasParticipated }) => {
    const isOngoing = status === ActivityStatus.ONGOING;
    const alertConfig = getStatusAlertConfig(status);

    return (
      <>
        {/* 活动状态提示 */}
        {!isOngoing && (
          <Alert
            message={alertConfig.message}
            type={alertConfig.type}
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {/* 参与状态提示 */}
        {hasParticipated && (
          <Alert
            message="您已参与过此活动"
            description="感谢您的参与，请前往我的优惠券查看您的奖励"
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: 24 }}
          />
        )}
      </>
    );
  }
);

StatusAlerts.displayName = 'StatusAlerts';
