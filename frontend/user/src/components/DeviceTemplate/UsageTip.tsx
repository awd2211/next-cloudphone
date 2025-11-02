import React from 'react';
import { Alert } from 'antd';
import { usageTipConfig } from '@/utils/templateConfig';

/**
 * 使用提示组件
 *
 * 优化点:
 * - 使用 React.memo 优化（静态内容）
 * - 配置驱动显示
 */
export const UsageTip: React.FC = React.memo(() => {
  return (
    <Alert
      message={usageTipConfig.message}
      description={usageTipConfig.description}
      type={usageTipConfig.type}
      showIcon
      closable
      style={{ marginBottom: 16 }}
    />
  );
});

UsageTip.displayName = 'UsageTip';
