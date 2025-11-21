import { memo, useMemo } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { Order } from '@/types';
import dayjs from 'dayjs';
import { OrderActions, OrderStatusTag, PaymentMethodTag } from './';
import { createTimeColumn } from '@/utils/tableColumns';
import AccessibleTable from '@/components/Accessible/AccessibleTable';

export interface OrderTableProps {
  orders: Order[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  selectedRowKeys: React.Key[];
  onPageChange: (page: number, pageSize: number) => void;
  onSelectionChange: (selectedRowKeys: React.Key[]) => void;
  onViewDetail: (order: Order) => void;
  onCancel: (order: Order) => void;
  onRefund: (order: Order) => void;
}

/**
 * 订单表格组件
 */
export const OrderTable = memo<OrderTableProps>(
  ({
    orders,
    loading,
    page,
    pageSize,
    total,
    selectedRowKeys,
    onPageChange,
    onSelectionChange,
    onViewDetail,
    onCancel,
    onRefund,
  }) => {
    // 批量选择配置
    const rowSelection = useMemo(
      () => ({
        selectedRowKeys,
        onChange: onSelectionChange,
        getCheckboxProps: (record: Order) => ({
          disabled: record.status !== 'pending', // 只有待支付的订单可以批量取消
        }),
      }),
      [selectedRowKeys, onSelectionChange]
    );

    // 表格列配置
    const columns: ColumnsType<Order> = useMemo(
      () => [
        {
          title: '订单号',
          dataIndex: 'orderNo',
          key: 'orderNo',
          width: 180,
          fixed: 'left',
          sorter: (a, b) => a.orderNo.localeCompare(b.orderNo),
        },
        {
          title: '用户',
          dataIndex: 'user',
          key: 'user',
          sorter: (a, b) => (a.user?.username || '').localeCompare(b.user?.username || ''),
          render: (user: any) => user?.username || '-',
        },
        {
          title: '套餐',
          dataIndex: 'plan',
          key: 'plan',
          sorter: (a, b) => (a.plan?.name || '').localeCompare(b.plan?.name || ''),
          render: (plan: any) => plan?.name || '-',
        },
        {
          title: '金额',
          dataIndex: 'amount',
          key: 'amount',
          sorter: (a, b) => Number(a.amount) - Number(b.amount),
          render: (amount: number) => `¥${(amount || 0).toFixed(2)}`,
        },
        {
          title: '支付方式',
          dataIndex: 'paymentMethod',
          key: 'paymentMethod',
          sorter: (a, b) => (a.paymentMethod || '').localeCompare(b.paymentMethod || ''),
          render: (method: string) => <PaymentMethodTag method={method as any} />,
        },
        {
          title: '状态',
          dataIndex: 'status',
          key: 'status',
          sorter: (a, b) => a.status.localeCompare(b.status),
          render: (status: string) => <OrderStatusTag status={status as any} />,
        },
        createTimeColumn('创建时间', 'createdAt'),
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
          title: '操作',
          key: 'action',
          width: 200,
          fixed: 'right',
          render: (_, record) => (
            <OrderActions
              order={record}
              onViewDetail={onViewDetail}
              onCancel={onCancel}
              onRefund={onRefund}
            />
          ),
        },
      ],
      [onViewDetail, onCancel, onRefund]
    );

    return (
      <AccessibleTable<Order>
        ariaLabel="订单列表"
        loadingText="正在加载订单列表"
        emptyText="暂无订单数据"
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={loading}
        rowSelection={rowSelection}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100', '200'],
          showTotal: (total) => `共 ${total} 条`,
          onChange: onPageChange,
        }}
        scroll={{ x: 1400, y: 600 }}
        virtual
      />
    );
  }
);

OrderTable.displayName = 'OrderTable';
