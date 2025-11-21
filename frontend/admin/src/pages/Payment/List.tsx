import { useState, useMemo, useCallback } from 'react';
import { Space, Form } from 'antd';
import {
  useAdminPayments,
  useSyncPaymentStatus,
  useManualRefund,
  useExportPayments,
} from '@/hooks/queries';
import type { PaymentDetail, PaymentListParams } from '@/services/payment-admin';
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

/**
 * 支付列表页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 组件拆分 - 提取 PaymentTable, PaymentFilterPanel 等
 * 5. ✅ 常量提取 - constants.ts
 */
const PaymentList = () => {
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

  const { data, isLoading } = useAdminPayments(params);
  const syncStatusMutation = useSyncPaymentStatus();
  const refundMutation = useManualRefund();
  const exportMutation = useExportPayments();

  const payments = data?.data || [];
  const total = data?.pagination?.total || 0;

  // ===== 事件处理 =====
  const handleSearch = useCallback(() => {
    setPage(1);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    setPage(1);
  }, []);

  const handleFilter = useCallback((values: any) => {
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

        {/* 数据表格 */}
        <PaymentTable
          payments={payments}
          loading={isLoading}
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

export default PaymentList;
