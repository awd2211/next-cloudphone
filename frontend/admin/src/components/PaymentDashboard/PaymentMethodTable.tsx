import React, { useMemo } from 'react';
import { Card, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getMethodConfig, type PaymentMethodStat } from './constants';

interface PaymentMethodTableProps {
  dataSource: PaymentMethodStat[];
}

export const PaymentMethodTable: React.FC<PaymentMethodTableProps> = React.memo(
  ({ dataSource }) => {
    // 防御性检查：确保 dataSource 是数组
    const safeDataSource = Array.isArray(dataSource) ? dataSource : [];

    const columns: ColumnsType<PaymentMethodStat> = useMemo(
      () => [
        {
          title: '支付方式',
          dataIndex: 'method',
          key: 'method',
          sorter: (a, b) => a.method.localeCompare(b.method),
          render: (method: string) => {
            const config = getMethodConfig(method);
            return <Tag color={config.color}>{config.text}</Tag>;
          },
        },
        {
          title: '交易笔数',
          dataIndex: 'count',
          key: 'count',
          sorter: (a, b) => (Number(a.count) || 0) - (Number(b.count) || 0),
        },
        {
          title: '交易占比',
          dataIndex: 'percentage',
          key: 'percentage',
          sorter: (a, b) => (parseFloat(a.percentage) || 0) - (parseFloat(b.percentage) || 0),
          render: (percentage: string) => `${percentage}%`,
        },
        {
          title: '总金额',
          dataIndex: 'totalAmount',
          key: 'totalAmount',
          sorter: (a, b) => {
            const amountA = parseFloat(a.totalAmount.replace(/,/g, '')) || 0;
            const amountB = parseFloat(b.totalAmount.replace(/,/g, '')) || 0;
            return amountA - amountB;
          },
          render: (amount: string) => `¥${amount}`,
        },
        {
          title: '金额占比',
          dataIndex: 'amountPercentage',
          key: 'amountPercentage',
          sorter: (a, b) => (parseFloat(a.amountPercentage) || 0) - (parseFloat(b.amountPercentage) || 0),
          render: (percentage: string) => `${percentage}%`,
        },
      ],
      []
    );

    return (
      <Card title="支付方式详情">
        <Table
          columns={columns}
          dataSource={safeDataSource}
          rowKey="method"
          pagination={false}
        />
      </Card>
    );
  }
);

PaymentMethodTable.displayName = 'PaymentMethodTable';
