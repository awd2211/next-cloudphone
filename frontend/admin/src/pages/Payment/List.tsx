import { useState, useMemo, useCallback, useEffect } from 'react';
import { Space, Form, Row, Col, Card, Statistic, Tag, message } from 'antd';
import {
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { SEMANTIC, PRIMARY, NEUTRAL_LIGHT } from '@/theme';
import {
  useAdminPayments,
  useSyncPaymentStatus,
  useManualRefund,
  useExportPayments,
} from '@/hooks/queries';
import type { PaymentDetail, PaymentListParams } from '@/services/payment-admin';
import type { Dayjs } from 'dayjs';

/** 筛选表单值类型 */
interface FilterFormValues {
  status?: string;
  method?: string;
  userId?: string;
  dateRange?: [Dayjs, Dayjs];
}
import { usePermission } from '@/hooks';
import {
  PaymentToolbar,
  PaymentSearchBar,
  PaymentFilterPanel,
  PaymentTable,
  RefundModal,
  QRCodeModal,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from '@/components/Payment';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

/**
 * 支付列表页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 组件拆分 - 提取 PaymentTable, PaymentFilterPanel 等
 * 5. ✅ 常量提取 - constants.ts
 * 6. ✅ ErrorBoundary - 错误边界包裹
 * 7. ✅ LoadingState - 统一加载状态
 * 8. ✅ 统计卡片 - 显示关键数据指标
 * 9. ✅ 快捷键支持 - Ctrl+K 搜索, Ctrl+R 刷新
 */
const PaymentListContent = () => {
  const { hasPermission } = usePermission();

  // ===== 状态管理 =====
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetail | null>(null);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [filters, setFilters] = useState<PaymentListParams>({});
  const [searchValue, setSearchValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ===== 表单实例 =====
  const [form] = Form.useForm();
  const [refundForm] = Form.useForm();

  // ===== 数据查询 =====
  const params = useMemo(
    () => ({
      page,
      pageSize,
      ...filters,
      search: searchValue || undefined,
    }),
    [page, pageSize, filters, searchValue]
  );

  const { data, isLoading, error, refetch } = useAdminPayments(params);
  const syncStatusMutation = useSyncPaymentStatus();
  const refundMutation = useManualRefund();
  const exportMutation = useExportPayments();

  const payments = useMemo(() => data?.data || [], [data?.data]);
  const total = data?.pagination?.total || 0;

  // ===== 统计计算 =====
  const stats = useMemo(() => {
    const successCount = payments.filter((p) => p.status === 'success').length;
    const pendingCount = payments.filter((p) => p.status === 'pending').length;
    const failedCount = payments.filter((p) => p.status === 'failed').length;
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    return { total, successCount, pendingCount, failedCount, totalAmount };
  }, [payments, total]);

  // ===== 快捷键支持 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K 或 Cmd+K 聚焦搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          '.ant-input-search input'
        );
        if (searchInput) {
          searchInput.focus();
          message.info('搜索框已聚焦');
        }
      }
      // Ctrl+R 或 Cmd+R 刷新数据
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        message.info('正在刷新...');
        refetch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refetch]);

  // ===== 事件处理 =====
  const handleSearch = useCallback(() => {
    setPage(1);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    setPage(1);
  }, []);

  const handleFilter = useCallback((values: FilterFormValues) => {
    const newFilters: PaymentListParams = {
      status: values.status,
      method: values.method,
      userId: values.userId,
    };

    if (values.dateRange && values.dateRange.length === 2) {
      newFilters.startDate = values.dateRange[0].format('YYYY-MM-DD');
      newFilters.endDate = values.dateRange[1].format('YYYY-MM-DD');
    }

    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    form.resetFields();
    setFilters({});
    setPage(1);
  }, [form]);

  const handleExport = useCallback(async () => {
    await exportMutation.mutateAsync({
      startDate: filters.startDate,
      endDate: filters.endDate,
      status: filters.status,
      method: filters.method,
    });
  }, [exportMutation, filters]);

  const handleSyncStatus = useCallback(
    async (paymentId: string) => {
      await syncStatusMutation.mutateAsync(paymentId);
    },
    [syncStatusMutation]
  );

  const handleShowQRCode = useCallback((payment: PaymentDetail) => {
    setSelectedPayment(payment);
    setQrCodeModalVisible(true);
  }, []);

  const handleOpenRefund = useCallback(
    (payment: PaymentDetail) => {
      setSelectedPayment(payment);
      refundForm.setFieldsValue({ amount: payment.amount });
      setRefundModalVisible(true);
    },
    [refundForm]
  );

  // ===== 渲染 =====
  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 0,
          }}
        >
          <h2 style={{ marginBottom: 0 }}>
            支付管理
            <Tag
              icon={<ReloadOutlined spin={isLoading} />}
              color="processing"
              style={{ marginLeft: 12, cursor: 'pointer' }}
              onClick={() => refetch()}
            >
              Ctrl+R 刷新
            </Tag>
          </h2>
          <span style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.tertiary }}>快捷键: Ctrl+K 搜索</span>
        </div>

        {/* 统计卡片 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="支付总数"
                value={stats.total}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="成功支付"
                value={stats.successCount}
                prefix={<CheckCircleOutlined style={{ color: SEMANTIC.success.main }} />}
                valueStyle={{ color: SEMANTIC.success.main }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="待处理"
                value={stats.pendingCount}
                prefix={<ClockCircleOutlined style={{ color: SEMANTIC.warning.main }} />}
                valueStyle={{ color: SEMANTIC.warning.main }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="支付金额"
                value={stats.totalAmount}
                precision={2}
                prefix={<DollarOutlined style={{ color: PRIMARY.main }} />}
                valueStyle={{ color: PRIMARY.main }}
                suffix="元"
              />
            </Card>
          </Col>
        </Row>

        {/* 工具栏 */}
        <PaymentToolbar
          showFilters={showFilters}
          exportLoading={exportMutation.isPending}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onExport={handleExport}
        />

        {/* 搜索框 */}
        <PaymentSearchBar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onSearch={handleSearch}
          onClear={handleClearSearch}
        />

        {/* 高级筛选 */}
        {showFilters && (
          <PaymentFilterPanel
            form={form}
            onFilter={handleFilter}
            onClearFilters={handleClearFilters}
          />
        )}

        {/* 数据表格 - 使用 LoadingState 统一管理加载状态 */}
        <LoadingState
          loading={isLoading}
          error={error}
          empty={!isLoading && !error && payments.length === 0}
          onRetry={refetch}
          loadingType="skeleton"
          skeletonRows={5}
          emptyDescription="暂无支付数据"
        >
          <PaymentTable
            payments={payments}
            loading={false}
            page={page}
            pageSize={pageSize}
            total={total}
            hasRefundPermission={hasPermission('payment:refund:create')}
            onPageChange={(page, pageSize) => {
              setPage(page);
              setPageSize(pageSize);
            }}
            onSyncStatus={handleSyncStatus}
            onShowQRCode={handleShowQRCode}
            onRefund={handleOpenRefund}
          />
        </LoadingState>
      </Space>

      {/* 退款对话框 */}
      <RefundModal
        visible={refundModalVisible}
        loading={refundMutation.isPending}
        form={refundForm}
        payment={selectedPayment}
        onCancel={() => {
          setRefundModalVisible(false);
          refundForm.resetFields();
        }}
        onConfirm={() => refundForm.submit()}
      />

      {/* 二维码对话框 */}
      <QRCodeModal
        visible={qrCodeModalVisible}
        payment={selectedPayment}
        onCancel={() => setQrCodeModalVisible(false)}
      />
    </div>
  );
};

/**
 * 支付列表页面
 * 使用 ErrorBoundary 包裹，捕获组件错误
 */
const PaymentList = () => {
  return (
    <ErrorBoundary boundaryName="PaymentList">
      <PaymentListContent />
    </ErrorBoundary>
  );
};

export default PaymentList;
