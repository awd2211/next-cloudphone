import React from 'react';
import { Alert } from 'antd';
import { securityAlertConfig } from '@/utils/paymentConfig';

/**
 * 安全提示组件
 *
 * 优化点:
 * - 使用 React.memo 优化（静态内容）
 * - 配置驱动显示
 * - 独立可复用
 */
export const SecurityAlert: React.FC = React.memo(() => {
  return (
    <Alert
      message={securityAlertConfig.message}
      description={securityAlertConfig.description}
      type={securityAlertConfig.type}
      showIcon={securityAlertConfig.showIcon}
      style={{ marginBottom: 24 }}
    />
  );
});

SecurityAlert.displayName = 'SecurityAlert';
