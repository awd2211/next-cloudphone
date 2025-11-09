/**
 * 设备操作按钮组件（Memo 优化）
 *
 * 优化原理：
 * 1. 使用 React.memo 避免不必要的重渲染
 * 2. 接收稳定的回调函数（useCallback）
 * 3. 只在 device 或 loading 状态变化时重渲染
 */
import { memo } from 'react';
import { Button, Space } from 'antd';
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
import { dangerConfirm } from '@/components/ConfirmDialog';

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
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            loading={loading.delete}
            onClick={async () => {
              const confirmed = await dangerConfirm({
                title: '删除设备',
                content: `确定要删除设备 "${device.name}" 吗？`,
                okText: '确认删除',
                cancelText: '取消',
                consequences: [
                  '设备上的所有数据将被永久删除',
                  '设备关联的快照和备份也将被删除',
                  '此操作无法撤销',
                ],
                requiresCheckbox: true,
                checkboxText: '我了解此操作无法撤销',
              });

              if (confirmed) {
                onDelete(device.id);
              }
            }}
          >
            删除
          </Button>
        </PermissionGuard>
      </Space>
    );
  }
);

DeviceActions.displayName = 'DeviceActions';
