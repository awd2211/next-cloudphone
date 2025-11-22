import React, { useMemo } from 'react';
import { Card, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { PlanStats } from '@/types/revenue';

interface PlanRevenueTableProps {
  loading: boolean;
  data: PlanStats[];
  totalRevenue: number;
}

export const PlanRevenueTable: React.FC<PlanRevenueTableProps> = ({
  loading,
  data,
  totalRevenue,
}) => {
  // 防御性检查：确保 data 是数组
  const safeData = Array.isArray(data) ? data : [];

  const columns: ColumnsType<PlanStats> = useMemo(
    () => [
      {
        title: '套餐名称',
        dataIndex: 'planName',
        key: 'planName',
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
      {
        title: '占比',
        key: 'percentage',
        render: (_, record) => {
          const percentage =
            totalRevenue > 0 ? (((record.revenue || 0) / totalRevenue) * 100).toFixed(2) : 0;
          return `${percentage}%`;
        },
      },
    ],
    [totalRevenue]
  );

  return (
    <Card title="套餐收入统计">
      <Table columns={columns} dataSource={safeData} rowKey="planId" loading={loading} pagination={false} />
    </Card>
  );
};
