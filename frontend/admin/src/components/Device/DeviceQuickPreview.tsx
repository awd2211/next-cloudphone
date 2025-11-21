/**
 * 设备快速预览组件
 *
 * 鼠标悬停在设备名称上时，显示设备详情卡片
 * 减少点击查看详情的操作路径
 */

import { Popover, Descriptions, Tag  } from 'antd';
import { memo, ReactNode } from 'react';
import type { Device } from '@/types';
import { DeviceStatusTag } from './DeviceStatusTag';

interface DeviceQuickPreviewProps {
  /** 设备数据 */
  device: Device;

  /** 触发预览的子元素（通常是设备名称） */
  children: ReactNode;

  /** 延迟显示时间（毫秒） */
  mouseEnterDelay?: number;

  /** 弹出位置 */
  placement?: 'top' | 'left' | 'right' | 'bottom' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}

/**
 * 格式化运行时间
 */

/**
 * 格式化日期时间
 */
const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * 设备快速预览组件
 *
 * @example
 * ```tsx
 * <DeviceQuickPreview device={device}>
 *   <span style={{ cursor: 'pointer', color: token.colorPrimary }}>
 *     {device.name}
 *   </span>
 * </DeviceQuickPreview>
 * ```
 */
export const DeviceQuickPreview = memo<DeviceQuickPreviewProps>(
  ({ device, children, mouseEnterDelay = 500, placement = 'right' }) => {
    // Removed unused token
    // 预览卡片内容
    const content = (
      <div style={{ width: 360 }}>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="设备 ID">
            <code style={{ fontSize: '12px' }}>{device.id}</code>
          </Descriptions.Item>

          <Descriptions.Item label="状态">
            <DeviceStatusTag status={device.status} />
          </Descriptions.Item>

          <Descriptions.Item label="配置">
            <div>
              <Tag color="blue">CPU: {device.cpuCores} 核</Tag>
              <Tag color="green">内存: {device.memoryMB} MB</Tag>
            </div>
            <div style={{ marginTop: 4 }}>
              <Tag color="purple">存储: {device.storageMB} MB</Tag>
            </div>
          </Descriptions.Item>

          <Descriptions.Item label="Android 版本">{device.androidVersion}</Descriptions.Item>

          {device.ipAddress && (
            <Descriptions.Item label="IP 地址">{device.ipAddress}</Descriptions.Item>
          )}

          {device.adbPort && (
            <Descriptions.Item label="ADB 端口">{device.adbPort}</Descriptions.Item>
          )}

          {device.vncPort && (
            <Descriptions.Item label="VNC 端口">{device.vncPort}</Descriptions.Item>
          )}

          {device.containerId && (
            <Descriptions.Item label="容器 ID">
              <code style={{ fontSize: '11px' }}>
                {device.containerId.substring(0, 12)}...
              </code>
            </Descriptions.Item>
          )}

          <Descriptions.Item label="创建时间">
            {formatDateTime(device.createdAt)}
          </Descriptions.Item>

          {device.lastStartedAt && (
            <Descriptions.Item label="最后启动时间">
              {formatDateTime(device.lastStartedAt)}
            </Descriptions.Item>
          )}

          {device.lastStoppedAt && (
            <Descriptions.Item label="最后停止时间">
              {formatDateTime(device.lastStoppedAt)}
            </Descriptions.Item>
          )}

          {device.user && (
            <Descriptions.Item label="所属用户">
              <div>
                <div>{device.user.username}</div>
                {device.user.email && (
                  <div style={{ fontSize: '12px', color: '#666' }}>{device.user.email}</div>
                )}
              </div>
            </Descriptions.Item>
          )}
        </Descriptions>
      </div>
    );

    return (
      <Popover
        content={content}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>{device.name}</strong>
            <DeviceStatusTag status={device.status} />
          </div>
        }
        trigger="hover"
        mouseEnterDelay={mouseEnterDelay / 1000} // Ant Design 使用秒
        placement={placement}
        overlayStyle={{ maxWidth: 400 }}
      >
        {children}
      </Popover>
    );
  }
);

DeviceQuickPreview.displayName = 'DeviceQuickPreview';
