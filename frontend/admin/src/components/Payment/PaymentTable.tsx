import { memo, useMemo, useCallback } from 'react';
import { Table, Tag, Space, Button, Tooltip, Card } from 'antd';
import { ReloadOutlined, DollarOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { PaymentDetail } from '@/services/payment-admin';
import { PAYMENT_METHOD_MAP, PAYMENT_STATUS_MAP, TABLE_SCROLL_X } from './constants';
import dayjs from 'dayjs';

export interface PaymentTableProps {
  payments: PaymentDetail[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  hasRefundPermission: boolean;
  onPageChange: (page: number, pageSize: number) => void;
  onSyncStatus: (paymentId: string) => void;
  onShowQRCode: (payment: PaymentDetail) => void;
  onRefund: (payment: PaymentDetail) => void;
}

/**
 * 支付表格组件
 */
export const PaymentTable = memo<PaymentTableProps>(
  ({
    payments,
    loading,
    page,
    pageSize,
    total,
    hasRefundPermission,
    onPageChange,
    onSyncStatus,
    onShowQRCode,
    onRefund,
  }) => {
    // 渲染金额
    const renderAmount = useCallback((amount: number, record: PaymentDetail) => {
      const currencySymbol =
        record.currency === 'CNY' ? '¥' : record.currency === 'USD' ? '$' : record.currency;
      return `${currencySymbol}${(amount || 0).toFixed(2)}`;
    }, []);

    // 表格列配置
    const columns: ColumnsType<PaymentDetail> = useMemo(
      () => [
        {
          title: '支付单号',
          dataIndex: 'paymentNo',
          key: 'paymentNo',
          width: 180,
          fixed: 'left',
        },
        {
          title: '订单号',
          dataIndex: 'order',
          key: 'order',
          width: 180,
          render: (order: any) => order?.orderNo || '-',
        },
        {
          title: '用户ID',
          dataIndex: 'userId',
          key: 'userId',
          width: 100,
          ellipsis: true,
        },
        {
          title: '金额',
          dataIndex: 'amount',
          key: 'amount',
          render: renderAmount,
          sorter: (a, b) => a.amount - b.amount,
        },
        {
          title: '支付方式',
          dataIndex: 'method',
          key: 'method',
          render: (method: string) => {
            const config = PAYMENT_METHOD_MAP[method as keyof typeof PAYMENT_METHOD_MAP] || {
              color: 'default' as const,
              text: method,
            };
            return <Tag color={config.color}>{config.text}</Tag>;
          },
        },
        {
          title: '状态',
          dataIndex: 'status',
          key: 'status',
          render: (status: string) => {
            const config = PAYMENT_STATUS_MAP[status as keyof typeof PAYMENT_STATUS_MAP] || {
              color: 'default' as const,
              text: status,
            };
            return <Tag color={config.color}>{config.text}</Tag>;
          },
        },
        {
          title: '交易号',
          dataIndex: 'transactionId',
          key: 'transactionId',
          ellipsis: true,
        },
        {
          title: '创建时间',
          dataIndex: 'createdAt',
          key: 'createdAt',
          render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
        },
        {
          title: '支付时间',
          dataIndex: 'paidAt',
          key: 'paidAt',
          render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
        },
        {
          title: '操作',
          key: 'action',
          width: 220,
          fixed: 'right',
          render: (_, record) => (
            <Space size="small">
              {(record.status === 'pending' || record.status === 'processing') && (
                <>
                  <Button
                    type="link"
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => onSyncStatus(record.id)}
                  >
                    同步状态
                  </Button>
                  {record.paymentUrl && (
                    <Button type="link" size="small" onClick={() => onShowQRCode(record)}>
                      查看二维码
                    </Button>
                  )}
                </>
              )}
              {record.status === 'success' && hasRefundPermission && (
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DollarOutlined />}
                  onClick={() => onRefund(record)}
                >
                  退款
                </Button>
              )}
              {record.status === 'success' && !hasRefundPermission && (
                <Tooltip title="无退款权限">
                  <Button type="link" size="small" danger disabled icon={<DollarOutlined />}>
                    退款
                  </Button>
                </Tooltip>
              )}
            </Space>
          ),
        },
      ],
      [renderAmount, hasRefundPermission, onSyncStatus, onShowQRCode, onRefund]
    );

    return (
      <Card>
        <Table
          columns={columns}
          dataSource={payments}
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
          scroll={{ x: TABLE_SCROLL_X }}
        />
      </Card>
    );
  }
);

PaymentTable.displayName = 'PaymentTable';
