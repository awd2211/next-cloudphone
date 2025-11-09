import React, { useMemo } from 'react';
import { Table, Space, Button, Popconfirm, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Role, Permission } from '@/types';
import { createTimeColumn } from '@/utils/tableColumns';

interface RoleTableProps {
  roles: Role[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onEdit: (role: Role) => void;
  onDelete: (id: string) => void;
  onManagePermissions: (role: Role) => void;
  onPageChange: (page: number, pageSize: number) => void;
}

export const RoleTable: React.FC<RoleTableProps> = React.memo(
  ({
    roles,
    loading,
    page,
    pageSize,
    total,
    onEdit,
    onDelete,
    onManagePermissions,
    onPageChange,
  }) => {
    const columns: ColumnsType<Role> = useMemo(
      () => [
        {
          title: '角色名称',
          dataIndex: 'name',
          key: 'name',
          sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
          title: '描述',
          dataIndex: 'description',
          key: 'description',
          ellipsis: true,
        },
        {
          title: '权限数量',
          dataIndex: 'permissions',
          key: 'permissions',
          render: (permissions: Permission[]) => permissions?.length || 0,
          sorter: (a, b) => (a.permissions?.length || 0) - (b.permissions?.length || 0),
        },
        {
          title: '权限',
          dataIndex: 'permissions',
          key: 'permissionList',
          width: 400,
          render: (permissions: Permission[]) => (
            <div>
              {permissions?.slice(0, 3).map((p) => (
                <Tag key={p.id} style={{ marginBottom: 4 }}>
                  {p.resource}:{p.action}
                </Tag>
              ))}
              {permissions && permissions.length > 3 && <Tag>+{permissions.length - 3} 更多</Tag>}
            </div>
          ),
        },
        createTimeColumn<Role>('创建时间', 'createdAt', { format: 'YYYY-MM-DD HH:mm', width: 180 }),
        {
          title: '操作',
          key: 'action',
          width: 250,
          fixed: 'right',
          render: (_, record) => (
            <Space size="small">
              <Button
                type="link"
                size="small"
                icon={<KeyOutlined />}
                onClick={() => onManagePermissions(record)}
              >
                配置权限
              </Button>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
                编辑
              </Button>
              <Popconfirm
                title="确定要删除这个角色吗?"
                onConfirm={() => onDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" size="small" icon={<DeleteOutlined />} danger>
                  删除
                </Button>
              </Popconfirm>
            </Space>
          ),
        },
      ],
      [onManagePermissions, onEdit, onDelete]
    );

    return (
      <Table
        columns={columns}
        dataSource={roles}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: onPageChange,
        }}
        scroll={{ x: 1200 }}
      />
    );
  }
);

RoleTable.displayName = 'RoleTable';
