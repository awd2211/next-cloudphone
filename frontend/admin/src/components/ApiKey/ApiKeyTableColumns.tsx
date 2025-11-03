import { useMemo } from 'react';
import { Space, Button, Tooltip, Tag, Badge, Typography, Popconfirm } from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ApiKey, ApiKeyStatus } from '@/types';
import {
  getMaskedKey,
  getStatusIcon,
  getStatusColor,
  getStatusLabel,
  isKeyExpired,
} from './apiKeyUtils';

const { Text } = Typography;

interface UseApiKeyColumnsProps {
  onViewDetail: (record: ApiKey) => void;
  onEdit: (record: ApiKey) => void;
  onRevoke: (record: ApiKey) => void;
  onDelete: (id: string) => void;
}

export const useApiKeyColumns = ({
  onViewDetail,
  onEdit,
  onRevoke,
  onDelete,
}: UseApiKeyColumnsProps): ColumnsType<ApiKey> => {
  return useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 100,
        ellipsis: true,
      },
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        width: 150,
      },
      {
        title: '密钥',
        dataIndex: 'key',
        key: 'key',
        width: 200,
        render: (_: any, record: ApiKey) => (
          <Space>
            <Text code>{getMaskedKey(record)}</Text>
            <Tooltip title="复制完整密钥">
              <Button
                type="link"
                size="small"
                icon={<CopyOutlined />}
                disabled={record.status !== 'active'}
              />
            </Tooltip>
          </Space>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: ApiKeyStatus, record: ApiKey) => {
          const expired = isKeyExpired(record.expiresAt);
          const displayStatus = expired ? 'expired' : status;
          return (
            <Tag icon={getStatusIcon(displayStatus)} color={getStatusColor(displayStatus)}>
              {getStatusLabel(displayStatus)}
            </Tag>
          );
        },
      },
      {
        title: '权限范围',
        dataIndex: 'scopes',
        key: 'scopes',
        width: 200,
        render: (scopes: string[]) => (
          <Space wrap>
            {scopes.slice(0, 3).map((scope) => (
              <Tag key={scope} color="blue">
                {scope}
              </Tag>
            ))}
            {scopes.length > 3 && <Tag>+{scopes.length - 3}</Tag>}
          </Space>
        ),
      },
      {
        title: '使用次数',
        dataIndex: 'usageCount',
        key: 'usageCount',
        width: 100,
        render: (count: number) => <Badge count={count} showZero />,
        sorter: (a: ApiKey, b: ApiKey) => a.usageCount - b.usageCount,
      },
      {
        title: '最后使用',
        dataIndex: 'lastUsedAt',
        key: 'lastUsedAt',
        width: 170,
        render: (date?: string) =>
          date ? (
            new Date(date).toLocaleString('zh-CN')
          ) : (
            <span style={{ color: '#999' }}>从未使用</span>
          ),
      },
      {
        title: '过期时间',
        dataIndex: 'expiresAt',
        key: 'expiresAt',
        width: 170,
        render: (date?: string) => {
          if (!date) return <span style={{ color: '#999' }}>永不过期</span>;
          const expired = new Date(date) < new Date();
          return (
            <Text type={expired ? 'danger' : undefined}>
              {new Date(date).toLocaleString('zh-CN')}
            </Text>
          );
        },
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 170,
        render: (date: string) => new Date(date).toLocaleString('zh-CN'),
      },
      {
        title: '操作',
        key: 'action',
        width: 250,
        fixed: 'right' as const,
        render: (_: any, record: ApiKey) => (
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
              disabled={record.status === 'revoked'}
            >
              编辑
            </Button>
            {record.status === 'active' && (
              <Popconfirm
                title="确定撤销此密钥吗?"
                onConfirm={() => onRevoke(record)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" size="small" danger icon={<StopOutlined />}>
                  撤销
                </Button>
              </Popconfirm>
            )}
            <Popconfirm
              title="确定删除此密钥吗?"
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
    [onViewDetail, onEdit, onRevoke, onDelete]
  );
};
