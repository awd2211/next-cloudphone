import { memo } from 'react';
import { Card, Row, Col, Input, Select, DatePicker } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { DatePickerProps } from 'antd';

const { Search } = Input;
const { RangePicker } = DatePicker;

export interface OrderFilterBarProps {
  onSearchChange: (keyword: string) => void;
  onStatusChange: (status: string | undefined) => void;
  onPaymentMethodChange: (method: string | undefined) => void;
  onDateRangeChange: (range: [string, string] | null) => void;
}

/**
 * 订单筛选栏组件
 */
export const OrderFilterBar = memo<OrderFilterBarProps>(
  ({ onSearchChange, onStatusChange, onPaymentMethodChange, onDateRangeChange }) => {
    return (
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="搜索订单号/用户名"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={onSearchChange}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="订单状态"
              style={{ width: '100%' }}
              allowClear
              onChange={onStatusChange}
            >
              <Select.Option value="pending">待支付</Select.Option>
              <Select.Option value="paid">已支付</Select.Option>
              <Select.Option value="cancelled">已取消</Select.Option>
              <Select.Option value="refunded">已退款</Select.Option>
              <Select.Option value="expired">已过期</Select.Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="支付方式"
              style={{ width: '100%' }}
              allowClear
              onChange={onPaymentMethodChange}
            >
              <Select.Option value="wechat">微信支付</Select.Option>
              <Select.Option value="alipay">支付宝</Select.Option>
              <Select.Option value="balance">余额支付</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  onDateRangeChange([
                    dates[0].format('YYYY-MM-DD'),
                    dates[1].format('YYYY-MM-DD'),
                  ]);
                } else {
                  onDateRangeChange(null);
                }
              }}
            />
          </Col>
        </Row>
      </Card>
    );
  }
);

OrderFilterBar.displayName = 'OrderFilterBar';
