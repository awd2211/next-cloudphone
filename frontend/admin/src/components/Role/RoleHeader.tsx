import React from 'react';
import { Button, Space, Popconfirm, Badge } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';

interface RoleHeaderProps {
  onCreate: () => void;
  selectedCount?: number;
  onBatchDelete?: () => void;
  onRefresh?: () => void;
  batchDeleteLoading?: boolean;
}

export const RoleHeader: React.FC<RoleHeaderProps> = React.memo(
  ({ onCreate, selectedCount = 0, onBatchDelete, onRefresh, batchDeleteLoading }) => {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>角色管理</h2>
          <Space>
            {selectedCount > 0 && (
              <Badge count={selectedCount} offset={[10, 0]}>
                <Popconfirm
                  title={`确定要删除选中的 ${selectedCount} 个角色吗？`}
                  description="此操作不可恢复，请谨慎操作"
                  onConfirm={onBatchDelete}
                  okText="确定删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />} loading={batchDeleteLoading}>
                    批量删除
                  </Button>
                </Popconfirm>
              </Badge>
            )}
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
              创建角色
            </Button>
          </Space>
        </div>
      </div>
    );
  }
);

RoleHeader.displayName = 'RoleHeader';
