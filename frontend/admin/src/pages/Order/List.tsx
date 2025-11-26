import { useState, useMemo, useCallback, useEffect } from 'react';
import { message, Card, Row, Col, Statistic, Tag, Modal, Input, Space } from 'antd';
import {
  ShoppingOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { Order } from '@/types';
import { useOrders, useCancelOrder, useRefundOrder, useOrderStats } from '@/hooks/queries';
import * as billingService from '@/services/billing';
import { exportToExcel, exportToCSV } from '@/utils/export';
import dayjs from 'dayjs';
import type { MenuProps } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { SEMANTIC, PRIMARY, NEUTRAL_LIGHT } from '@/theme';
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
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

/**
 * 订单列表页面（优化版 v2 - 添加 ErrorBoundary + LoadingState + 统计卡片 + 快捷键）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 组件拆分 - 提取 OrderTable, OrderFilterBar 等
 * 5. ✅ 常量提取 - constants.ts
 * 6. ✅ ErrorBoundary - 错误边界保护
 * 7. ✅ LoadingState - 统一加载状态
 * 8. ✅ 统计卡片 - 订单数量/金额统计
 * 9. ✅ 快捷键支持 - Ctrl+K 搜索、Ctrl+R 刷新
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
  const [quickSearchVisible, setQuickSearchVisible] = useState(false);
  const [quickSearchValue, setQuickSearchValue] = useState('');

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

  const { data, isLoading, error, refetch } = useOrders(params);
  const { data: statsData } = useOrderStats();
  const cancelMutation = useCancelOrder();
  const refundMutation = useRefundOrder();

  const orders = data?.data || [];
  const total = data?.total || 0;

  // 统计数据
  const stats = useMemo(() => ({
    total: statsData?.total || total,
    paid: statsData?.paid || 0,
    pending: statsData?.pending || 0,
    cancelled: statsData?.cancelled || 0,
    totalAmount: statsData?.totalAmount || 0,
  }), [statsData, total]);

  // ===== 快捷键支持 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K 快速搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setQuickSearchVisible(true);
        return;
      }

      // Ctrl+R 刷新列表
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch();
        message.info('正在刷新...');
        return;
      }

      // Escape 关闭快速搜索
      if (e.key === 'Escape' && quickSearchVisible) {
        setQuickSearchVisible(false);
        setQuickSearchValue('');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickSearchVisible, refetch]);

  // ===== 快速搜索处理 =====
  const handleQuickSearch = useCallback((value: string) => {
    setQuickSearchValue('');
    setQuickSearchVisible(false);
    if (value.trim()) {
      setSearchKeyword(value.trim());
      setPage(1);
    }
  }, []);

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
    <ErrorBoundary boundaryName="OrderList">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ marginBottom: 0 }}>
            订单管理
            <Tag
              icon={<ReloadOutlined spin={isLoading} />}
              color="processing"
              style={{ marginLeft: 12, cursor: 'pointer' }}
              onClick={() => refetch()}
            >
              Ctrl+R 刷新
            </Tag>
          </h2>
          <Space>
            <span style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.tertiary }}>
              快捷键：Ctrl+K 搜索
            </span>
          </Space>
        </div>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={4}>
            <Card>
              <Statistic
                title="订单总数"
                value={stats.total}
                prefix={<ShoppingOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card>
              <Statistic
                title="已支付"
                value={stats.paid}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: SEMANTIC.success.main }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card>
              <Statistic
                title="待支付"
                value={stats.pending}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: SEMANTIC.warning.main }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card>
              <Statistic
                title="已取消"
                value={stats.cancelled}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: SEMANTIC.error.main }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={24} lg={8}>
            <Card>
              <Statistic
                title="总金额"
                value={stats.totalAmount}
                prefix={<DollarOutlined />}
                precision={2}
                suffix="元"
                valueStyle={{ color: PRIMARY.main }}
              />
            </Card>
          </Col>
        </Row>

        <Card>
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
          <LoadingState
            loading={isLoading}
            error={error}
            empty={!isLoading && !error && orders.length === 0}
            onRetry={refetch}
            loadingType="skeleton"
            skeletonRows={5}
            emptyDescription="暂无订单数据"
          >
            <OrderTable
              orders={orders}
              loading={false} // LoadingState 已处理
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
          </LoadingState>
        </Card>

        {/* 快速搜索弹窗 */}
        <Modal
          open={quickSearchVisible}
          title="快速搜索订单"
          footer={null}
          onCancel={() => {
            setQuickSearchVisible(false);
            setQuickSearchValue('');
          }}
          destroyOnClose
        >
          <Input
            placeholder="输入订单号或用户名进行搜索..."
            prefix={<SearchOutlined />}
            value={quickSearchValue}
            onChange={(e) => setQuickSearchValue(e.target.value)}
            onPressEnter={(e) => handleQuickSearch((e.target as HTMLInputElement).value)}
            autoFocus
            allowClear
          />
          <div style={{ marginTop: 8, color: NEUTRAL_LIGHT.text.tertiary, fontSize: 12 }}>
            按 Enter 搜索，按 Escape 关闭
          </div>
        </Modal>

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
    </ErrorBoundary>
  );
};

export default OrderList;
