import { memo } from 'react';
import { Card, Form, Row, Col, Select, Input, DatePicker, Button, Space } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';

const { Option } = Select;
const { RangePicker } = DatePicker;

export interface PaymentFilterPanelProps {
  form: FormInstance;
  onFilter: (values: any) => void;
  onClearFilters: () => void;
}

/**
 * 支付高级筛选面板组件
 */
export const PaymentFilterPanel = memo<PaymentFilterPanelProps>(
  ({ form, onFilter, onClearFilters }) => {
    return (
      <Card title="高级筛选">
        <Form form={form} onFinish={onFilter} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="支付状态" name="status">
                <Select placeholder="全部" allowClear>
                  <Option value="pending">待支付</Option>
                  <Option value="processing">支付中</Option>
                  <Option value="success">支付成功</Option>
                  <Option value="failed">支付失败</Option>
                  <Option value="refunding">退款中</Option>
                  <Option value="refunded">已退款</Option>
                  <Option value="cancelled">已取消</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="支付方式" name="method">
                <Select placeholder="全部" allowClear>
                  <Option value="wechat">微信支付</Option>
                  <Option value="alipay">支付宝</Option>
                  <Option value="balance">余额支付</Option>
                  <Option value="stripe">Stripe</Option>
                  <Option value="paypal">PayPal</Option>
                  <Option value="paddle">Paddle</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="用户ID" name="userId">
                <Input placeholder="输入用户ID" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="日期范围" name="dateRange">
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col>
              <Space>
                <Button type="primary" htmlType="submit">
                  应用筛选
                </Button>
                <Button icon={<ClearOutlined />} onClick={onClearFilters}>
                  清空筛选
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>
    );
  }
);

PaymentFilterPanel.displayName = 'PaymentFilterPanel';
