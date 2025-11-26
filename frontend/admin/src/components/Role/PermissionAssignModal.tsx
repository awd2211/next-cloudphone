import React, { useMemo } from 'react';
import { Modal, Transfer, Tree, Tabs } from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { Role, Permission } from '@/types';
import { NEUTRAL_LIGHT } from '@/theme';

interface TransferItem {
  key: string;
  title: string;
  description?: string;
}

interface PermissionAssignModalProps {
  visible: boolean;
  role: Role | null;
  permissions: Permission[];
  selectedPermissions: string[];
  loading: boolean;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
  onPermissionChange: (keys: string[]) => void;
}

export const PermissionAssignModal: React.FC<PermissionAssignModalProps> = React.memo(
  ({
    visible,
    role,
    permissions,
    selectedPermissions,
    loading,
    onCancel,
    onSubmit,
    onPermissionChange,
  }) => {
    // Transfer 数据源
    const transferDataSource: TransferItem[] = useMemo(
      () =>
        (Array.isArray(permissions) ? permissions : []).map((p) => ({
          key: p.id,
          title: `${p.resource}:${p.action}`,
          description: p.description,
        })),
      [permissions]
    );

    // 树形数据结构
    const treeData = useMemo((): DataNode[] => {
      if (!Array.isArray(permissions)) {
        return [];
      }

      const grouped = permissions.reduce(
        (acc, permission) => {
          if (!acc[permission.resource]) {
            acc[permission.resource] = [];
          }
          acc[permission.resource]?.push(permission);
          return acc;
        },
        {} as Record<string, Permission[]>
      );

      return Object.entries(grouped).map(([resource, perms]) => ({
        title: resource,
        key: resource,
        children: perms.map((p) => ({
          title: `${p.action} (${p.description || '无描述'})`,
          key: p.id,
        })),
      }));
    }, [permissions]);

    const handleTreeCheck = (checkedKeys: any) => {
      // 只保留叶子节点（实际权限ID）
      const keys = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked;
      const leafKeys = keys.filter((key: any) => permissions.some((p) => p.id === key));
      onPermissionChange(leafKeys as string[]);
    };

    return (
      <Modal
        title={`配置权限 - ${role?.name}`}
        open={visible}
        onCancel={onCancel}
        onOk={onSubmit}
        confirmLoading={loading}
        width={800}
      >
        <Tabs
          items={[
            {
              key: 'tree',
              label: '树形视图',
              children: (
                <div>
                  <p style={{ marginBottom: 16, color: NEUTRAL_LIGHT.text.secondary }}>
                    已选择 <strong>{selectedPermissions.length}</strong> 个权限
                  </p>
                  <Tree
                    checkable
                    defaultExpandAll
                    treeData={treeData}
                    checkedKeys={selectedPermissions}
                    onCheck={handleTreeCheck}
                    style={{
                      maxHeight: 400,
                      overflow: 'auto',
                      border: `1px solid ${NEUTRAL_LIGHT.border.primary}`,
                      padding: 16,
                      borderRadius: 4,
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'transfer',
              label: '列表视图',
              children: (
                <Transfer
                  dataSource={transferDataSource}
                  titles={['可用权限', '已分配权限']}
                  targetKeys={selectedPermissions}
                  onChange={(targetKeys) => onPermissionChange(targetKeys as string[])}
                  render={(item) => item.title}
                  listStyle={{
                    width: 350,
                    height: 400,
                  }}
                  showSearch
                  filterOption={(inputValue, option) =>
                    option.title.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
                  }
                />
              ),
            },
          ]}
        />
      </Modal>
    );
  }
);

PermissionAssignModal.displayName = 'PermissionAssignModal';
