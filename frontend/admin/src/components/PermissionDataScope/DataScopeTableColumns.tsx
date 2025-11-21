import { useMemo } from 'react';
import { Space, Button, Popconfirm, Tag, Switch } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataScope, ScopeType } from '@/hooks/useDataScope';
import type { Role } from '@/types';
import { resourceTypes } from './constants';
import dayjs from 'dayjs';

interface ScopeTypeOption {
  value: string;
  label: string;
}

interface DataScopeTableColumnsProps {
  roles: Role[];
  scopeTypes: ScopeTypeOption[];
  getScopeDescription: (scope: DataScope) => string;
  onView: (scope: DataScope) => void;
  onEdit: (scope: DataScope) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export const useDataScopeTableColumns = ({
  roles,
  scopeTypes,
  getScopeDescription,
  onView,
  onEdit,
  onDelete,
  onToggle,
}: DataScopeTableColumnsProps): ColumnsType<DataScope> => {
  return useMemo(
    () => [
      {
        title: '角色',
        dataIndex: 'roleId',
        key: 'roleId',
        width: 150,
        sorter: (a, b) => a.roleId.localeCompare(b.roleId),
        render: (roleId: string) => {
          const role = roles.find((r) => r.id === roleId);
          return role?.name || roleId;
        },
      },
      {
        title: '资源类型',
        dataIndex: 'resourceType',
        key: 'resourceType',
        width: 150,
        sorter: (a, b) => a.resourceType.localeCompare(b.resourceType),
        render: (resourceType: string) => {
          const resource = resourceTypes.find((r) => r.value === resourceType);
          return <Tag color="blue">{resource?.label || resourceType}</Tag>;
        },
      },
      {
        title: '范围类型',
        dataIndex: 'scopeType',
        key: 'scopeType',
        width: 200,
        sorter: (a, b) => a.scopeType.localeCompare(b.scopeType),
        render: (scopeType: ScopeType, record: DataScope) => {
          const scopeType_ = scopeTypes.find((s) => s.value === scopeType);
          return (
            <div>
              <Tag color="green">{scopeType_?.label || scopeType}</Tag>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {getScopeDescription(record)}
              </div>
            </div>
          );
        },
      },
      {
        title: '优先级',
        dataIndex: 'priority',
        key: 'priority',
        width: 80,
        sorter: (a, b) => (a.priority || 100) - (b.priority || 100),
      },
      {
        title: '状态',
        dataIndex: 'isActive',
        key: 'isActive',
        width: 100,
        render: (isActive: boolean, record: DataScope) => (
          <Switch
            checked={isActive}
            onChange={() => onToggle(record.id)}
            checkedChildren="启用"
            unCheckedChildren="禁用"
          />
        ),
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        sorter: (a, b) => (a.description || '').localeCompare(b.description || ''),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        sorter: (a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeA - timeB;
        },
        render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
      },
      {
        title: '操作',
        key: 'actions',
        width: 200,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => onView(record)}>
              详情
            </Button>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
              编辑
            </Button>
            <Popconfirm
              title="确定要删除这个配置吗?"
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
    [roles, scopeTypes, getScopeDescription, onView, onEdit, onDelete, onToggle]
  );
};
