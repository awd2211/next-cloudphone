import React, { memo, useMemo } from 'react';
import { Card, Table, Space, Button, Tag, Tooltip, Popconfirm, Typography } from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  CopyOutlined,
  LineChartOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { ApiKey } from '@/hooks/useApiKeys';
import { API_SCOPES } from '@/hooks/useApiKeys';

const { Text } = Typography;

interface ApiKeysTableProps {
  apiKeys: ApiKey[];
  loading: boolean;
  visibleKeys: Set<string>;
  maskKey: (key: string) => string;
  onToggleVisibility: (id: string) => void;
  onCopyKey: (key: string) => void;
  onViewStats: (apiKey: ApiKey) => void;
  onRevoke: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ApiKeysTable = memo<ApiKeysTableProps>(
  ({
    apiKeys,
    loading,
    visibleKeys,
    maskKey,
    onToggleVisibility,
    onCopyKey,
    onViewStats,
    onRevoke,
    onDelete,
  }) => {
    const columns: ColumnsType<ApiKey> = useMemo(
      () => [
        {
          title: '名称',
          dataIndex: 'name',
          key: 'name',
          width: 180,
          render: (text, record) => (
            <Space direction="vertical" size={0}>
              <Text strong>{text}</Text>
              {record.status === 'revoked' && <Tag color="red">已撤销</Tag>}
            </Space>
          ),
        },
        {
          title: 'API Key',
          dataIndex: 'key',
          key: 'key',
          width: 300,
          render: (text, record) => (
            <Space>
              <code
                style={{
                  background: '#f5f5f5',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                {visibleKeys.has(record.id) ? text : maskKey(text)}
              </code>
              <Button
                type="text"
                size="small"
                icon={
                  visibleKeys.has(record.id) ? <EyeInvisibleOutlined /> : <EyeOutlined />
                }
                onClick={() => onToggleVisibility(record.id)}
              />
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => onCopyKey(text)}
              />
            </Space>
          ),
        },
        {
          title: '权限范围',
          dataIndex: 'scope',
          key: 'scope',
          width: 200,
          render: (scopes: string[]) => (
            <Space wrap>
              {scopes.map((scope) => {
                const scopeInfo = API_SCOPES.find((s) => s.value === scope);
                return (
                  <Tooltip key={scope} title={scopeInfo?.description}>
                    <Tag color="blue">{scopeInfo?.label}</Tag>
                  </Tooltip>
                );
              })}
            </Space>
          ),
        },
        {
          title: '请求次数',
          dataIndex: 'requestCount',
          key: 'requestCount',
          width: 110,
          sorter: (a, b) => a.requestCount - b.requestCount,
          render: (count) => <Text>{count.toLocaleString()}</Text>,
        },
        {
          title: '最后使用',
          dataIndex: 'lastUsedAt',
          key: 'lastUsedAt',
          width: 120,
          render: (date) => (
            <Text type="secondary">
              {date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'}
            </Text>
          ),
        },
        {
          title: '过期时间',
          dataIndex: 'expiresAt',
          key: 'expiresAt',
          width: 120,
          render: (date) => {
            if (!date) return <Text type="secondary">永久</Text>;
            const isExpired = dayjs(date).isBefore(dayjs());
            const isExpiringSoon = dayjs(date).diff(dayjs(), 'day') <= 30;
            return (
              <Text
                type={isExpired ? 'danger' : isExpiringSoon ? 'warning' : 'secondary'}
              >
                {dayjs(date).format('YYYY-MM-DD')}
              </Text>
            );
          },
        },
        {
          title: '操作',
          key: 'actions',
          width: 150,
          fixed: 'right',
          render: (_, record) => (
            <Space size="small">
              {record.status === 'active' && (
                <>
                  <Button
                    type="link"
                    size="small"
                    icon={<LineChartOutlined />}
                    onClick={() => onViewStats(record)}
                  >
                    统计
                  </Button>
                  <Popconfirm
                    title="撤销 API Key"
                    description="撤销后该密钥将立即失效，无法恢复。确定要撤销吗？"
                    onConfirm={() => onRevoke(record.id)}
                    okText="确定撤销"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<CloseCircleOutlined />}
                    >
                      撤销
                    </Button>
                  </Popconfirm>
                </>
              )}
              {record.status === 'revoked' && (
                <Popconfirm
                  title="确认删除"
                  description="删除后无法恢复，确定要删除吗？"
                  onConfirm={() => onDelete(record.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              )}
            </Space>
          ),
        },
      ],
      [visibleKeys, maskKey, onToggleVisibility, onCopyKey, onViewStats, onRevoke, onDelete]
    );

    return (
      <Card>
        <Table
          columns={columns}
          dataSource={apiKeys}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个 API Key`,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>
    );
  }
);

ApiKeysTable.displayName = 'ApiKeysTable';
