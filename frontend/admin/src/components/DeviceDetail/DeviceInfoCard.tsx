import React from 'react';
import { Card, Descriptions, Space, Button } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Device } from '@/types';
import dayjs from 'dayjs';
import { getStatusTag } from './utils';

interface DeviceInfoCardProps {
  device: Device;
  loading: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onScreenshot: () => void;
}

export const DeviceInfoCard: React.FC<DeviceInfoCardProps> = React.memo(
  ({ device, loading, onStart, onStop, onRestart, onScreenshot }) => {
    return (
      <Card title="设备信息" loading={loading} style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="设备名称">{device.name}</Descriptions.Item>
          <Descriptions.Item label="状态">{getStatusTag(device.status)}</Descriptions.Item>
          <Descriptions.Item label="Android 版本">{device.androidVersion}</Descriptions.Item>
          <Descriptions.Item label="CPU 核心数">{device.cpuCores}</Descriptions.Item>
          <Descriptions.Item label="内存">{device.memoryMB} MB</Descriptions.Item>
          <Descriptions.Item label="存储">{device.storageMB} MB</Descriptions.Item>
          <Descriptions.Item label="IP 地址">{device.ipAddress || '-'}</Descriptions.Item>
          <Descriptions.Item label="ADB 端口">{device.adbPort || '-'}</Descriptions.Item>
          <Descriptions.Item label="VNC 端口">{device.vncPort || '-'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(device.createdAt).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="最后启动时间">
            {device.lastStartedAt ? dayjs(device.lastStartedAt).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="最后停止时间">
            {device.lastStoppedAt ? dayjs(device.lastStoppedAt).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 16 }}>
          <Space>
            {device.status !== 'running' && (
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={onStart}>
                启动
              </Button>
            )}
            {device.status === 'running' && (
              <>
                <Button icon={<PauseCircleOutlined />} onClick={onStop}>
                  停止
                </Button>
                <Button icon={<ReloadOutlined />} onClick={onRestart}>
                  重启
                </Button>
              </>
            )}
            <Button onClick={onScreenshot}>截图</Button>
          </Space>
        </div>
      </Card>
    );
  }
);

DeviceInfoCard.displayName = 'DeviceInfoCard';
