import React from 'react';
import { Space, DatePicker, Select, Input, Button } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface TransactionFilterBarProps {
  typeFilter: string;
  statusFilter: string;
  searchText: string;
  onTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
}

export const TransactionFilterBar: React.FC<TransactionFilterBarProps> = React.memo(
  ({ typeFilter, statusFilter, searchText, onTypeChange, onStatusChange, onSearchChange, onReset }) => {
    return (
      <Space style={{ marginBottom: 16 }} wrap>
        <RangePicker />
        <Select
          style={{ width: 120 }}
          value={typeFilter}
          onChange={onTypeChange}
          placeholder="交易类型"
        >
          <Option value="all">全部类型</Option>
          <Option value="recharge">充值</Option>
          <Option value="consumption">消费</Option>
          <Option value="refund">退款</Option>
          <Option value="freeze">冻结</Option>
          <Option value="unfreeze">解冻</Option>
        </Select>
        <Select
          style={{ width: 120 }}
          value={statusFilter}
          onChange={onStatusChange}
          placeholder="交易状态"
        >
          <Option value="all">全部状态</Option>
          <Option value="success">成功</Option>
          <Option value="pending">处理中</Option>
          <Option value="failed">失败</Option>
        </Select>
        <Input
          placeholder="搜索描述或订单号"
          prefix={<SearchOutlined />}
          style={{ width: 220 }}
          value={searchText}
          onChange={onSearchChange}
        />
        <Button icon={<FilterOutlined />} onClick={onReset}>
          重置
        </Button>
      </Space>
    );
  }
);

TransactionFilterBar.displayName = 'TransactionFilterBar';
