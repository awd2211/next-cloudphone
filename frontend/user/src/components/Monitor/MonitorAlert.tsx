import React from 'react';
import { Alert } from 'antd';

interface MonitorAlertProps {
  autoRefresh: boolean;
}

/**
 * 实时监控提示组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 仅在自动刷新开启时显示
 */
export const MonitorAlert: React.FC<MonitorAlertProps> = React.memo(({ autoRefresh }) => {
  if (!autoRefresh) return null;

  return (
    <Alert
      message="实时监控中"
      description="数据每5秒自动刷新一次"
      type="info"
      showIcon
      closable
      style={{ marginBottom: 16 }}
    />
  );
});

MonitorAlert.displayName = 'MonitorAlert';
