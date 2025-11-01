import { memo, useMemo } from 'react';
import { Table, Tag, Button, Space, Tooltip, Switch } from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getStatusTag, maskSecret } from './utils';
import { TABLE_SCROLL_X, DEFAULT_PAGE_SIZE, STATUS_FILTERS } from './constants';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  secret: string;
  scopes: string[];
  status: 'active' | 'inactive' | 'expired';
  usageCount: number;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
  description?: string;
}

export interface ApiKeyTableProps {
  apiKeys: ApiKey[];
  loading: boolean;
  visibleSecrets: Set<string>;
  onCopyKey: (key: string) => void;
  onToggleSecretVisibility: (id: string) => void;
  onToggleStatus: (record: ApiKey) => void;
  onDelete: (record: ApiKey) => void;
}

/**
 * API 密钥表格组件
 */
export const ApiKeyTable = memo<ApiKeyTableProps>(
  ({
    apiKeys,
    loading,
    visibleSecrets,
    onCopyKey,
    onToggleSecretVisibility,
    onToggleStatus,
    onDelete,
  }) => {
    const columns: ColumnsType<ApiKey> = useMemo(
      () => [
        {
          title: '名称',
          dataIndex: 'name',
          key: 'name',
          width: 150,
        },
        {
          title: 'Access Key',
          dataIndex: 'key',
          key: 'key',
          width: 220,
          render: (key: string) => (
            <Space>
              <code style={{ fontSize: 12 }}>{key}</code>
              <Tooltip title="复制">
                <Button
                  type="link"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => onCopyKey(key)}
                />
              </Tooltip>
            </Space>
          ),
        },
        {
          title: 'Secret Key',
          dataIndex: 'secret',
          key: 'secret',
          width: 180,
          render: (secret: string, record: ApiKey) => {
            const isVisible = visibleSecrets.has(record.id);
            return (
              <Space>
                <code style={{ fontSize: 12 }}>{maskSecret(secret, isVisible)}</code>
                <Tooltip title={isVisible ? '隐藏' : '显示'}>
                  <Button
                    type="link"
                    size="small"
                    icon={isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={() => onToggleSecretVisibility(record.id)}
                  />
                </Tooltip>
              </Space>
            );
          },
        },
        {
          title: '权限范围',
          dataIndex: 'scopes',
          key: 'scopes',
          width: 250,
          render: (scopes: string[]) => (
            <>
              {scopes.slice(0, 2).map((scope) => (
                <Tag key={scope} style={{ marginBottom: 4 }}>
                  {scope}
                </Tag>
              ))}
              {scopes.length > 2 && (
                <Tooltip title={scopes.slice(2).join(', ')}>
                  <Tag>+{scopes.length - 2}</Tag>
                </Tooltip>
              )}
            </>
          ),
        },
        {
          title: '状态',
          dataIndex: 'status',
          key: 'status',
          width: 100,
          render: (status: ApiKey['status']) => getStatusTag(status),
          filters: STATUS_FILTERS,
          onFilter: (value, record) => record.status === value,
        },
        {
          title: '使用次数',
          dataIndex: 'usageCount',
          key: 'usageCount',
          width: 100,
          align: 'right',
          sorter: (a, b) => a.usageCount - b.usageCount,
        },
        {
          title: '最后使用',
          dataIndex: 'lastUsedAt',
          key: 'lastUsedAt',
          width: 160,
          render: (time?: string) => time || '-',
        },
        {
          title: '过期时间',
          dataIndex: 'expiresAt',
          key: 'expiresAt',
          width: 120,
          render: (time?: string) => time || '永不过期',
        },
        {
          title: '操作',
          key: 'actions',
          width: 180,
          fixed: 'right',
          render: (_, record) => (
            <Space>
              <Switch
                size="small"
                checked={record.status === 'active'}
                disabled={record.status === 'expired'}
                onChange={() => onToggleStatus(record)}
              />
              <Tooltip title="查看详情">
                <Button type="link" size="small" icon={<EyeOutlined />} />
              </Tooltip>
              <Tooltip title="删除">
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onDelete(record)}
                />
              </Tooltip>
            </Space>
          ),
        },
      ],
      [visibleSecrets, onCopyKey, onToggleSecretVisibility, onToggleStatus, onDelete],
    );

    return (
      <Table
        columns={columns}
        dataSource={apiKeys}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: DEFAULT_PAGE_SIZE,
          showTotal: (total) => `共 ${total} 个密钥`,
        }}
        scroll={{ x: TABLE_SCROLL_X }}
      />
    );
  },
);

ApiKeyTable.displayName = 'ApiKeyTable';
