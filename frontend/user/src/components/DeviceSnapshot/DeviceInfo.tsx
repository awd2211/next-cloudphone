import React from 'react';
import { Alert } from 'antd';
import type { Device } from '@/types';

interface DeviceInfoProps {
  device: Device | null;
}

/**
 * 设备信息组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 条件渲染（无设备时不显示）
 * - 简洁的状态显示
 */
export const DeviceInfo: React.FC<DeviceInfoProps> = React.memo(({ device }) => {
  if (!device) return null;

  const statusText = device.status === 'running' ? '运行中' : '已停止';

  return (
    <Alert
      message={`设备: ${device.name}`}
      description={`当前状态: ${statusText}`}
      type="info"
      showIcon
      style={{ marginBottom: 16 }}
    />
  );
});

DeviceInfo.displayName = 'DeviceInfo';
