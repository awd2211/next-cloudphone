import { useState, useEffect, useCallback, useMemo } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  getBills,
  getBillStats,
  payBill,
  cancelBill,
  downloadBill,
  PaymentMethod,
  type Bill,
  type BillListQuery,
  type BillStats as BillStatsType,
} from '@/services/billing';
import { triggerDownload } from '@/services/export';
import { createBillTableColumns } from '@/utils/billTableColumns';

/**
 * 账单列表业务逻辑 Hook
 * 封装账单加载、筛选、支付等功能
 */
export function useBillList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<BillStatsType | null>(null);
  const [total, setTotal] = useState(0);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.BALANCE);

  // 查询参数
  const [query, setQuery] = useState<BillListQuery>({
    page: 1,
    pageSize: 10,
  });

  // 加载账单列表
  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getBills(query);
      setBills(response.items);
      setTotal(response.total);
    } catch (error) {
      message.error('加载账单列表失败');
    } finally {
      setLoading(false);
    }
  }, [query]);

  // 加载统计
  const loadStats = useCallback(async () => {
    try {
      const statsData = await getBillStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  }, []);

  // 页面加载时获取数据
  useEffect(() => {
    loadBills();
    loadStats();
  }, [loadBills, loadStats]);

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
  const handleViewDetail = useCallback(
    (id: string) => {
      navigate(`/billing/${id}`);
    },
    [navigate]
  );

  // 支付账单
  const handlePay = useCallback((bill: Bill) => {
    setSelectedBill(bill);
    setPaymentModalVisible(true);
  }, []);

  // 确认支付
  const handleConfirmPay = useCallback(async () => {
    if (!selectedBill) return;

    try {
      const result = await payBill({
        billId: selectedBill.id,
        paymentMethod,
      });

      if (result.success) {
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        } else {
          message.success('支付成功！');
          setPaymentModalVisible(false);
          loadBills();
          loadStats();
        }
      } else {
        message.error(result.message || '支付失败');
      }
    } catch (error) {
      message.error('支付失败');
    }
  }, [selectedBill, paymentMethod, loadBills, loadStats]);

  // 取消账单
  const handleCancel = useCallback(
    async (id: string) => {
      try {
        await cancelBill(id);
        message.success('账单已取消');
        loadBills();
        loadStats();
      } catch (error) {
        message.error('取消失败');
      }
    },
    [loadBills, loadStats]
  );

  // 下载账单
  const handleDownload = useCallback(async (bill: Bill) => {
    try {
      message.loading({ content: '正在下载...', key: 'download' });
      const blob = await downloadBill(bill.id);
      triggerDownload(blob, `账单-${bill.billNo}.pdf`);
      message.success({ content: '下载成功！', key: 'download' });
    } catch (error) {
      message.error({ content: '下载失败', key: 'download' });
    }
  }, []);

  // 刷新
  const handleRefresh = useCallback(() => {
    loadBills();
    loadStats();
  }, [loadBills, loadStats]);

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

  return {
    // 数据
    bills,
    stats,
    loading,
    total,
    query,
    paymentModalVisible,
    selectedBill,
    paymentMethod,
    columns,

    // 操作方法
    setQuery,
    setPaymentMethod,
    setPaymentModalVisible,
    handleFilterChange,
    handleDateRangeChange,
    handleConfirmPay,
    handleRefresh,
  };
}
