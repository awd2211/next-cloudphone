import { memo } from 'react';
import { Space, Button, Input, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Search } = Input;
const { Option } = Select;

interface TemplateFilterBarProps {
  onCreateClick: () => void;
  onSearch: (value: string) => void;
  onCategoryChange: (value: string | undefined) => void;
  onVisibilityChange: (value: boolean | undefined) => void;
}

export const TemplateFilterBar = memo<TemplateFilterBarProps>(
  ({ onCreateClick, onSearch, onCategoryChange, onVisibilityChange }) => {
    return (
      <Space style={{ marginBottom: '16px' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateClick}>
          新建模板
        </Button>
        <Search
          placeholder="搜索模板名称或描述"
          allowClear
          style={{ width: 300 }}
          onSearch={onSearch}
        />
        <Select
          placeholder="选择分类"
          allowClear
          style={{ width: 150 }}
          onChange={onCategoryChange}
        >
          <Option value="开发测试">开发测试</Option>
          <Option value="游戏">游戏</Option>
          <Option value="社交">社交</Option>
          <Option value="办公">办公</Option>
          <Option value="其他">其他</Option>
        </Select>
        <Select
          placeholder="可见性"
          allowClear
          style={{ width: 120 }}
          onChange={onVisibilityChange}
        >
          <Option value={true}>公开</Option>
          <Option value={false}>私有</Option>
        </Select>
      </Space>
    );
  }
);

TemplateFilterBar.displayName = 'TemplateFilterBar';
