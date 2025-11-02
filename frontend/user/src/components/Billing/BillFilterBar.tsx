import React, { useMemo } from 'react';
import { Card, Space, Input, Select, DatePicker, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { BillType, BillStatus } from '@/services/billing';

const { RangePicker } = DatePicker;
const { Search } = Input;
const { Option } = Select;

interface BillFilterBarProps {
  onSearch: (keyword: string) => void;
  onTypeChange: (type?: BillType) => void;
  onStatusChange: (status?: BillStatus) => void;
  onDateRangeChange: (dates: any) => void;
  onRefresh: () => void;
}

/**
 * 账单筛选工具栏组件
 * 包含搜索、类型筛选、状态筛选、日期筛选和刷新按钮
 */
export const BillFilterBar: React.FC<BillFilterBarProps> = React.memo(({
  onSearch,
  onTypeChange,
  onStatusChange,
  onDateRangeChange,
  onRefresh,
}) => {
  // 账单类型配置
  const billTypeOptions = useMemo(() => [
    { label: '订阅费', value: BillType.SUBSCRIPTION, color: 'blue' },
    { label: '使用费', value: BillType.USAGE, color: 'cyan' },
    { label: '充值', value: BillType.RECHARGE, color: 'green' },
    { label: '退款', value: BillType.REFUND, color: 'orange' },
    { label: '违约金', value: BillType.PENALTY, color: 'red' },
    { label: '折扣', value: BillType.DISCOUNT, color: 'purple' },
    { label: '优惠券', value: BillType.COUPON, color: 'magenta' },
    { label: '佣金', value: BillType.COMMISSION, color: 'gold' },
  ], []);

  // 状态配置
  const statusOptions = useMemo(() => [
    { label: '待支付', value: BillStatus.PENDING },
    { label: '已支付', value: BillStatus.PAID },
    { label: '已取消', value: BillStatus.CANCELLED },
    { label: '已退款', value: BillStatus.REFUNDED },
    { label: '已逾期', value: BillStatus.OVERDUE },
    { label: '部分支付', value: BillStatus.PARTIAL },
  ], []);

  return (
    <Card style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space wrap>
          <Search
            placeholder="搜索账单号"
            onSearch={onSearch}
            style={{ width: 200 }}
            allowClear
          />

          <Select
            placeholder="账单类型"
            style={{ width: 120 }}
            allowClear
            onChange={onTypeChange}
          >
            {billTypeOptions.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>

          <Select
            placeholder="账单状态"
            style={{ width: 120 }}
            allowClear
            onChange={onStatusChange}
          >
            {statusOptions.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>

          <RangePicker
            format="YYYY-MM-DD"
            placeholder={['开始日期', '结束日期']}
            onChange={onDateRangeChange}
          />

          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
        </Space>
      </Space>
    </Card>
  );
});

BillFilterBar.displayName = 'BillFilterBar';
