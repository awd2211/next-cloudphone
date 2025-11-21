import { useState, useMemo, useCallback } from 'react';
import { message } from 'antd';
import type { Order } from '@/types';
import { useOrders, useCancelOrder, useRefundOrder } from '@/hooks/queries';
import * as billingService from '@/services/billing';
import { exportToExcel, exportToCSV } from '@/utils/export';
import dayjs from 'dayjs';
import type { MenuProps } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import {

  OrderToolbar,
  OrderFilterBar,
  OrderTable,
  OrderDetailModal,
  CancelOrderModal,
  RefundOrderModal,
  STATUS_CONFIG,
  PAYMENT_METHOD_MAP,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from '@/components/Order';

/**
 * 订单列表页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 组件拆分 - 提取 OrderTable, OrderFilterBar 等
 * 5. ✅ 常量提取 - constants.ts
 */
const OrderList = () => {
  // ===== 状态管理 =====
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
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

  // ===== 数据查询 =====
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
  const cancelMutation = useCancelOrder();
  const refundMutation = useRefundOrder();

  const orders = data?.data || [];
  const total = data?.total || 0;

  // ===== 事件处理 =====
  const handleSearchChange = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((status: string | undefined) => {
    setStatusFilter(status);
    setPage(1);
  }, []);

  const handlePaymentMethodChange = useCallback((method: string | undefined) => {
    setPaymentMethodFilter(method);
    setPage(1);
  }, []);

  const handleDateRangeChange = useCallback((range: [string, string] | null) => {
    setDateRange(range);
    setPage(1);
  }, []);

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
    setRefundAmount(Number(record.amount));
    setRefundModalVisible(true);
  }, []);

  const handleCancelOrder = useCallback(async () => {
    if (!selectedOrder) return;
    await cancelMutation.mutateAsync({ id: selectedOrder.id, reason: cancelReason });
    setCancelModalVisible(false);
    setCancelReason('');
  }, [selectedOrder, cancelReason, cancelMutation]);

  const handleRefund = useCallback(async () => {
    if (!selectedOrder) return;
    if (refundAmount <= 0 || refundAmount > Number(selectedOrder.amount)) {
      message.error('退款金额无效');
      return;
    }
    await refundMutation.mutateAsync({ id: selectedOrder.id, reason: refundReason });
    setRefundModalVisible(false);
    setRefundAmount(0);
    setRefundReason('');
  }, [selectedOrder, refundAmount, refundReason, refundMutation]);

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

  // 导出数据
  const exportData = useMemo(() => {
    return orders.map((order: any) => ({
      订单号: order.orderNo,
      用户: order.user?.username || '-',
      套餐: order.plan?.name || '-',
      金额: order.amount,
      支付方式: PAYMENT_METHOD_MAP[order.paymentMethod as keyof typeof PAYMENT_METHOD_MAP] || '-',
      状态: STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]?.text || order.status,
      创建时间: dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      支付时间: order.paidAt ? dayjs(order.paidAt).format('YYYY-MM-DD HH:mm:ss') : '-',
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

  const exportMenuItems: MenuProps['items'] = useMemo(
    () => [
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
    ],
    [handleExportExcel, handleExportCSV]
  );

  // ===== 渲染 =====
  return (
    <div>
      <h2>订单管理</h2>

      {/* 筛选栏 */}
      <OrderFilterBar
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onPaymentMethodChange={handlePaymentMethodChange}
        onDateRangeChange={handleDateRangeChange}
      />

      {/* 操作按钮栏 */}
      <OrderToolbar
        selectedCount={selectedRowKeys.length}
        exportMenuItems={exportMenuItems}
        onBatchCancel={handleBatchCancel}
      />

      {/* 订单表格 */}
      <OrderTable
        orders={orders}
        loading={isLoading}
        page={page}
        pageSize={pageSize}
        total={total}
        selectedRowKeys={selectedRowKeys}
        onPageChange={(page, pageSize) => {
          setPage(page);
          setPageSize(pageSize);
        }}
        onSelectionChange={setSelectedRowKeys}
        onViewDetail={handleViewDetail}
        onCancel={handleOpenCancel}
        onRefund={handleOpenRefund}
      />

      {/* 订单详情弹窗 */}
      <OrderDetailModal
        visible={detailModalVisible}
        order={selectedOrder}
        onCancel={() => setDetailModalVisible(false)}
      />

      {/* 取消订单弹窗 */}
      <CancelOrderModal
        visible={cancelModalVisible}
        order={selectedOrder}
        reason={cancelReason}
        onReasonChange={setCancelReason}
        onConfirm={handleCancelOrder}
        onCancel={() => {
          setCancelModalVisible(false);
          setCancelReason('');
        }}
      />

      {/* 退款弹窗 */}
      <RefundOrderModal
        visible={refundModalVisible}
        order={selectedOrder}
        amount={refundAmount}
        reason={refundReason}
        onAmountChange={setRefundAmount}
        onReasonChange={setRefundReason}
        onConfirm={handleRefund}
        onCancel={() => {
          setRefundModalVisible(false);
          setRefundAmount(0);
          setRefundReason('');
        }}
      />
    </div>
  );
};

export default OrderList;
