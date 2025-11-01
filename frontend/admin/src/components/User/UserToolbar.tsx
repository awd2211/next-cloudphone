/**
 * UserToolbar - 用户操作工具栏组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Space, Button } from 'antd';
import {
  PlusOutlined,
  DownloadOutlined,
  UploadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { PermissionGuard } from '@/hooks/usePermission';

interface UserToolbarProps {
  selectedCount: number;
  onCreateUser: () => void;
  onExport: () => void;
  onImport: () => void;
  onBatchDelete: () => void;
  onBatchActivate: () => void;
  onBatchBan: () => void;
}

/**
 * UserToolbar 组件
 * 提供用户列表的操作按钮
 */
export const UserToolbar = memo<UserToolbarProps>(
  ({
    selectedCount,
    onCreateUser,
    onExport,
    onImport,
    onBatchDelete,
    onBatchActivate,
    onBatchBan,
  }) => {
    return (
      <Space style={{ marginBottom: 16 }} wrap>
        <PermissionGuard permission="user:create">
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreateUser}>
            创建用户
          </Button>
        </PermissionGuard>

        <Button icon={<DownloadOutlined />} onClick={onExport}>
          导出
        </Button>

        <Button icon={<UploadOutlined />} onClick={onImport}>
          导入
        </Button>

        {selectedCount > 0 && (
          <>
            <PermissionGuard permission="user:delete">
              <Button danger icon={<DeleteOutlined />} onClick={onBatchDelete}>
                批量删除 ({selectedCount})
              </Button>
            </PermissionGuard>

            <PermissionGuard permission="user:update">
              <Button onClick={onBatchActivate}>批量启用</Button>
              <Button onClick={onBatchBan}>批量封禁</Button>
            </PermissionGuard>
          </>
        )}
      </Space>
    );
  }
);

UserToolbar.displayName = 'UserToolbar';
