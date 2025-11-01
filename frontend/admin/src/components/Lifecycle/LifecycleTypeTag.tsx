/**
 * LifecycleTypeTag - 生命周期规则类型标签组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Tag } from 'antd';
import {
  CloseCircleOutlined,
  ThunderboltOutlined,
  SyncOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

export type LifecycleType = 'cleanup' | 'autoscaling' | 'backup' | 'expiration-warning';

interface LifecycleTypeTagProps {
  type: LifecycleType | string;
}

// 模块级别配置对象，避免每次渲染重新创建
export const LIFECYCLE_TYPE_CONFIG = {
  cleanup: {
    color: 'orange',
    text: '自动清理',
    icon: <CloseCircleOutlined />,
  },
  autoscaling: {
    color: 'blue',
    text: '自动扩缩',
    icon: <ThunderboltOutlined />,
  },
  backup: {
    color: 'green',
    text: '自动备份',
    icon: <SyncOutlined />,
  },
  'expiration-warning': {
    color: 'gold',
    text: '到期提醒',
    icon: <ClockCircleOutlined />,
  },
} as const;

/**
 * LifecycleTypeTag 组件
 * 显示生命周期规则类型的标签，带图标
 */
export const LifecycleTypeTag = memo<LifecycleTypeTagProps>(({ type }) => {
  const config = LIFECYCLE_TYPE_CONFIG[type as LifecycleType] || LIFECYCLE_TYPE_CONFIG.cleanup;

  return (
    <Tag color={config.color} icon={config.icon}>
      {config.text}
    </Tag>
  );
});

LifecycleTypeTag.displayName = 'LifecycleTypeTag';
