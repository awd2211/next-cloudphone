/**
 * NodeStatusTag - 调度器节点状态标签组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Tag } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';

export type NodeStatus = 'online' | 'offline' | 'maintenance' | 'draining';

interface NodeStatusTagProps {
  status: NodeStatus | string;
}

// 模块级别配置对象，避免每次渲染重新创建
export const NODE_STATUS_CONFIG = {
  online: {
    color: 'success',
    icon: <CheckCircleOutlined />,
    text: 'online',
  },
  offline: {
    color: 'error',
    icon: <CloseCircleOutlined />,
    text: 'offline',
  },
  maintenance: {
    color: 'warning',
    icon: <ToolOutlined />,
    text: 'maintenance',
  },
  draining: {
    color: 'processing',
    icon: <WarningOutlined />,
    text: 'draining',
  },
} as const;

/**
 * NodeStatusTag 组件
 * 显示调度器节点状态的标签，带图标
 */
export const NodeStatusTag = memo<NodeStatusTagProps>(({ status }) => {
  const config = NODE_STATUS_CONFIG[status as NodeStatus] || NODE_STATUS_CONFIG.offline;

  return (
    <Tag color={config.color} icon={config.icon}>
      {status}
    </Tag>
  );
});

NodeStatusTag.displayName = 'NodeStatusTag';
