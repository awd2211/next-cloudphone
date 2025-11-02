import React from 'react';
import { Space, Input, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Option } = Select;

interface FilterBarProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  levelFilter: string;
  onLevelChange: (value: string) => void;
  actionFilter: string;
  onActionChange: (value: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchText,
  onSearchChange,
  levelFilter,
  onLevelChange,
  actionFilter,
  onActionChange,
}) => {
  return (
    <Space>
      <Input
        placeholder="搜索用户或操作"
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ width: 200 }}
      />
      <Select value={levelFilter} onChange={onLevelChange} style={{ width: 120 }}>
        <Option value="all">所有级别</Option>
        <Option value="info">Info</Option>
        <Option value="warning">Warning</Option>
        <Option value="error">Error</Option>
      </Select>
      <Select value={actionFilter} onChange={onActionChange} style={{ width: 120 }}>
        <Option value="all">所有操作</Option>
        <Option value="登录">登录</Option>
        <Option value="登出">登出</Option>
        <Option value="创建设备">创建设备</Option>
        <Option value="删除设备">删除设备</Option>
      </Select>
    </Space>
  );
};
