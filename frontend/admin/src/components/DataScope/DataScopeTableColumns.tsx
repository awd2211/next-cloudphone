import { useMemo } from 'react';
import { Button, Space, Tag, Popconfirm } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataScope, ScopeType } from '@/types';
import { getScopeTypeColor } from './dataScopeUtils';
import dayjs from 'dayjs';

interface DataScopeTableColumnsProps {
  scopeTypes: Array<{ value: ScopeType; label: string }>;
  onView: (record: DataScope) => void;
  onEdit: (record: DataScope) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const useDataScopeTableColumns = ({
  scopeTypes,
  onView,
  onEdit,
  onToggle,
  onDelete,
}: DataScopeTableColumnsProps): ColumnsType<DataScope> => {
  return useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 120,
        render: (id: string) => id.substring(0, 8),
      },
      {
        title: '角色ID',
        dataIndex: 'roleId',
        key: 'roleId',
        width: 120,
        render: (roleId: string) => roleId.substring(0, 8),
      },
      {
        title: '资源类型',
        dataIndex: 'resourceType',
        key: 'resourceType',
        width: 120,
      },
      {
        title: '范围类型',
        dataIndex: 'scopeType',
        key: 'scopeType',
        width: 150,
        render: (type: ScopeType) => {
          const typeObj = scopeTypes.find((t) => t.value === type);
          return <Tag color={getScopeTypeColor(type)}>{typeObj?.label || type}</Tag>;
        },
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        width: 200,
        ellipsis: true,
      },
      {
        title: '优先级',
        dataIndex: 'priority',
        key: 'priority',
        width: 80,
        align: 'center' as const,
      },
      {
        title: '状态',
        dataIndex: 'isActive',
        key: 'isActive',
        width: 100,
        render: (isActive: boolean) => (
          <Tag
            color={isActive ? 'success' : 'default'}
            icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          >
            {isActive ? '启用' : '禁用'}
          </Tag>
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        render: (time: string) => dayjs(time).format('MM-DD HH:mm'),
      },
      {
        title: '操作',
        key: 'actions',
        width: 200,
        fixed: 'right' as const,
        render: (_: any, record: DataScope) => (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onView(record)}
            >
              查看
            </Button>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            >
              编辑
            </Button>
            <Button type="link" size="small" onClick={() => onToggle(record.id)}>
              {record.isActive ? '禁用' : '启用'}
            </Button>
            <Popconfirm
              title="确定删除此数据范围配置？"
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
    [scopeTypes, onView, onEdit, onToggle, onDelete]
  );
};
