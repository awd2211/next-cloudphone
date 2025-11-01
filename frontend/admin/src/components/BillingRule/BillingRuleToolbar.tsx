import { memo } from 'react';
import { Space, Select, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Option } = Select;

interface BillingRuleToolbarProps {
  filterActive: boolean | undefined;
  onFilterActiveChange: (value: boolean | undefined) => void;
  onCreate: () => void;
}

export const BillingRuleToolbar = memo<BillingRuleToolbarProps>(
  ({ filterActive, onFilterActiveChange, onCreate }) => {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Select
            placeholder="筛选状态"
            style={{ width: 120 }}
            allowClear
            value={filterActive}
            onChange={onFilterActiveChange}
          >
            <Option value={true}>激活</Option>
            <Option value={false}>停用</Option>
          </Select>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          新建规则
        </Button>
      </div>
    );
  }
);

BillingRuleToolbar.displayName = 'BillingRuleToolbar';
