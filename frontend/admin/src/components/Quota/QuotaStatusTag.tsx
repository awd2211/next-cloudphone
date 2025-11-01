/**
 * QuotaStatusTag - 配额状态标签组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Tag } from 'antd';

export const QUOTA_STATUS_CONFIG = {
  active: { color: 'green', text: '正常' },
  exceeded: { color: 'red', text: '超限' },
  suspended: { color: 'orange', text: '暂停' },
  expired: { color: 'gray', text: '过期' },
} as const;

interface QuotaStatusTagProps {
  status: string;
}

/**
 * QuotaStatusTag 组件
 * 显示配额状态标签
 */
export const QuotaStatusTag = memo<QuotaStatusTagProps>(({ status }) => {
  const config = QUOTA_STATUS_CONFIG[status as keyof typeof QUOTA_STATUS_CONFIG] || {
    color: 'default',
    text: status,
  };

  return <Tag color={config.color}>{config.text}</Tag>;
});

QuotaStatusTag.displayName = 'QuotaStatusTag';
