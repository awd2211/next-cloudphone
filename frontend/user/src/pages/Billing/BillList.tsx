import React, { useState, useMemo, useCallback } from 'react';
import { Card, Table, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import { BillStatsCards, BillFilterBar, PaymentModal } from '@/components/Billing';
import { useBills, useBillStats, usePayBill, useCancelBill, useDownloadBill } from '@/hooks/queries';
import { createBillTableColumns } from '@/utils/billTableColumns';
import type { BillListQuery, Bill } from '@/services/billing';
import { PaymentMethod } from '@/services/billing';

/**
 * 账单列表页面
 * 展示用户的所有账单，支持筛选、支付、取消等操作
 */
const BillList: React.FC = () => {
  const navigate = useNavigate();

  // 查询参数状态
  const [query, setQuery] = useState<BillListQuery>({
    page: 1,
    pageSize: 10,
  });

  // 支付弹窗状态
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('balance' as PaymentMethod);

  // React Query hooks
  const { data: billsData, isLoading: loading } = useBills(query);
  const { data: stats } = useBillStats();
  const payBill = usePayBill();
  const cancelBill = useCancelBill();
  const downloadBill = useDownloadBill();

  // useBills 返回 BillListResponse = { items: Bill[], total, page, pageSize }
  const bills: Bill[] = billsData?.items || [];
  const total = billsData?.total ?? 0;

  // 筛选变化
  const handleFilterChange = useCallback((key: keyof BillListQuery, value: any) => {
    setQuery((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  // 日期范围变化
  const handleDateRangeChange = useCallback((dates: any) => {
    if (dates && dates.length === 2) {
      setQuery((prev) => ({
        ...prev,
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD'),
        page: 1,
      }));
    } else {
      setQuery((prev) => ({
        ...prev,
        startDate: undefined,
        endDate: undefined,
        page: 1,
      }));
    }
  }, []);

  // 查看详情
  const handleViewDetail = useCallback((id: string) => {
    navigate(`/billing/${id}`);
  }, [navigate]);

  // 支付账单
  const handlePay = useCallback((bill: any) => {
    setSelectedBill(bill);
    setPaymentModalVisible(true);
  }, []);

  // 确认支付
  const handleConfirmPay = useCallback(async () => {
    if (!selectedBill) return;

    await payBill.mutateAsync({
      billId: selectedBill.id,
      paymentMethod,
    });

    setPaymentModalVisible(false);
  }, [selectedBill, paymentMethod, payBill]);

  // 取消账单
  const handleCancel = useCallback(async (id: string) => {
    await cancelBill.mutateAsync(id);
  }, [cancelBill]);

  // 下载账单 (useDownloadBill 需要完整 Bill 对象)
  const handleDownload = useCallback(async (bill: Bill) => {
    await downloadBill.mutateAsync(bill);
  }, [downloadBill]);

  // 刷新（React Query 自动处理）
  const handleRefresh = useCallback(() => {
    // React Query 的 invalidateQueries 已在 mutations 中自动处理
  }, []);

  // 表格列配置
  const columns = useMemo(
    () =>
      createBillTableColumns({
        onViewDetail: handleViewDetail,
        onPay: handlePay,
        onCancel: handleCancel,
        onDownload: handleDownload,
      }),
    [handleViewDetail, handlePay, handleCancel, handleDownload]
  );

  return (
    <div>
      {/* 统计卡片 */}
      <BillStatsCards stats={stats ?? null} />

      {/* 筛选工具栏 */}
      <BillFilterBar
        onSearch={(keyword) => handleFilterChange('keyword', keyword)}
        onTypeChange={(type) => handleFilterChange('type', type)}
        onStatusChange={(status) => handleFilterChange('status', status)}
        onDateRangeChange={handleDateRangeChange}
        onRefresh={handleRefresh}
      />

      {/* 账单列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={bills}
          rowKey="id"
          loading={loading}
          pagination={{
            current: query.page,
            pageSize: query.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条账单`,
            onChange: (page, pageSize) => setQuery({ ...query, page, pageSize }),
          }}
          locale={{
            emptyText: <Empty description="暂无账单" />,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* 支付弹窗 */}
      <PaymentModal
        visible={paymentModalVisible}
        bill={selectedBill}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        onConfirm={handleConfirmPay}
        onCancel={() => setPaymentModalVisible(false)}
      />
    </div>
  );
};

export default BillList;
