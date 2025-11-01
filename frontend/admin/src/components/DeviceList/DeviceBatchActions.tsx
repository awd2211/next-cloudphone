import { memo } from 'react';
import { Space, Button, Popconfirm, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { PermissionGuard } from '@/hooks/usePermission';

interface DeviceBatchActionsProps {
  selectedCount: number;
  onCreateClick: () => void;
  onBatchStart: () => void;
  onBatchStop: () => void;
  onBatchReboot: () => void;
  onBatchDelete: () => void;
  exportMenuItems: MenuProps['items'];
}

/**
 * 设备批量操作组件
 * 包含创建设备、批量启动、停止、重启、删除、导出功能
 */
export const DeviceBatchActions = memo<DeviceBatchActionsProps>(
  ({
    selectedCount,
    onCreateClick,
    onBatchStart,
    onBatchStop,
    onBatchReboot,
    onBatchDelete,
    exportMenuItems,
  }) => {
    return (
      <Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateClick}>
          创建设备
        </Button>

        {selectedCount > 0 && (
          <>
            <Button icon={<PlayCircleOutlined />} onClick={onBatchStart}>
              批量启动 ({selectedCount})
            </Button>
            <Button icon={<StopOutlined />} onClick={onBatchStop}>
              批量停止
            </Button>
            <Button icon={<ReloadOutlined />} onClick={onBatchReboot}>
              批量重启
            </Button>
            <PermissionGuard permission="device.delete">
              <Popconfirm
                title={`确定删除 ${selectedCount} 台设备？`}
                onConfirm={onBatchDelete}
                okText="确定"
                cancelText="取消"
              >
                <Button danger icon={<DeleteOutlined />}>
                  批量删除
                </Button>
              </Popconfirm>
            </PermissionGuard>
          </>
        )}

        <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
          <Button icon={<DownloadOutlined />}>
            导出 <DownOutlined />
          </Button>
        </Dropdown>
      </Space>
    );
  }
);

DeviceBatchActions.displayName = 'DeviceBatchActions';
