import React from 'react';
import { Space, Input, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import {
  ticketTypeConfig,
  priorityConfig,
  statusConfig,
} from '@/utils/ticketConfig';
import type { TicketType, TicketPriority, TicketStatus } from '@/services/ticket';

const { Option } = Select;
const { Search } = Input;

interface FilterBarProps {
  keyword?: string;
  status?: TicketStatus;
  type?: TicketType;
  priority?: TicketPriority;
  onSearch: (keyword: string) => void;
  onStatusChange: (status: TicketStatus | undefined) => void;
  onTypeChange: (type: TicketType | undefined) => void;
  onPriorityChange: (priority: TicketPriority | undefined) => void;
}

/**
 * 筛选器栏组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 配置驱动的 Select 选项
 * - 统一的筛选器布局
 */
export const FilterBar: React.FC<FilterBarProps> = React.memo(
  ({ status, type, priority, onSearch, onStatusChange, onTypeChange, onPriorityChange }) => {
    return (
      <Space style={{ marginBottom: '16px' }} wrap>
        <Search
          placeholder="搜索工单标题或ID"
          allowClear
          style={{ width: 250 }}
          onSearch={onSearch}
          enterButton={<SearchOutlined />}
        />

        <Select
          placeholder="状态"
          allowClear
          style={{ width: 120 }}
          value={status}
          onChange={onStatusChange}
        >
          {Object.entries(statusConfig).map(([key, config]) => (
            <Option key={key} value={key}>
              {config.label}
            </Option>
          ))}
        </Select>

        <Select
          placeholder="类型"
          allowClear
          style={{ width: 120 }}
          value={type}
          onChange={onTypeChange}
        >
          {Object.entries(ticketTypeConfig).map(([key, config]) => (
            <Option key={key} value={key}>
              {config.label}
            </Option>
          ))}
        </Select>

        <Select
          placeholder="优先级"
          allowClear
          style={{ width: 100 }}
          value={priority}
          onChange={onPriorityChange}
        >
          {Object.entries(priorityConfig).map(([key, config]) => (
            <Option key={key} value={key}>
              {config.label}
            </Option>
          ))}
        </Select>
      </Space>
    );
  }
);

FilterBar.displayName = 'FilterBar';
