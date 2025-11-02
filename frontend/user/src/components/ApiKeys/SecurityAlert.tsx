import React, { memo } from 'react';
import { Alert } from 'antd';

export const SecurityAlert = memo(() => {
  return (
    <Alert
      message="安全提示"
      description={
        <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
          <li>请妥善保管您的 API Key，不要将其提交到代码仓库或公开分享</li>
          <li>定期轮换 API Key，建议每 3-6 个月更换一次</li>
          <li>为不同环境（开发、测试、生产）创建独立的 API Key</li>
          <li>如果发现 API Key 泄露，请立即撤销并创建新的密钥</li>
        </ul>
      }
      type="warning"
      showIcon
      closable
      style={{ marginBottom: 16 }}
    />
  );
});

SecurityAlert.displayName = 'SecurityAlert';
