import React, { useMemo } from 'react';
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

export const LogsTable: React.FC<LogsTableProps> = ({
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
        render: (provider: string) => getProviderTag(provider),
      },
      {
        title: '事件类型',
        dataIndex: 'event',
        key: 'event',
        width: 200,
        ellipsis: true,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => getStatusTag(status),
      },
      {
        title: '重试次数',
        dataIndex: 'retryCount',
        key: 'retryCount',
        width: 100,
        render: (count: number) => <Tag color={count > 0 ? 'orange' : 'default'}>{count}</Tag>,
      },
      {
        title: '接收时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: '处理时间',
        dataIndex: 'processedAt',
        key: 'processedAt',
        width: 180,
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
          showTotal: (total) => `共 ${total} 条`,
          onChange: onPageChange,
        }}
        scroll={{ x: 1200 }}
      />
    </Card>
  );
};
