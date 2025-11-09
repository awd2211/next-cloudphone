import React, { useMemo } from 'react';
import { Table, Space, Button, Tooltip } from 'antd';
import { EyeOutlined, SyncOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { PaymentDetail } from '@/services/payment-admin';
import { PaymentMethodTag, PaymentStatusTag } from '@/components/Refund';
import { ExceptionTypeTag } from './ExceptionTypeTag';

interface ExceptionTableProps {
  payments: PaymentDetail[];
  loading: boolean;
  hasSyncPermission: boolean;
  syncingId: string | null;
  page: number;
  pageSize: number;
  total: number;
  onViewDetail: (payment: PaymentDetail) => void;
  onSync: (paymentId: string) => void;
  onPageChange: (page: number, pageSize: number) => void;
}

export const ExceptionTable: React.FC<ExceptionTableProps> = React.memo(
  ({
    payments,
    loading,
    hasSyncPermission,
    syncingId,
    page,
    pageSize,
    total,
    onViewDetail,
    onSync,
    onPageChange,
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
          title: '异常类型',
          key: 'exceptionType',
          width: 130,
          render: (_, record) => <ExceptionTypeTag payment={record} />,
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
          sorter: (a, b) => a.userId.localeCompare(b.userId),
        },
        {
          title: '金额',
          dataIndex: 'amount',
          key: 'amount',
          width: 120,
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
          width: 120,
          sorter: (a, b) => a.method.localeCompare(b.method),
          render: (method: string) => <PaymentMethodTag method={method} />,
        },
        {
          title: '状态',
          dataIndex: 'status',
          key: 'status',
          width: 100,
          sorter: (a, b) => a.status.localeCompare(b.status),
          render: (status: string) => <PaymentStatusTag status={status} />,
        },
        {
          title: '创建时间',
          dataIndex: 'createdAt',
          key: 'createdAt',
          width: 180,
          sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          render: (date: string) => {
            const hoursSince = dayjs().diff(dayjs(date), 'hour');
            return (
              <Tooltip title={`${hoursSince} 小时前`}>
                {dayjs(date).format('YYYY-MM-DD HH:mm')}
              </Tooltip>
            );
          },
        },
        {
          title: '操作',
          key: 'action',
          width: 200,
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
              {hasSyncPermission && (
                <Button
                  type="link"
                  size="small"
                  icon={<SyncOutlined />}
                  loading={syncingId === record.id}
                  onClick={() => onSync(record.id)}
                >
                  同步
                </Button>
              )}
            </Space>
          ),
        },
      ],
      [hasSyncPermission, syncingId, onViewDetail, onSync]
    );

    return (
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
          pageSizeOptions: ['20', '50', '100', '200'],
          showTotal: (total) => `共 ${total} 条异常记录`,
          onChange: onPageChange,
        }}
        scroll={{ x: 1600, y: 600 }}
        virtual
        locale={{ emptyText: '暂无异常支付记录' }}
      />
    );
  }
);

ExceptionTable.displayName = 'ExceptionTable';
