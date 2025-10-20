import { useState, useEffect } from 'react';
import { Table, Tag, Space, Button, Modal, message, Input, Select, DatePicker } from 'antd';
import { EyeOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getOrders, cancelOrder } from '@/services/billing';
import type { Order } from '@/types';
import dayjs from 'dayjs';

const { Search } = Input;
const { RangePicker } = DatePicker;

const OrderList = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await getOrders({ page, pageSize, status: statusFilter });
      setOrders(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, pageSize, statusFilter]);

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    try {
      await cancelOrder(selectedOrder.id, cancelReason);
      message.success('订单已取消');
      setCancelModalVisible(false);
      setCancelReason('');
      loadOrders();
    } catch (error) {
      message.error('取消订单失败');
    }
  };

  const columns: ColumnsType<Order> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 180,
      fixed: 'left',
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
      render: (user: any) => user?.username || '-',
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
      render: (method: string) => {
        const methodMap: Record<string, string> = {
          wechat: '微信支付',
          alipay: '支付宝',
          balance: '余额支付',
        };
        return methodMap[method] || '-';
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: '待支付' },
          paid: { color: 'green', text: '已支付' },
          cancelled: { color: 'default', text: '已取消' },
          refunded: { color: 'red', text: '已退款' },
          expired: { color: 'default', text: '已过期' },
        };
        const config = statusMap[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
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
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedOrder(record);
              setDetailModalVisible(true);
            }}
          >
            详情
          </Button>
          {record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => {
                setSelectedOrder(record);
                setCancelModalVisible(true);
              }}
            >
              取消
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2>订单管理</h2>

      <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
        <Select
          placeholder="订单状态"
          style={{ width: 150 }}
          allowClear
          onChange={(value) => setStatusFilter(value)}
        >
          <Select.Option value="pending">待支付</Select.Option>
          <Select.Option value="paid">已支付</Select.Option>
          <Select.Option value="cancelled">已取消</Select.Option>
          <Select.Option value="refunded">已退款</Select.Option>
          <Select.Option value="expired">已过期</Select.Option>
        </Select>
      </div>

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
        scroll={{ x: 1400 }}
      />

      {/* 订单详情对话框 */}
      <Modal
        title="订单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedOrder && (
          <div>
            <p><strong>订单号：</strong>{selectedOrder.orderNo}</p>
            <p><strong>用户：</strong>{selectedOrder.user?.username}</p>
            <p><strong>套餐：</strong>{selectedOrder.plan?.name}</p>
            <p><strong>金额：</strong>¥{selectedOrder.amount.toFixed(2)}</p>
            <p><strong>支付方式：</strong>{selectedOrder.paymentMethod || '-'}</p>
            <p><strong>状态：</strong>{selectedOrder.status}</p>
            <p><strong>创建时间：</strong>{dayjs(selectedOrder.createdAt).format('YYYY-MM-DD HH:mm:ss')}</p>
            {selectedOrder.paidAt && (
              <p><strong>支付时间：</strong>{dayjs(selectedOrder.paidAt).format('YYYY-MM-DD HH:mm:ss')}</p>
            )}
            {selectedOrder.cancelledAt && (
              <p><strong>取消时间：</strong>{dayjs(selectedOrder.cancelledAt).format('YYYY-MM-DD HH:mm:ss')}</p>
            )}
            {selectedOrder.expiresAt && (
              <p><strong>过期时间：</strong>{dayjs(selectedOrder.expiresAt).format('YYYY-MM-DD HH:mm:ss')}</p>
            )}
          </div>
        )}
      </Modal>

      {/* 取消订单对话框 */}
      <Modal
        title="取消订单"
        open={cancelModalVisible}
        onCancel={() => {
          setCancelModalVisible(false);
          setCancelReason('');
        }}
        onOk={handleCancelOrder}
      >
        <p>确定要取消订单 {selectedOrder?.orderNo} 吗？</p>
        <Input.TextArea
          placeholder="取消原因（可选）"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={3}
        />
      </Modal>
    </div>
  );
};

export default OrderList;
