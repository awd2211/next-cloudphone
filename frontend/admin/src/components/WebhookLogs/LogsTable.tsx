import React, { useMemo, memo } from 'react';
import { Card, Table, Tag, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { WebhookLog } from '@/types/webhook';
import { getProviderTag, getStatusTag } from '@/utils/webhook';

interface LogsTableProps {
  loading: boolean;
  logs: WebhookLog[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onViewDetail: (log: WebhookLog) => void;
}

// ✅ 使用 memo 包装组件，避免不必要的重渲染
export const LogsTable: React.FC<LogsTableProps> = memo(({
  loading,
  logs,
  total,
  page,
  pageSize,
  onPageChange,
  onViewDetail,
}) => {
  const columns: ColumnsType<WebhookLog> = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 80,
        ellipsis: true,
      },
      {
        title: '提供商',
        dataIndex: 'provider',
        key: 'provider',
        width: 120,
        sorter: (a, b) => a.provider.localeCompare(b.provider),
        render: (provider: string) => getProviderTag(provider),
      },
      {
        title: '事件类型',
        dataIndex: 'event',
        key: 'event',
        width: 200,
        ellipsis: true,
        sorter: (a, b) => a.event.localeCompare(b.event),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        sorter: (a, b) => a.status.localeCompare(b.status),
        render: (status: string) => getStatusTag(status),
      },
      {
        title: '重试次数',
        dataIndex: 'retryCount',
        key: 'retryCount',
        width: 100,
        sorter: (a, b) => a.retryCount - b.retryCount,
        render: (count: number) => <Tag color={count > 0 ? 'orange' : 'default'}>{count}</Tag>,
      },
      {
        title: '接收时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: '处理时间',
        dataIndex: 'processedAt',
        key: 'processedAt',
        width: 180,
        sorter: (a, b) => {
          const timeA = a.processedAt ? new Date(a.processedAt).getTime() : 0;
          const timeB = b.processedAt ? new Date(b.processedAt).getTime() : 0;
          return timeA - timeB;
        },
        render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'),
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        fixed: 'right',
        render: (_, record) => (
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => onViewDetail(record)}>
            详情
          </Button>
        ),
      },
    ],
    [onViewDetail]
  );

  return (
    <Card>
      <Table
        columns={columns}
        dataSource={logs}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100', '200'],
          showTotal: (total) => `共 ${total} 条`,
          onChange: onPageChange,
        }}
        scroll={{ x: 1200, y: 600 }}
        virtual
      />
    </Card>
  );
});

LogsTable.displayName = 'WebhookLogs.LogsTable';
