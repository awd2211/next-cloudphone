import React from 'react';
import { Descriptions, Progress, theme } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import type { Activity } from '@/services/activity';
import {
  getTypeConfig,
  getStatusTag,
  calculateProgress,
  formatDateTime,
} from '@/utils/activityConfig';

const { useToken } = theme;

interface ActivityInfoProps {
  activity: Activity;
}

/**
 * 活动基本信息组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 配置驱动的类型和状态显示
 * - 进度条可视化
 */
export const ActivityInfo: React.FC<ActivityInfoProps> = React.memo(({ activity }) => {
  const { token } = useToken();
  const typeConfig = getTypeConfig(activity.type);
  const progress = calculateProgress(activity.currentParticipants, activity.maxParticipants);

  return (
    <Descriptions bordered column={{ xs: 1, sm: 2 }}>
      <Descriptions.Item label="活动类型">
        {typeConfig.text}
      </Descriptions.Item>
      <Descriptions.Item label="活动状态">{getStatusTag(activity.status)}</Descriptions.Item>
      <Descriptions.Item label="开始时间">
        <ClockCircleOutlined style={{ marginRight: 8 }} />
        {formatDateTime(activity.startTime)}
      </Descriptions.Item>
      <Descriptions.Item label="结束时间">
        <ClockCircleOutlined style={{ marginRight: 8 }} />
        {formatDateTime(activity.endTime)}
      </Descriptions.Item>
      {activity.discount && (
        <Descriptions.Item label="折扣力度">
          <span style={{ fontSize: 24, fontWeight: 'bold', color: token.colorError }}>
            {activity.discount}折
          </span>
        </Descriptions.Item>
      )}
      {activity.maxParticipants && (
        <Descriptions.Item label="参与进度">
          <div>
            <div style={{ marginBottom: 8 }}>
              {activity.currentParticipants} / {activity.maxParticipants} 人
            </div>
            <Progress percent={Math.round(progress)} status="active" />
          </div>
        </Descriptions.Item>
      )}
    </Descriptions>
  );
});

ActivityInfo.displayName = 'ActivityInfo';
