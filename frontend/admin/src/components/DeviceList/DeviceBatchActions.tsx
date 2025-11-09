import { memo } from 'react';
import { Space, Button, Dropdown } from 'antd';
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
import { dangerBatchDelete } from '@/components/ConfirmDialog';

interface DeviceBatchActionsProps {
  selectedCount: number;
  onCreateClick: () => void;
  onBatchStart: () => void;
  onBatchStop: () => void;
  onBatchReboot: () => void;
  onBatchDelete: () => void;
  exportMenuItems: MenuProps['items'];
  /** 额外的操作按钮(如列设置) */
  extraActions?: React.ReactNode;
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
    extraActions,
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
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={async () => {
                  const confirmed = await dangerBatchDelete(selectedCount, '台设备');
                  if (confirmed) {
                    onBatchDelete();
                  }
                }}
              >
                批量删除
              </Button>
            </PermissionGuard>
          </>
        )}

        <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
          <Button icon={<DownloadOutlined />}>
            导出 <DownOutlined />
          </Button>
        </Dropdown>

        {/* 额外操作按钮 */}
        {extraActions}
      </Space>
    );
  }
);

DeviceBatchActions.displayName = 'DeviceBatchActions';
