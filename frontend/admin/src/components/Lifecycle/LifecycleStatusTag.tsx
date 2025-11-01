/**
 * LifecycleStatusTag - 生命周期执行状态标签组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Tag } from 'antd';

export type LifecycleStatus = 'running' | 'success' | 'failed' | 'partial';

interface LifecycleStatusTagProps {
  status: LifecycleStatus | string;
}

// 模块级别配置对象，避免每次渲染重新创建
export const LIFECYCLE_STATUS_CONFIG = {
  running: {
    color: 'processing',
    text: '执行中',
  },
  success: {
    color: 'success',
    text: '成功',
  },
  failed: {
    color: 'error',
    text: '失败',
  },
  partial: {
    color: 'warning',
    text: '部分成功',
  },
} as const;

/**
 * LifecycleStatusTag 组件
 * 显示生命周期规则执行状态的标签
 */
export const LifecycleStatusTag = memo<LifecycleStatusTagProps>(({ status }) => {
  const config = LIFECYCLE_STATUS_CONFIG[status as LifecycleStatus] || LIFECYCLE_STATUS_CONFIG.failed;

  return <Tag color={config.color}>{config.text}</Tag>;
});

LifecycleStatusTag.displayName = 'LifecycleStatusTag';
