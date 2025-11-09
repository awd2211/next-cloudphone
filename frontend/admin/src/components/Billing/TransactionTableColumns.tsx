import { useMemo } from 'react';
import { Tag, Badge } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

export interface Transaction {
  id: string;
  type: 'recharge' | 'consumption' | 'refund' | 'freeze' | 'unfreeze';
  amount: number;
  balance: number;
  description: string;
  status: 'success' | 'pending' | 'failed';
  createdAt: string;
  orderId?: string;
  paymentMethod?: string;
}

export const getTypeTag = (type: Transaction['type']) => {
  const typeConfig = {
    recharge: { color: 'green', text: '充值' },
    consumption: { color: 'red', text: '消费' },
    refund: { color: 'blue', text: '退款' },
    freeze: { color: 'orange', text: '冻结' },
    unfreeze: { color: 'cyan', text: '解冻' },
  };
  const config = typeConfig[type];
  return <Tag color={config.color}>{config.text}</Tag>;
};

export const getStatusBadge = (status: Transaction['status']) => {
  const statusConfig = {
    success: { status: 'success', text: '成功' },
    pending: { status: 'processing', text: '处理中' },
    failed: { status: 'error', text: '失败' },
  };
  const config = statusConfig[status] as any;
  return <Badge status={config.status} text={config.text} />;
};

export const useTransactionTableColumns = (): ColumnsType<Transaction> => {
  return useMemo(
    () => [
      {
        title: '交易时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      },
      {
        title: '交易类型',
        dataIndex: 'type',
        key: 'type',
        width: 100,
        sorter: (a, b) => a.type.localeCompare(b.type),
        render: (type: Transaction['type']) => getTypeTag(type),
      },
      {
        title: '交易金额',
        dataIndex: 'amount',
        key: 'amount',
        width: 130,
        render: (amount: number) => (
          <span style={{ color: amount > 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>
            {amount > 0 ? '+' : ''}¥{Math.abs(amount || 0).toFixed(2)}
          </span>
        ),
        sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
      },
      {
        title: '账户余额',
        dataIndex: 'balance',
        key: 'balance',
        width: 120,
        sorter: (a, b) => (a.balance || 0) - (b.balance || 0),
        render: (balance: number) => `¥${(balance || 0).toFixed(2)}`,
      },
      {
        title: '交易描述',
        dataIndex: 'description',
        key: 'description',
        sorter: (a, b) => a.description.localeCompare(b.description),
      },
      {
        title: '订单号',
        dataIndex: 'orderId',
        key: 'orderId',
        width: 180,
        sorter: (a, b) => (a.orderId || '').localeCompare(b.orderId || ''),
        render: (orderId?: string) => orderId || '-',
      },
      {
        title: '支付方式',
        dataIndex: 'paymentMethod',
        key: 'paymentMethod',
        width: 100,
        sorter: (a, b) => (a.paymentMethod || '').localeCompare(b.paymentMethod || ''),
        render: (method?: string) => method || '-',
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        sorter: (a, b) => a.status.localeCompare(b.status),
        render: (status: Transaction['status']) => getStatusBadge(status),
      },
    ],
    []
  );
};
