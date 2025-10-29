import React, { memo } from 'react';
import { Card, Tag, Button, Space, Avatar, Tooltip } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  DesktopOutlined,
  SyncOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import LazyImage from '../LazyImage';

interface Device {
  id: string;
  name: string;
  userId: string;
  providerType: string;
  deviceType?: string;
  status: string;
  cpu?: number;
  memory?: number;
  gpuEnabled?: boolean;
  screenshotUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface DeviceCardProps {
  device: Device;
  onClick: () => void;
}

// Provider 中文名映射
const ProviderDisplayNamesCN: Record<string, string> = {
  REDROID: 'Redroid 容器设备',
  PHYSICAL: '物理 Android 设备',
  HUAWEI_CPH: '华为云手机',
  ALIYUN_ECP: '阿里云手机',
};

// 状态颜色映射
const statusColors: Record<string, string> = {
  running: 'success',
  stopped: 'default',
  creating: 'processing',
  error: 'error',
  deleting: 'warning',
};

// 状态中文名映射
const statusNames: Record<string, string> = {
  running: '运行中',
  stopped: '已停止',
  creating: '创建中',
  error: '错误',
  deleting: '删除中',
};

const DeviceCard: React.FC<DeviceCardProps> = memo(({ device, onClick }) => {
  const providerName = ProviderDisplayNamesCN[device.providerType] || device.providerType;
  const statusName = statusNames[device.status] || device.status;

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Start device:', device.id);
    // TODO: 调用启动设备 API
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Stop device:', device.id);
    // TODO: 调用停止设备 API
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Delete device:', device.id);
    // TODO: 调用删除设备 API
  };

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{ margin: '8px', height: '104px', cursor: 'pointer' }}
      bodyStyle={{ padding: '12px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* 设备截图 */}
        <LazyImage
          src={device.screenshotUrl || '/default-device.png'}
          width={80}
          height={80}
          alt={device.name}
          placeholder={<Avatar size={80} icon={<DesktopOutlined />} />}
        />

        {/* 设备信息 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: '14px',
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {device.name}
          </div>
          <Space size={4} wrap>
            <Tag color="blue">{providerName}</Tag>
            <Tag
              color={statusColors[device.status]}
              icon={
                device.status === 'creating' ? (
                  <SyncOutlined spin />
                ) : device.status === 'error' ? (
                  <CloseCircleOutlined />
                ) : undefined
              }
            >
              {statusName}
            </Tag>
            {device.deviceType && <Tag>{device.deviceType}</Tag>}
          </Space>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {device.cpu || 2} 核 · {device.memory || 2048} MB
            {device.gpuEnabled && ' · GPU'}
          </div>
        </div>

        {/* 操作按钮 */}
        <Space size="small">
          {device.status === 'stopped' && (
            <Tooltip title="启动设备">
              <Button
                type="text"
                size="large"
                icon={<PlayCircleOutlined style={{ fontSize: '18px' }} />}
                onClick={handleStart}
              />
            </Tooltip>
          )}
          {device.status === 'running' && (
            <Tooltip title="停止设备">
              <Button
                type="text"
                size="large"
                icon={<PauseCircleOutlined style={{ fontSize: '18px' }} />}
                onClick={handleStop}
              />
            </Tooltip>
          )}
          {device.status !== 'creating' && device.status !== 'deleting' && (
            <Tooltip title="删除设备">
              <Button
                type="text"
                size="large"
                danger
                icon={<DeleteOutlined style={{ fontSize: '18px' }} />}
                onClick={handleDelete}
              />
            </Tooltip>
          )}
        </Space>
      </div>
    </Card>
  );
});

DeviceCard.displayName = 'DeviceCard';

export default DeviceCard;
