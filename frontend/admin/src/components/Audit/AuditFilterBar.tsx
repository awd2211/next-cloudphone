import React from 'react';
import { Space, DatePicker, Select, Input, Button } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface AuditFilterBarProps {
  resourceTypeFilter: string;
  methodFilter: string;
  statusFilter: string;
  searchText: string;
  onResourceTypeChange: (value: string) => void;
  onMethodChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onReset: () => void;
}

export const AuditFilterBar: React.FC<AuditFilterBarProps> = React.memo(
  ({
    resourceTypeFilter,
    methodFilter,
    statusFilter,
    searchText,
    onResourceTypeChange,
    onMethodChange,
    onStatusChange,
    onSearchChange,
    onReset,
  }) => {
    return (
      <Space style={{ marginBottom: 16 }} wrap>
        <RangePicker />
        <Select
          style={{ width: 120 }}
          value={resourceTypeFilter}
          onChange={onResourceTypeChange}
          placeholder="资源类型"
        >
          <Option value="all">全部类型</Option>
          <Option value="user">用户</Option>
          <Option value="device">设备</Option>
          <Option value="plan">套餐</Option>
          <Option value="quota">配额</Option>
          <Option value="billing">账单</Option>
          <Option value="ticket">工单</Option>
          <Option value="apikey">API密钥</Option>
          <Option value="system">系统</Option>
        </Select>
        <Select
          style={{ width: 100 }}
          value={methodFilter}
          onChange={onMethodChange}
          placeholder="方法"
        >
          <Option value="all">全部方法</Option>
          <Option value="GET">GET</Option>
          <Option value="POST">POST</Option>
          <Option value="PUT">PUT</Option>
          <Option value="DELETE">DELETE</Option>
          <Option value="PATCH">PATCH</Option>
        </Select>
        <Select
          style={{ width: 100 }}
          value={statusFilter}
          onChange={onStatusChange}
          placeholder="状态"
        >
          <Option value="all">全部状态</Option>
          <Option value="success">成功</Option>
          <Option value="failed">失败</Option>
          <Option value="warning">警告</Option>
        </Select>
        <Input
          placeholder="搜索操作、操作人或详情"
          prefix={<SearchOutlined />}
          style={{ width: 250 }}
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <Button icon={<FilterOutlined />} onClick={onReset}>
          重置
        </Button>
      </Space>
    );
  }
);

AuditFilterBar.displayName = 'AuditFilterBar';
