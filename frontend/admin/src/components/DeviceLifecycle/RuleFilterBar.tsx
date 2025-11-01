/**
 * RuleFilterBar - 规则筛选栏组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Space, Select, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Option } = Select;

interface RuleFilterBarProps {
  filterType: string | undefined;
  filterEnabled: boolean | undefined;
  onFilterTypeChange: (value: string | undefined) => void;
  onFilterEnabledChange: (value: boolean | undefined) => void;
  onCreateRule: () => void;
}

/**
 * RuleFilterBar 组件
 * 规则列表的筛选器和操作按钮
 */
export const RuleFilterBar = memo<RuleFilterBarProps>(
  ({ filterType, filterEnabled, onFilterTypeChange, onFilterEnabledChange, onCreateRule }) => {
    return (
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Select
            placeholder="筛选类型"
            style={{ width: 140 }}
            allowClear
            value={filterType}
            onChange={onFilterTypeChange}
          >
            <Option value="cleanup">自动清理</Option>
            <Option value="autoscaling">自动扩缩</Option>
            <Option value="backup">自动备份</Option>
            <Option value="expiration-warning">到期提醒</Option>
          </Select>
          <Select
            placeholder="筛选状态"
            style={{ width: 120 }}
            allowClear
            value={filterEnabled}
            onChange={onFilterEnabledChange}
          >
            <Option value={true}>已启用</Option>
            <Option value={false}>已禁用</Option>
          </Select>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateRule}>
          新建规则
        </Button>
      </div>
    );
  }
);

RuleFilterBar.displayName = 'RuleFilterBar';
