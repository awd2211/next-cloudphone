import React, { useMemo } from 'react';
import { Table, Space, Button, Popconfirm, Tag, Tooltip, Badge } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  LockOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TableRowSelection } from 'antd/es/table';
import type { Role, Permission } from '@/types';
import { createTimeColumn } from '@/utils/tableColumns';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';

interface RoleTableProps {
  roles: Role[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  selectedRowKeys: React.Key[];
  onEdit: (role: Role) => void;
  onDelete: (id: string) => void;
  onManagePermissions: (role: Role) => void;
  onPageChange: (page: number, pageSize: number) => void;
  onSelectionChange: (keys: React.Key[], rows: Role[]) => void;
}

export const RoleTable: React.FC<RoleTableProps> = React.memo(
  ({
    roles,
    loading,
    page,
    pageSize,
    total,
    selectedRowKeys,
    onEdit,
    onDelete,
    onManagePermissions,
    onPageChange,
    onSelectionChange,
  }) => {
    // 行选择配置
    const rowSelection: TableRowSelection<Role> = useMemo(
      () => ({
        selectedRowKeys,
        onChange: onSelectionChange,
        getCheckboxProps: (record: Role) => ({
          // 系统角色不可删除
          disabled: record.isSystem,
          name: record.name,
        }),
        selections: [
          Table.SELECTION_ALL,
          Table.SELECTION_INVERT,
          Table.SELECTION_NONE,
          {
            key: 'selectNonSystem',
            text: '选择非系统角色',
            onSelect: (changableRowKeys) => {
              const nonSystemKeys = roles
                .filter((role) => !role.isSystem)
                .map((role) => role.id);
              onSelectionChange(
                nonSystemKeys,
                roles.filter((role) => nonSystemKeys.includes(role.id))
              );
            },
          },
        ],
      }),
      [selectedRowKeys, onSelectionChange, roles]
    );

    const columns: ColumnsType<Role> = useMemo(
      () => [
        {
          title: '角色名称',
          dataIndex: 'name',
          key: 'name',
          width: 180,
          sorter: (a, b) => a.name.localeCompare(b.name),
          render: (name: string, record: Role) => (
            <Space>
              <span style={{ fontWeight: 500 }}>{name}</span>
              {record.isSystem && (
                <Tooltip title="系统内置角色，不可删除">
                  <LockOutlined style={{ color: SEMANTIC.warning.main }} />
                </Tooltip>
              )}
            </Space>
          ),
        },
        {
          title: '描述',
          dataIndex: 'description',
          key: 'description',
          width: 250,
          ellipsis: { showTitle: false },
          render: (description: string) => (
            <Tooltip placement="topLeft" title={description}>
              {description || '-'}
            </Tooltip>
          ),
        },
        {
          title: '权限数量',
          dataIndex: 'permissions',
          key: 'permissionCount',
          width: 120,
          align: 'center',
          render: (permissions: Permission[]) => {
            const count = permissions?.length || 0;
            let color = 'default';
            if (count > 100) color = 'green';
            else if (count > 50) color = 'blue';
            else if (count > 10) color = 'orange';
            return <Badge count={count} showZero color={color} overflowCount={999} />;
          },
          sorter: (a, b) => (a.permissions?.length || 0) - (b.permissions?.length || 0),
        },
        {
          title: '权限预览',
          dataIndex: 'permissions',
          key: 'permissionList',
          width: 350,
          render: (permissions: Permission[]) => {
            if (!permissions || permissions.length === 0) {
              return <span style={{ color: NEUTRAL_LIGHT.text.tertiary }}>暂无权限</span>;
            }
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {permissions.slice(0, 3).map((p) => (
                  <Tag key={p.id} color="processing" style={{ margin: 0 }}>
                    {p.resource}:{p.action}
                  </Tag>
                ))}
                {permissions.length > 3 && (
                  <Tooltip
                    title={permissions
                      .slice(3, 10)
                      .map((p) => `${p.resource}:${p.action}`)
                      .join(', ')}
                  >
                    <Tag color="default" style={{ margin: 0, cursor: 'pointer' }}>
                      +{permissions.length - 3} 更多
                    </Tag>
                  </Tooltip>
                )}
              </div>
            );
          },
        },
        createTimeColumn<Role>('创建时间', 'createdAt', { format: 'YYYY-MM-DD HH:mm', width: 160 }),
        {
          title: '操作',
          key: 'action',
          width: 220,
          fixed: 'right',
          render: (_, record) => (
            <Space size="small">
              <Tooltip title="配置权限">
                <Button
                  type="link"
                  size="small"
                  icon={<KeyOutlined />}
                  onClick={() => onManagePermissions(record)}
                >
                  权限
                </Button>
              </Tooltip>
              <Tooltip title="编辑角色">
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(record)}
                >
                  编辑
                </Button>
              </Tooltip>
              {record.isSystem ? (
                <Tooltip title="系统角色不可删除">
                  <Button type="link" size="small" icon={<LockOutlined />} disabled>
                    保护
                  </Button>
                </Tooltip>
              ) : (
                <Popconfirm
                  title="确定要删除这个角色吗?"
                  description="删除后将无法恢复"
                  onConfirm={() => onDelete(record.id)}
                  okText="确定"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="link" size="small" icon={<DeleteOutlined />} danger>
                    删除
                  </Button>
                </Popconfirm>
              )}
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
        rowSelection={rowSelection}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          onChange: onPageChange,
        }}
        scroll={{ x: 1300 }}
        size="middle"
        rowClassName={(record) => (record.isSystem ? 'system-role-row' : '')}
      />
    );
  }
);

RoleTable.displayName = 'RoleTable';
