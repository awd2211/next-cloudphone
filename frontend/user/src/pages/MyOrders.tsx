import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Button, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getMyOrders, cancelOrder } from '@/services/order';
import type { Order } from '@/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import dayjs from 'dayjs';

const MyOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyOrders({ page, pageSize });
      setOrders(res.data ?? []);
      setTotal(res.total);
    } catch (error) {
      message.error('加载订单列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // 快捷键支持：Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        loadOrders();
        message.info('正在刷新...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadOrders]);

  const handleCancel = async (id: string) => {
    try {
      await cancelOrder(id);
      message.success('订单已取消');
      loadOrders();
    } catch (error) {
      message.error('取消订单失败');
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'orange', text: '待支付' },
      paid: { color: 'green', text: '已支付' },
      cancelled: { color: 'default', text: '已取消' },
      refunded: { color: 'purple', text: '已退款' },
      expired: { color: 'red', text: '已过期' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getPaymentMethodTag = (method?: string) => {
    if (!method) return '-';
    const methodMap: Record<string, { color: string; text: string }> = {
      wechat: { color: 'green', text: '微信支付' },
      alipay: { color: 'blue', text: '支付宝' },
      balance: { color: 'orange', text: '余额支付' },
    };
    const config = methodMap[method] || { color: 'default', text: method };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<Order> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 180,
    },
    {
      title: '套餐',
      dataIndex: 'plan',
      key: 'plan',
      render: (plan: any) => plan?.name || '-',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '支付方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method?: string) => getPaymentMethodTag(method),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
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
      render: (date?: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <>
          {record.status === 'pending' && (
            <Button type="link" size="small" danger onClick={() => handleCancel(record.id)}>
              取消订单
            </Button>
          )}
        </>
      ),
    },
  ];

  return (
    <ErrorBoundary>
      <div>
        <h2>我的订单</h2>

        <Card>
          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPage(page);
                setPageSize(pageSize);
              },
            }}
            scroll={{ x: 1200 }}
          />
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default MyOrders;
