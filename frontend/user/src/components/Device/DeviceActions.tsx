import React from 'react';
import { Button, Space } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { Device } from '@/types';

interface DeviceActionsProps {
  device: Device;
  onView: (id: string) => void;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onReboot: (id: string) => void;
}

export const DeviceActions: React.FC<DeviceActionsProps> = React.memo(
  ({ device, onView, onStart, onStop, onReboot }) => {
    const isRunning = device.status === 'running';

    return (
      <Space size="small">
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => onView(device.id)}
        >
          查看
        </Button>
        {!isRunning ? (
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => onStart(device.id)}
          >
            启动
          </Button>
        ) : (
          <>
            <Button
              type="link"
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={() => onStop(device.id)}
              danger
            >
              停止
            </Button>
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => onReboot(device.id)}
            >
              重启
            </Button>
          </>
        )}
      </Space>
    );
  }
);

DeviceActions.displayName = 'DeviceActions';
