import React from 'react';
import { Space, Input, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { CATEGORY_OPTIONS, STATUS_OPTIONS, PRIORITY_OPTIONS } from './constants';

interface TicketFilterBarProps {
  searchText: string;
  categoryFilter: string;
  statusFilter: string;
  priorityFilter: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
}

export const TicketFilterBar: React.FC<TicketFilterBarProps> = React.memo(
  ({
    searchText,
    categoryFilter,
    statusFilter,
    priorityFilter,
    onSearchChange,
    onCategoryChange,
    onStatusChange,
    onPriorityChange,
  }) => {
    return (
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索工单编号或标题"
          prefix={<SearchOutlined />}
          style={{ width: 250 }}
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <Select
          style={{ width: 130 }}
          value={categoryFilter}
          onChange={onCategoryChange}
          placeholder="分类"
          options={CATEGORY_OPTIONS}
        />
        <Select
          style={{ width: 130 }}
          value={statusFilter}
          onChange={onStatusChange}
          placeholder="状态"
          options={STATUS_OPTIONS}
        />
        <Select
          style={{ width: 120 }}
          value={priorityFilter}
          onChange={onPriorityChange}
          placeholder="优先级"
          options={PRIORITY_OPTIONS}
        />
      </Space>
    );
  }
);

TicketFilterBar.displayName = 'TicketFilterBar';
