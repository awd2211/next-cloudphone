/**
 * NodeActions - 调度器节点操作按钮组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Space, Button, Popconfirm } from 'antd';
import {
  EditOutlined,
  ToolOutlined,
  WarningOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { SchedulerNode } from '@/services/scheduler';

interface NodeActionsProps {
  node: SchedulerNode;
  onEdit: (node: SchedulerNode) => void;
  onToggleMaintenance: (id: string, enable: boolean) => void;
  onDrain: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * NodeActions 组件
 * 提供调度器节点的操作按钮：编辑、维护、排空、删除
 * 根据节点状态显示不同的操作按钮
 */
export const NodeActions = memo<NodeActionsProps>(
  ({ node, onEdit, onToggleMaintenance, onDrain, onDelete }) => {
    return (
      <Space size="small">
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(node)}>
          编辑
        </Button>

        {/* 活跃状态：显示"维护"按钮 */}
        {node.status === 'active' && (
          <Button
            type="link"
            size="small"
            icon={<ToolOutlined />}
            onClick={() => onToggleMaintenance(node.id, true)}
          >
            维护
          </Button>
        )}

        {/* 维护状态：显示"恢复"按钮 */}
        {node.status === 'maintenance' && (
          <Button type="link" size="small" onClick={() => onToggleMaintenance(node.id, false)}>
            恢复
          </Button>
        )}

        {/* 排空节点 */}
        <Popconfirm
          title="排空节点将迁移所有设备，确定继续？"
          onConfirm={() => onDrain(node.id)}
        >
          <Button type="link" size="small" danger icon={<WarningOutlined />}>
            排空
          </Button>
        </Popconfirm>

        {/* 删除节点 */}
        <Popconfirm title="确定删除此节点？" onConfirm={() => onDelete(node.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      </Space>
    );
  }
);

NodeActions.displayName = 'NodeActions';
