import { useState, useMemo, useCallback } from 'react';
import { Table, Tag, Space, Button, Modal, message, Input, Select, DatePicker, Card, Row, Col, Dropdown, Popconfirm, Form, InputNumber } from 'antd';
import { EyeOutlined, CloseCircleOutlined, SearchOutlined, DownloadOutlined, DownOutlined, DollarOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import * as billingService from '@/services/billing';
import type { Order } from '@/types';
import dayjs from 'dayjs';
import { exportToExcel, exportToCSV } from '@/utils/export';
import {
  useOrders,
  useCancelOrder,
  useRefundOrder
} from '@/hooks/useOrders';

const { Search } = Input;
const { RangePicker } = DatePicker;

/**
 * 订单列表页面（优化版 - 使用 React Query）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 自动请求去重和缓存
 * 5. ✅ 乐观更新支持
 */
const OrderList = () => {
  // 筛选和Modal状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string | undefined>();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState('');

  // ✅ 使用 React Query hooks 替换手动状态管理
  const params = useMemo(() => {
    const p: any = { page, pageSize };
    if (statusFilter) p.status = statusFilter;
    if (paymentMethodFilter) p.paymentMethod = paymentMethodFilter;
    if (searchKeyword) p.search = searchKeyword;
    if (dateRange) {
      p.startDate = dateRange[0];
      p.endDate = dateRange[1];
    }
    return p;
  }, [page, pageSize, statusFilter, paymentMethodFilter, searchKeyword, dateRange]);

  const { data, isLoading } = useOrders(params);

  // Mutations
  const cancelMutation = useCancelOrder();
  const refundMutation = useRefundOrder();

  const orders = data?.data || [];
  const total = data?.total || 0;

  // ✅ useCallback 优化事件处理函数
  const handleCancelOrder = useCallback(async () => {
    if (!selectedOrder) return;
    await cancelMutation.mutateAsync(selectedOrder.id);
    setCancelModalVisible(false);
    setCancelReason('');
  }, [selectedOrder, cancelMutation]);

  const handleBatchCancel = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要取消的订单');
      return;
    }
    try {
      await billingService.batchCancelOrders(selectedRowKeys as string[], '批量取消');
      message.success(`成功取消 ${selectedRowKeys.length} 个订单`);
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('批量取消失败');
    }
  }, [selectedRowKeys]);

  // ✅ useMemo 优化批量选择配置
  const rowSelection = useMemo(() => ({
    selectedRowKeys,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(selectedRowKeys);
    },
    getCheckboxProps: (record: Order) => ({
      disabled: record.status !== 'pending', // 只有待支付的订单可以批量取消
    }),
  }), [selectedRowKeys]);

  // ✅ useMemo 优化导出数据生成
  const exportData = useMemo(() => {
    const paymentMethodMap: Record<string, string> = {
      wechat: '微信支付',
      alipay: '支付宝',
      balance: '余额支付',
    };
    const statusMap: Record<string, string> = {
      pending: '待支付',
      paid: '已支付',
      cancelled: '已取消',
      refunded: '已退款',
      expired: '已过期',
    };

    return orders.map(order => ({
      '订单号': order.orderNo,
      '用户': order.user?.username || '-',
      '套餐': order.plan?.name || '-',
      '金额': order.amount,
      '支付方式': paymentMethodMap[order.paymentMethod] || '-',
      '状态': statusMap[order.status] || order.status,
      '创建时间': dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      '支付时间': order.paidAt ? dayjs(order.paidAt).format('YYYY-MM-DD HH:mm:ss') : '-',
    }));
  }, [orders]);

  const handleExportExcel = useCallback(() => {
    exportToExcel(exportData, `订单列表_${dayjs().format('YYYYMMDD_HHmmss')}`, '订单列表');
    message.success('导出成功');
  }, [exportData]);

  const handleExportCSV = useCallback(() => {
    exportToCSV(exportData, `订单列表_${dayjs().format('YYYYMMDD_HHmmss')}`);
    message.success('导出成功');
  }, [exportData]);

  // ✅ useMemo 优化导出菜单
  const exportMenuItems: MenuProps['items'] = useMemo(() => [
    {
      key: 'excel',
      label: '导出为Excel',
      icon: <DownloadOutlined />,
      onClick: handleExportExcel,
    },
    {
      key: 'csv',
      label: '导出为CSV',
      icon: <DownloadOutlined />,
      onClick: handleExportCSV,
    },
  ], [handleExportExcel, handleExportCSV]);

  const handleRefund = useCallback(async () => {
    if (!selectedOrder) return;
    if (refundAmount <= 0 || refundAmount > selectedOrder.amount) {
      message.error('退款金额无效');
      return;
    }
    await refundMutation.mutateAsync({ id: selectedOrder.id, reason: refundReason });
    setRefundModalVisible(false);
    setRefundAmount(0);
    setRefundReason('');
  }, [selectedOrder, refundAmount, refundReason, refundMutation]);

  // ✅ useMemo 优化映射对象
  const paymentMethodMap = useMemo(() => ({
    wechat: '微信支付',
    alipay: '支付宝',
    balance: '余额支付',
  }), []);

  const statusMap = useMemo(() => ({
    pending: { color: 'orange', text: '待支付' },
    paid: { color: 'green', text: '已支付' },
    cancelled: { color: 'default', text: '已取消' },
    refunded: { color: 'red', text: '已退款' },
    expired: { color: 'default', text: '已过期' },
  }), []);

  const handleViewDetail = useCallback((record: Order) => {
    setSelectedOrder(record);
    setDetailModalVisible(true);
  }, []);

  const handleOpenCancel = useCallback((record: Order) => {
    setSelectedOrder(record);
    setCancelModalVisible(true);
  }, []);

  const handleOpenRefund = useCallback((record: Order) => {
    setSelectedOrder(record);
    setRefundAmount(record.amount);
    setRefundModalVisible(true);
  }, []);

  // ✅ useMemo 优化表格列配置
  const columns: ColumnsType<Order> = useMemo(() => [
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
      sorter: (a, b) => a.amount - b.amount,
      render: (amount: number) => `¥${(amount || 0).toFixed(2)}`,
    },
    {
      title: '支付方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      sorter: (a, b) => (a.paymentMethod || '').localeCompare(b.paymentMethod || ''),
      render: (method: string) => paymentMethodMap[method] || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (status: string) => {
        const config = statusMap[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
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
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
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
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleOpenCancel(record)}
            >
              取消
            </Button>
          )}
          {record.status === 'paid' && (
            <Button
              type="link"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => handleOpenRefund(record)}
            >
              退款
            </Button>
          )}
        </Space>
      ),
    },
  ], [paymentMethodMap, statusMap, handleViewDetail, handleOpenCancel, handleOpenRefund]);

  return (
    <div>
      <h2>订单管理</h2>

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="搜索订单号/用户名"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={(value) => {
                setSearchKeyword(value);
                setPage(1);
              }}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="订单状态"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <Select.Option value="pending">待支付</Select.Option>
              <Select.Option value="paid">已支付</Select.Option>
              <Select.Option value="cancelled">已取消</Select.Option>
              <Select.Option value="refunded">已退款</Select.Option>
              <Select.Option value="expired">已过期</Select.Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="支付方式"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => {
                setPaymentMethodFilter(value);
                setPage(1);
              }}
            >
              <Select.Option value="wechat">微信支付</Select.Option>
              <Select.Option value="alipay">支付宝</Select.Option>
              <Select.Option value="balance">余额支付</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
              onChange={(dates) => {
                if (dates) {
                  setDateRange([
                    dates[0]!.format('YYYY-MM-DD'),
                    dates[1]!.format('YYYY-MM-DD'),
                  ]);
                } else {
                  setDateRange(null);
                }
                setPage(1);
              }}
            />
          </Col>
        </Row>
      </Card>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Dropdown menu={{ items: exportMenuItems }} placement="bottomLeft">
            <Button icon={<DownloadOutlined />}>
              导出数据 <DownOutlined />
            </Button>
          </Dropdown>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`确定要取消选中的 ${selectedRowKeys.length} 个订单吗？`}
              onConfirm={handleBatchCancel}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<CloseCircleOutlined />}>
                批量取消 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={isLoading}
        rowSelection={rowSelection}
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

      {/* 退款对话框 */}
      <Modal
        title="订单退款"
        open={refundModalVisible}
        onCancel={() => {
          setRefundModalVisible(false);
          setRefundAmount(0);
          setRefundReason('');
        }}
        onOk={handleRefund}
      >
        <Form layout="vertical">
          <Form.Item label="订单信息">
            <div>
              <p><strong>订单号：</strong>{selectedOrder?.orderNo}</p>
              <p><strong>订单金额：</strong>¥{selectedOrder?.amount.toFixed(2)}</p>
              <p><strong>支付方式：</strong>
                {selectedOrder?.paymentMethod === 'wechat' ? '微信支付' :
                 selectedOrder?.paymentMethod === 'alipay' ? '支付宝' :
                 selectedOrder?.paymentMethod === 'balance' ? '余额支付' : '-'}
              </p>
            </div>
          </Form.Item>
          <Form.Item label="退款金额" required>
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              max={selectedOrder?.amount || 0}
              precision={2}
              value={refundAmount}
              onChange={(value) => setRefundAmount(value || 0)}
              prefix="¥"
            />
            <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
              最多可退款 ¥{selectedOrder?.amount.toFixed(2)}
            </div>
          </Form.Item>
          <Form.Item label="退款原因" required>
            <Input.TextArea
              placeholder="请输入退款原因"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={4}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OrderList;
