import { useMemo } from 'react';
import { Space, Button, Popconfirm, Badge, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

export interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  deviceCount: number;
  tags?: string[];
  createdAt: string;
}

interface DeviceGroupTableColumnsProps {
  onBatchOperation: (group: DeviceGroup) => void;
  onEdit: (group: DeviceGroup) => void;
  onDelete: (id: string) => void;
}

/**
 * 设备分组表格列配置
 */
export const useDeviceGroupTableColumns = ({
  onBatchOperation,
  onEdit,
  onDelete,
}: DeviceGroupTableColumnsProps): ColumnsType<DeviceGroup> => {
  return useMemo(
    () => [
      {
        title: '分组名称',
        dataIndex: 'name',
        key: 'name',
        width: 200,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (name: string, record: DeviceGroup) => (
          <Space direction="vertical" size={0}>
            <strong>{name}</strong>
            {record.description && (
              <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.description}</span>
            )}
          </Space>
        ),
      },
      {
        title: '设备数量',
        dataIndex: 'deviceCount',
        key: 'deviceCount',
        width: 120,
        align: 'center',
        sorter: (a, b) => a.deviceCount - b.deviceCount,
        render: (count: number) => (
          <Badge count={count} showZero style={{ backgroundColor: '#52c41a' }} />
        ),
      },
      {
        title: '标签',
        dataIndex: 'tags',
        key: 'tags',
        width: 250,
        render: (tags: string[]) =>
          tags?.length ? (
            <Space wrap size="small">
              {tags.map((tag) => (
                <Tag key={tag} color="blue">
                  {tag}
                </Tag>
              ))}
            </Space>
          ) : (
            '-'
          ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        render: (time: string) => dayjs(time).format('MM-DD HH:mm'),
      },
      {
        title: '操作',
        key: 'actions',
        width: 300,
        fixed: 'right',
        render: (_, record: DeviceGroup) => (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => onBatchOperation(record)}
            >
              批量操作
            </Button>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm title="确定删除此分组？" onConfirm={() => onDelete(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [onBatchOperation, onEdit, onDelete]
  );
};
