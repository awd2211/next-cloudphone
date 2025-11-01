import React from 'react';
import { Alert } from 'antd';

export const ExceptionInfoAlert: React.FC = React.memo(() => {
  return (
    <Alert
      message="异常支付定义"
      description={
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>长时间处理中：支付状态为"处理中"超过 24 小时</li>
          <li>长时间待支付：支付状态为"待支付"超过 48 小时</li>
          <li>支付失败：支付状态为"失败"</li>
          <li>退款超时：退款状态为"退款中"超过 72 小时</li>
        </ul>
      }
      type="info"
      showIcon
    />
  );
});

ExceptionInfoAlert.displayName = 'ExceptionInfoAlert';
