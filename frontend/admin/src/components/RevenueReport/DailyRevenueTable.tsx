import React, { useMemo } from 'react';
import { Card, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { DailyStats } from '@/types/revenue';

interface DailyRevenueTableProps {
  loading: boolean;
  data: DailyStats[];
}

export const DailyRevenueTable: React.FC<DailyRevenueTableProps> = ({ loading, data }) => {
  const columns: ColumnsType<DailyStats> = useMemo(
    () => [
      {
        title: '日期',
        dataIndex: 'date',
        key: 'date',
        render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      },
      {
        title: '收入',
        dataIndex: 'revenue',
        key: 'revenue',
        render: (revenue: number) => `¥${(revenue || 0).toFixed(2)}`,
        sorter: (a, b) => a.revenue - b.revenue,
      },
      {
        title: '订单数',
        dataIndex: 'orders',
        key: 'orders',
        sorter: (a, b) => a.orders - b.orders,
      },
    ],
    []
  );

  return (
    <Card title="每日收入统计">
      <Table
        columns={columns}
        dataSource={data}
        rowKey="date"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />
    </Card>
  );
};
