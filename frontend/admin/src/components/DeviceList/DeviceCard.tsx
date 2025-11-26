import React, { memo, useState, useCallback } from 'react';
import { Card, Tag, Button, Space, Avatar, Tooltip, message, Modal } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  DesktopOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import LazyImage from '../LazyImage';
import { NEUTRAL_LIGHT } from '@/theme';
import { startDevice, stopDevice, deleteDevice } from '@/services/device';

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
  onDeviceChanged?: () => void; // Callback for refreshing device list after operations
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

const DeviceCard: React.FC<DeviceCardProps> = memo(({ device, onClick, onDeviceChanged }) => {
  const [loading, setLoading] = useState(false);
  const providerName = ProviderDisplayNamesCN[device.providerType] || device.providerType;
  const statusName = statusNames[device.status] || device.status;

  // ✅ 使用 useCallback 包装事件处理函数，稳定函数引用
  const handleStart = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      setLoading(true);
      try {
        await startDevice(device.id);
        message.success(`设备 "${device.name}" 启动成功`);
        // Refresh device list to show updated status
        onDeviceChanged?.();
      } catch (error: any) {
        message.error(
          `启动设备失败: ${error.response?.data?.message || error.message || '未知错误'}`
        );
      } finally {
        setLoading(false);
      }
    },
    [device.id, device.name, onDeviceChanged]
  );

  const handleStop = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      setLoading(true);
      try {
        await stopDevice(device.id);
        message.success(`设备 "${device.name}" 停止成功`);
        // Refresh device list to show updated status
        onDeviceChanged?.();
      } catch (error: any) {
        message.error(
          `停止设备失败: ${error.response?.data?.message || error.message || '未知错误'}`
        );
      } finally {
        setLoading(false);
      }
    },
    [device.id, device.name, onDeviceChanged]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      Modal.confirm({
        title: '确认删除设备',
        icon: <ExclamationCircleOutlined />,
        content: `确定要删除设备 "${device.name}" 吗？此操作无法撤销。`,
        okText: '确认删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          try {
            await deleteDevice(device.id);
            message.success(`设备 "${device.name}" 删除成功`);
            // Refresh device list to remove deleted device
            onDeviceChanged?.();
          } catch (error: any) {
            message.error(
              `删除设备失败: ${error.response?.data?.message || error.message || '未知错误'}`
            );
          }
        },
      });
    },
    [device.id, device.name, onDeviceChanged]
  );

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
          <div style={{ fontSize: '12px', color: NEUTRAL_LIGHT.text.secondary, marginTop: '4px' }}>
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
                loading={loading}
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
                loading={loading}
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
                loading={loading}
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
