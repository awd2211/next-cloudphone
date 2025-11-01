import { memo } from 'react';
import { Space, Select, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Option } = Select;

interface TemplateFilterBarProps {
  filterType?: string;
  filterActive?: boolean;
  onTypeChange: (type: string | undefined) => void;
  onActiveChange: (active: boolean | undefined) => void;
  onCreate: () => void;
}

export const TemplateFilterBar = memo<TemplateFilterBarProps>(
  ({ filterType, filterActive, onTypeChange, onActiveChange, onCreate }) => {
    return (
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Select
            placeholder="筛选类型"
            style={{ width: 120 }}
            allowClear
            value={filterType}
            onChange={onTypeChange}
          >
            <Option value="email">邮件</Option>
            <Option value="sms">短信</Option>
            <Option value="websocket">站内</Option>
          </Select>
          <Select
            placeholder="筛选状态"
            style={{ width: 120 }}
            allowClear
            value={filterActive}
            onChange={onActiveChange}
          >
            <Option value={true}>已激活</Option>
            <Option value={false}>已停用</Option>
          </Select>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          新建模板
        </Button>
      </div>
    );
  }
);

TemplateFilterBar.displayName = 'TemplateFilterBar';
