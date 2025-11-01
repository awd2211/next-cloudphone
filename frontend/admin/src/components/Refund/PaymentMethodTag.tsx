import React from 'react';
import { Tag } from 'antd';

interface PaymentMethodTagProps {
  method: string;
}

const methodConfig: Record<string, { color: string; text: string }> = {
  wechat: { color: 'green', text: '微信支付' },
  alipay: { color: 'blue', text: '支付宝' },
  balance: { color: 'orange', text: '余额支付' },
  stripe: { color: 'purple', text: 'Stripe' },
  paypal: { color: 'blue', text: 'PayPal' },
  paddle: { color: 'cyan', text: 'Paddle' },
};

export const PaymentMethodTag: React.FC<PaymentMethodTagProps> = React.memo(({ method }) => {
  const config = methodConfig[method] || { color: 'default', text: method };
  return <Tag color={config.color}>{config.text}</Tag>;
});

PaymentMethodTag.displayName = 'PaymentMethodTag';
