/**
 * LifecycleRuleActions - 生命周期规则操作按钮组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Space, Button, Popconfirm } from 'antd';
import {
  PlayCircleOutlined,
  ExperimentOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { LifecycleRule } from '@/types';

interface LifecycleRuleActionsProps {
  rule: LifecycleRule;
  onExecute: (id: string, name: string) => void;
  onTest: (id: string, name: string) => void;
  onEdit: (rule: LifecycleRule) => void;
  onDelete: (id: string) => void;
}

/**
 * LifecycleRuleActions 组件
 * 提供生命周期规则的操作按钮：执行、测试、编辑、删除
 */
export const LifecycleRuleActions = memo<LifecycleRuleActionsProps>(
  ({ rule, onExecute, onTest, onEdit, onDelete }) => {
    return (
      <Space size="small">
        <Button
          type="link"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => onExecute(rule.id, rule.name)}
          disabled={!rule.enabled}
        >
          执行
        </Button>
        <Button
          type="link"
          size="small"
          icon={<ExperimentOutlined />}
          onClick={() => onTest(rule.id, rule.name)}
        >
          测试
        </Button>
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => onEdit(rule)}
        >
          编辑
        </Button>
        <Popconfirm title="确定删除此规则？" onConfirm={() => onDelete(rule.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      </Space>
    );
  }
);

LifecycleRuleActions.displayName = 'LifecycleRuleActions';
