import React, { useMemo } from 'react';
import { Table, Space, Button, Popconfirm, Tag, Switch } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { FieldPermission, OperationType } from '@/types';
import { getOperationColor, getOperationLabel } from './fieldPermissionUtils';

interface FieldPermissionTableProps {
  permissions: FieldPermission[];
  loading: boolean;
  onEdit: (record: FieldPermission) => void;
  onDelete: (id: string) => void;
  onToggle: (record: FieldPermission) => void;
  onViewDetail: (record: FieldPermission) => void;
}

export const FieldPermissionTable: React.FC<FieldPermissionTableProps> = React.memo(
  ({ permissions, loading, onEdit, onDelete, onToggle, onViewDetail }) => {
    const columns: ColumnsType<FieldPermission> = useMemo(
      () => [
        {
          title: 'ID',
          dataIndex: 'id',
          key: 'id',
          width: 100,
          ellipsis: true,
        },
        {
          title: '角色ID',
          dataIndex: 'roleId',
          key: 'roleId',
          width: 120,
          ellipsis: true,
        },
        {
          title: '资源类型',
          dataIndex: 'resourceType',
          key: 'resourceType',
          width: 120,
        },
        {
          title: '操作类型',
          dataIndex: 'operation',
          key: 'operation',
          width: 100,
          render: (operation: OperationType) => (
            <Tag color={getOperationColor(operation)}>{getOperationLabel(operation)}</Tag>
          ),
        },
        {
          title: '隐藏字段',
          dataIndex: 'hiddenFields',
          key: 'hiddenFields',
          width: 150,
          render: (fields?: string[]) => <span>{fields?.length || 0} 个</span>,
        },
        {
          title: '只读字段',
          dataIndex: 'readOnlyFields',
          key: 'readOnlyFields',
          width: 150,
          render: (fields?: string[]) => <span>{fields?.length || 0} 个</span>,
        },
        {
          title: '可写字段',
          dataIndex: 'writableFields',
          key: 'writableFields',
          width: 150,
          render: (fields?: string[]) => <span>{fields?.length || 0} 个</span>,
        },
        {
          title: '必填字段',
          dataIndex: 'requiredFields',
          key: 'requiredFields',
          width: 150,
          render: (fields?: string[]) => <span>{fields?.length || 0} 个</span>,
        },
        {
          title: '优先级',
          dataIndex: 'priority',
          key: 'priority',
          width: 80,
          sorter: (a: FieldPermission, b: FieldPermission) => a.priority - b.priority,
        },
        {
          title: '状态',
          dataIndex: 'isActive',
          key: 'isActive',
          width: 80,
          render: (isActive: boolean, record: FieldPermission) => (
            <Switch
              checked={isActive}
              onChange={() => onToggle(record)}
              checkedChildren="启用"
              unCheckedChildren="禁用"
            />
          ),
        },
        {
          title: '操作',
          key: 'action',
          width: 200,
          fixed: 'right' as const,
          render: (_: any, record: FieldPermission) => (
            <Space size="small">
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onViewDetail(record)}
              >
                详情
              </Button>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定删除此配置吗?"
                onConfirm={() => onDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </Space>
          ),
        },
      ],
      [onEdit, onDelete, onToggle, onViewDetail]
    );

    return (
      <Table
        columns={columns}
        dataSource={permissions}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1500 }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
    );
  }
);

FieldPermissionTable.displayName = 'FieldPermissionTable';
