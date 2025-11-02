import { useMemo } from 'react';
import { Space, Button, Popconfirm, Switch } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Plan } from '@/types';
import dayjs from 'dayjs';

interface PlanTableColumnsProps {
  onEdit: (plan: Plan) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  toggleStatusLoading: boolean;
}

/**
 * 套餐列表表格列配置
 */
export const usePlanTableColumns = ({
  onEdit,
  onDelete,
  onToggleStatus,
  toggleStatusLoading,
}: PlanTableColumnsProps): ColumnsType<Plan> => {
  // 套餐类型映射
  const typeMap = useMemo(
    () => ({
      monthly: '月付',
      yearly: '年付',
      'one-time': '一次性',
    }),
    []
  );

  return useMemo(
    () => [
      {
        title: '套餐名称',
        dataIndex: 'name',
        key: 'name',
        fixed: 'left',
        sorter: (a, b) => a.name.localeCompare(b.name),
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => typeMap[type as keyof typeof typeMap] || type,
        sorter: (a, b) => a.type.localeCompare(b.type),
      },
      {
        title: '价格',
        dataIndex: 'price',
        key: 'price',
        render: (price: string | number) => `¥${(Number(price) || 0).toFixed(2)}`,
        sorter: (a, b) => Number(a.price) - Number(b.price),
      },
      {
        title: '时长(天)',
        dataIndex: 'duration',
        key: 'duration',
        sorter: (a, b) => a.duration - b.duration,
      },
      {
        title: '设备数量',
        dataIndex: 'deviceLimit',
        key: 'deviceLimit',
        sorter: (a, b) => a.deviceLimit - b.deviceLimit,
      },
      {
        title: '状态',
        dataIndex: 'isActive',
        key: 'isActive',
        render: (isActive: boolean, record) => (
          <Switch
            checked={isActive}
            onChange={(checked) => onToggleStatus(record.id, checked)}
            checkedChildren="启用"
            unCheckedChildren="禁用"
            loading={toggleStatusLoading}
          />
        ),
        sorter: (a, b) => Number(a.isActive) - Number(b.isActive),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
        sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定要删除这个套餐吗?"
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
    [typeMap, onEdit, onDelete, onToggleStatus, toggleStatusLoading]
  );
};
