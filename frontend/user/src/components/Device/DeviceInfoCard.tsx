import React from 'react';
import { Card, Descriptions } from 'antd';
import { DeviceStatusTag } from './DeviceStatusTag';
import type { Device } from '@/types';
import dayjs from 'dayjs';

interface DeviceInfoCardProps {
  device: Device;
  loading?: boolean;
}

/**
 * 设备信息卡片组件
 * 展示设备的详细信息
 */
export const DeviceInfoCard: React.FC<DeviceInfoCardProps> = React.memo(({
  device,
  loading = false,
}) => {
  return (
    <Card title="设备信息" loading={loading}>
      <Descriptions column={2} bordered>
        <Descriptions.Item label="设备名称">{device.name}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <DeviceStatusTag status={device.status} />
        </Descriptions.Item>
        <Descriptions.Item label="Android 版本">
          {device.androidVersion}
        </Descriptions.Item>
        <Descriptions.Item label="CPU 核心数">
          {device.cpuCores}
        </Descriptions.Item>
        <Descriptions.Item label="内存">
          {device.memoryMB} MB
        </Descriptions.Item>
        <Descriptions.Item label="存储">
          {device.storageMB} MB
        </Descriptions.Item>
        <Descriptions.Item label="IP 地址">
          {device.ipAddress || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="VNC 端口">
          {device.vncPort || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {dayjs(device.createdAt).format('YYYY-MM-DD HH:mm')}
        </Descriptions.Item>
        <Descriptions.Item label="最后启动时间">
          {device.lastStartedAt
            ? dayjs(device.lastStartedAt).format('YYYY-MM-DD HH:mm')
            : '-'}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
});

DeviceInfoCard.displayName = 'DeviceInfoCard';
