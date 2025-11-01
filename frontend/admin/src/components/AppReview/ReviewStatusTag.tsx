/**
 * ReviewStatusTag - 应用审核状态标签组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Tag } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';

type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

interface ReviewStatusTagProps {
  status?: string;
}

export const REVIEW_STATUS_CONFIG = {
  pending: { color: 'processing', icon: <ClockCircleOutlined />, text: '待审核' },
  approved: { color: 'success', icon: <CheckCircleOutlined />, text: '已批准' },
  rejected: { color: 'error', icon: <CloseCircleOutlined />, text: '已拒绝' },
  changes_requested: { color: 'warning', icon: <EditOutlined />, text: '需修改' },
} as const;

/**
 * ReviewStatusTag 组件
 * 显示应用审核状态，支持 4 种状态：待审核、已批准、已拒绝、需修改
 */
export const ReviewStatusTag = memo<ReviewStatusTagProps>(({ status }) => {
  const config =
    REVIEW_STATUS_CONFIG[status as ReviewStatus] || REVIEW_STATUS_CONFIG.pending;

  return (
    <Tag icon={config.icon} color={config.color}>
      {config.text}
    </Tag>
  );
});

ReviewStatusTag.displayName = 'ReviewStatusTag';
