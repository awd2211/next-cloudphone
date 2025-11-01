/**
 * 设备操作按钮组件（Memo 优化）
 *
 * 优化原理：
 * 1. 使用 React.memo 避免不必要的重渲染
 * 2. 接收稳定的回调函数（useCallback）
 * 3. 只在 device 或 loading 状态变化时重渲染
 */
import { memo } from 'react';
import { Button, Space, Popconfirm } from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Device } from '@/types';
import { PermissionGuard } from '@/hooks/usePermission';

interface DeviceActionsProps {
  device: Device;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onReboot: (id: string) => void;
  onDelete: (id: string) => void;
  loading?: {
    start?: boolean;
    stop?: boolean;
    reboot?: boolean;
    delete?: boolean;
  };
}

export const DeviceActions = memo<DeviceActionsProps>(
  ({ device, onStart, onStop, onReboot, onDelete, loading = {} }) => {
    const navigate = useNavigate();

    return (
      <Space size="small">
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/devices/${device.id}`)}
        >
          详情
        </Button>

        {device.status !== 'running' ? (
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => onStart(device.id)}
            loading={loading.start}
          >
            启动
          </Button>
        ) : (
          <Button
            type="link"
            size="small"
            icon={<StopOutlined />}
            onClick={() => onStop(device.id)}
            loading={loading.stop}
          >
            停止
          </Button>
        )}

        <Button
          type="link"
          size="small"
          icon={<ReloadOutlined />}
          onClick={() => onReboot(device.id)}
          loading={loading.reboot}
        >
          重启
        </Button>

        <PermissionGuard permission="device.delete">
          <Popconfirm
            title="确定删除该设备？"
            onConfirm={() => onDelete(device.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={loading.delete}
            >
              删除
            </Button>
          </Popconfirm>
        </PermissionGuard>
      </Space>
    );
  }
);

DeviceActions.displayName = 'DeviceActions';
