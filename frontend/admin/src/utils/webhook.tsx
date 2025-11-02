import React from 'react';
import { Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';

export const getProviderTag = (provider: string) => {
  const providerMap: Record<string, { color: string; text: string }> = {
    stripe: { color: 'purple', text: 'Stripe' },
    paypal: { color: 'blue', text: 'PayPal' },
    paddle: { color: 'cyan', text: 'Paddle' },
    wechat: { color: 'green', text: '微信支付' },
    alipay: { color: 'blue', text: '支付宝' },
  };
  const config = providerMap[provider] || { color: 'default', text: provider };
  return <Tag color={config.color}>{config.text}</Tag>;
};

export const getStatusTag = (status: string) => {
  const statusMap: Record<string, { icon: React.ReactNode; color: string; text: string }> = {
    success: { icon: <CheckCircleOutlined />, color: 'success', text: '成功' },
    failed: { icon: <CloseCircleOutlined />, color: 'error', text: '失败' },
    pending: { icon: <SyncOutlined spin />, color: 'processing', text: '处理中' },
  };
  const config = statusMap[status] || { icon: null, color: 'default', text: status };
  return (
    <Tag icon={config.icon} color={config.color}>
      {config.text}
    </Tag>
  );
};
