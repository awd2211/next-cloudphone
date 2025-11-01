import React from 'react';
import { Tag } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { PaymentDetail } from '@/services/payment-admin';

interface ExceptionTypeTagProps {
  payment: PaymentDetail;
}

const typeColorMap: Record<string, string> = {
  长时间处理中: 'warning',
  长时间待支付: 'warning',
  支付失败: 'error',
  退款超时: 'error',
  其他异常: 'default',
};

export const getExceptionType = (payment: PaymentDetail): string => {
  const now = dayjs();
  const createdAt = dayjs(payment.createdAt);
  const hoursSinceCreated = now.diff(createdAt, 'hour');

  if (payment.status === 'processing' && hoursSinceCreated > 24) {
    return '长时间处理中';
  } else if (payment.status === 'pending' && hoursSinceCreated > 48) {
    return '长时间待支付';
  } else if (payment.status === 'failed') {
    return '支付失败';
  } else if (payment.status === 'refunding' && hoursSinceCreated > 72) {
    return '退款超时';
  }
  return '其他异常';
};

export const ExceptionTypeTag: React.FC<ExceptionTypeTagProps> = React.memo(({ payment }) => {
  const type = getExceptionType(payment);
  return (
    <Tag icon={<WarningOutlined />} color={typeColorMap[type] || 'default'}>
      {type}
    </Tag>
  );
});

ExceptionTypeTag.displayName = 'ExceptionTypeTag';
