import React from 'react';
import { Button } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

interface DeviceControlButtonsProps {
  status: string;
  onStart: () => void;
  onStop: () => void;
  onReboot: () => void;
}

/**
 * 设备控制按钮组件
 * 根据设备状态显示启动/停止/重启按钮
 */
export const DeviceControlButtons: React.FC<DeviceControlButtonsProps> = React.memo(({
  status,
  onStart,
  onStop,
  onReboot,
}) => {
  if (status !== 'running') {
    return (
      <Button
        type="primary"
        size="large"
        icon={<PlayCircleOutlined />}
        onClick={onStart}
      >
        启动设备
      </Button>
    );
  }

  return (
    <>
      <Button
        size="large"
        icon={<PauseCircleOutlined />}
        onClick={onStop}
        style={{ marginRight: 12 }}
      >
        停止设备
      </Button>
      <Button
        size="large"
        icon={<ReloadOutlined />}
        onClick={onReboot}
      >
        重启设备
      </Button>
    </>
  );
});

DeviceControlButtons.displayName = 'DeviceControlButtons';
