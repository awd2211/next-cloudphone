/**
 * 设备状态标签组件（Memo 优化）
 *
 * 优化原理：
 * 1. 使用 React.memo 避免不必要的重渲染
 * 2. 状态映射对象在模块级别定义（只创建一次）
 * 3. 只在 status 变化时重渲染
 */
import { memo } from 'react';
import { Tag, Badge } from 'antd';

type DeviceStatus = 'idle' | 'running' | 'stopped' | 'error';

interface DeviceStatusTagProps {
  status: DeviceStatus;
  showBadge?: boolean;
}

// ✅ 状态映射在模块级别定义（避免每次渲染都创建）
// 导出供其他组件使用（如导出数据时需要状态文本）
export const STATUS_CONFIG = {
  idle: {
    color: 'default',
    text: '空闲',
    badgeStatus: 'default' as const,
  },
  running: {
    color: 'success',
    text: '运行中',
    badgeStatus: 'processing' as const,
  },
  stopped: {
    color: 'warning',
    text: '已停止',
    badgeStatus: 'warning' as const,
  },
  error: {
    color: 'error',
    text: '错误',
    badgeStatus: 'error' as const,
  },
} as const;

export const DeviceStatusTag = memo<DeviceStatusTagProps>(
  ({ status, showBadge = false }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

    if (showBadge) {
      return (
        <Badge status={config.badgeStatus} text={config.text} />
      );
    }

    return <Tag color={config.color}>{config.text}</Tag>;
  }
);

DeviceStatusTag.displayName = 'DeviceStatusTag';
