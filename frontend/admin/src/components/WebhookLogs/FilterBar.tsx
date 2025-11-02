import React from 'react';
import { Card, Space, Select, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const { Option } = Select;

interface FilterBarProps {
  provider?: string;
  onProviderChange: (value: string | undefined) => void;
  onRefresh: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  provider,
  onProviderChange,
  onRefresh,
}) => {
  return (
    <Card>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0 }}>Webhook 日志</h2>
          <p style={{ margin: '8px 0 0', color: '#666' }}>查看和监控支付平台的 Webhook 事件</p>
        </div>
        <Space>
          <Select
            style={{ width: 150 }}
            placeholder="全部提供商"
            allowClear
            value={provider}
            onChange={onProviderChange}
          >
            <Option value="stripe">Stripe</Option>
            <Option value="paypal">PayPal</Option>
            <Option value="paddle">Paddle</Option>
            <Option value="wechat">微信支付</Option>
            <Option value="alipay">支付宝</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
        </Space>
      </Space>
    </Card>
  );
};
