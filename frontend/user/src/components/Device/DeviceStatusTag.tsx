import React from 'react';
import { Tag } from 'antd';

interface DeviceStatusTagProps {
  status: string;
}

const statusMap: Record<string, { color: string; text: string }> = {
  idle: { color: 'default', text: '空闲' },
  running: { color: 'green', text: '运行中' },
  stopped: { color: 'red', text: '已停止' },
  error: { color: 'red', text: '错误' },
};

export const DeviceStatusTag: React.FC<DeviceStatusTagProps> = React.memo(({ status }) => {
  const config = statusMap[status] || { color: 'default', text: status };
  return <Tag color={config.color}>{config.text}</Tag>;
});

DeviceStatusTag.displayName = 'DeviceStatusTag';
