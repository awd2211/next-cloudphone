import React, { useMemo } from 'react';
import { Card, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getMethodConfig, type PaymentMethodStat } from './constants';

interface PaymentMethodTableProps {
  dataSource: PaymentMethodStat[];
}

export const PaymentMethodTable: React.FC<PaymentMethodTableProps> = React.memo(
  ({ dataSource }) => {
    const columns: ColumnsType<PaymentMethodStat> = useMemo(
      () => [
        {
          title: '支付方式',
          dataIndex: 'method',
          key: 'method',
          render: (method: string) => {
            const config = getMethodConfig(method);
            return <Tag color={config.color}>{config.text}</Tag>;
          },
        },
        {
          title: '交易笔数',
          dataIndex: 'count',
          key: 'count',
        },
        {
          title: '交易占比',
          dataIndex: 'percentage',
          key: 'percentage',
          render: (percentage: string) => `${percentage}%`,
        },
        {
          title: '总金额',
          dataIndex: 'totalAmount',
          key: 'totalAmount',
          render: (amount: string) => `¥${amount}`,
        },
        {
          title: '金额占比',
          dataIndex: 'amountPercentage',
          key: 'amountPercentage',
          render: (percentage: string) => `${percentage}%`,
        },
      ],
      []
    );

    return (
      <Card title="支付方式详情">
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="method"
          pagination={false}
        />
      </Card>
    );
  }
);

PaymentMethodTable.displayName = 'PaymentMethodTable';
