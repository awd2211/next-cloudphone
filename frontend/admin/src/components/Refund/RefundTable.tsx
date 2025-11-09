import React, { useMemo, useCallback } from 'react';
import { Table, Space, Button } from 'antd';
import { EyeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { PaymentDetail } from '@/services/payment-admin';
import { PaymentMethodTag } from './PaymentMethodTag';
import { PaymentStatusTag } from './PaymentStatusTag';

interface RefundTableProps {
  refunds: PaymentDetail[];
  loading: boolean;
  hasApprovePermission: boolean;
  hasRejectPermission: boolean;
  onViewDetail: (refund: PaymentDetail) => void;
  onApprove: (refund: PaymentDetail) => void;
  onReject: (refund: PaymentDetail) => void;
}

export const RefundTable: React.FC<RefundTableProps> = React.memo(
  ({
    refunds,
    loading,
    hasApprovePermission,
    hasRejectPermission,
    onViewDetail,
    onApprove,
    onReject,
  }) => {
    const columns: ColumnsType<PaymentDetail> = useMemo(
      () => [
        {
          title: '支付单号',
          dataIndex: 'paymentNo',
          key: 'paymentNo',
          width: 180,
          fixed: 'left',
          sorter: (a, b) => a.paymentNo.localeCompare(b.paymentNo),
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
          width: 120,
          ellipsis: true,
          sorter: (a, b) => a.userId.localeCompare(b.userId),
        },
        {
          title: '金额',
          dataIndex: 'amount',
          key: 'amount',
          sorter: (a, b) => a.amount - b.amount,
          render: (amount: number, record) => {
            const currencySymbol =
              record.currency === 'CNY' ? '¥' : record.currency === 'USD' ? '$' : record.currency;
            return `${currencySymbol}${(amount || 0).toFixed(2)}`;
          },
        },
        {
          title: '支付方式',
          dataIndex: 'method',
          key: 'method',
          sorter: (a, b) => a.method.localeCompare(b.method),
          render: (method: string) => <PaymentMethodTag method={method} />,
        },
        {
          title: '状态',
          dataIndex: 'status',
          key: 'status',
          sorter: (a, b) => a.status.localeCompare(b.status),
          render: (status: string) => <PaymentStatusTag status={status} />,
        },
        {
          title: '支付时间',
          dataIndex: 'paidAt',
          key: 'paidAt',
          sorter: (a, b) => {
            const timeA = a.paidAt ? new Date(a.paidAt).getTime() : 0;
            const timeB = b.paidAt ? new Date(b.paidAt).getTime() : 0;
            return timeA - timeB;
          },
          render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
        },
        {
          title: '创建时间',
          dataIndex: 'createdAt',
          key: 'createdAt',
          sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
        },
        {
          title: '操作',
          key: 'action',
          width: 240,
          fixed: 'right',
          render: (_, record) => (
            <Space size="small">
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onViewDetail(record)}
              >
                详情
              </Button>
              {hasApprovePermission && (
                <Button
                  type="link"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => onApprove(record)}
                >
                  批准
                </Button>
              )}
              {hasRejectPermission && (
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => onReject(record)}
                >
                  拒绝
                </Button>
              )}
            </Space>
          ),
        },
      ],
      [hasApprovePermission, hasRejectPermission, onViewDetail, onApprove, onReject]
    );

    return (
      <Table
        columns={columns}
        dataSource={refunds}
        rowKey="id"
        loading={loading}
        pagination={false}
        scroll={{ x: 1600, y: 600 }}
        virtual
        locale={{ emptyText: '暂无待审核的退款申请' }}
      />
    );
  }
);

RefundTable.displayName = 'RefundTable';
