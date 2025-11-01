import React from 'react';
import { Tag } from 'antd';

interface PaymentStatusTagProps {
  status: string;
}

const statusConfig: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '待支付' },
  processing: { color: 'orange', text: '支付中' },
  success: { color: 'green', text: '支付成功' },
  failed: { color: 'red', text: '支付失败' },
  refunding: { color: 'orange', text: '退款中' },
  refunded: { color: 'purple', text: '已退款' },
  cancelled: { color: 'default', text: '已取消' },
};

export const PaymentStatusTag: React.FC<PaymentStatusTagProps> = React.memo(({ status }) => {
  const config = statusConfig[status] || { color: 'default', text: status };
  return <Tag color={config.color}>{config.text}</Tag>;
});

PaymentStatusTag.displayName = 'PaymentStatusTag';
