import { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, message } from 'antd';
import {
  getInvoices,
  downloadInvoice,
  applyInvoice,
  getBills,
  BillStatus,
  type Invoice,
  type InvoiceRequest,
  type Bill,
} from '@/services/billing';
import { createInvoiceTableColumns } from '@/utils/invoiceTableColumns';

/**
 * 发票列表业务逻辑 Hook
 * 封装发票加载、申请、下载等功能
 */
export function useInvoiceList() {
  const [form] = Form.useForm();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // 加载发票列表
  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInvoices({ page, pageSize });
      setInvoices(res.items);
      setTotal(res.total);
    } catch (error) {
      message.error('加载发票列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  // 加载已支付的账单（用于申请发票）
  const loadPaidBills = useCallback(async () => {
    try {
      const res = await getBills({ status: BillStatus.PAID, pageSize: 100 });
      // 过滤掉已经申请过发票的账单
      const billsWithoutInvoice = res.items.filter(
        (bill) => !invoices.some((invoice) => invoice.billId === bill.id)
      );
      setBills(billsWithoutInvoice);
    } catch (error) {
      console.error('加载账单失败', error);
    }
  }, [invoices]);

  // 页面加载时获取数据
  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // 申请弹窗打开时加载可用账单
  useEffect(() => {
    if (applyModalVisible) {
      loadPaidBills();
    }
  }, [applyModalVisible, loadPaidBills]);

  // 申请发票
  const handleApplyInvoice = useCallback(async (values: InvoiceRequest) => {
    try {
      await applyInvoice(values);
      message.success('发票申请已提交，请等待审核');
      setApplyModalVisible(false);
      form.resetFields();
      loadInvoices();
    } catch (error: any) {
      message.error(error.message || '申请发票失败');
    }
  }, [form, loadInvoices]);

  // 下载发票
  const handleDownload = useCallback(async (id: string, invoiceNo: string) => {
    setDownloading(true);
    try {
      const blob = await downloadInvoice(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `发票_${invoiceNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success('发票下载成功');
    } catch (error: any) {
      message.error(error.message || '下载发票失败');
    } finally {
      setDownloading(false);
    }
  }, []);

  // 查看发票详情
  const handleViewDetail = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailModalVisible(true);
  }, []);

  // 打开申请弹窗
  const handleOpenApplyModal = useCallback(() => {
    setApplyModalVisible(true);
  }, []);

  // 关闭申请弹窗
  const handleCloseApplyModal = useCallback(() => {
    setApplyModalVisible(false);
    form.resetFields();
  }, [form]);

  // 关闭详情弹窗
  const handleCloseDetailModal = useCallback(() => {
    setDetailModalVisible(false);
    setSelectedInvoice(null);
  }, []);

  // 表格列配置
  const columns = useMemo(
    () =>
      createInvoiceTableColumns({
        onViewDetail: handleViewDetail,
        onDownload: handleDownload,
        downloading,
      }),
    [handleViewDetail, handleDownload, downloading]
  );

  // 分页变化
  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  }, []);

  return {
    // 数据
    invoices,
    bills,
    loading,
    downloading,
    total,
    page,
    pageSize,
    columns,
    form,

    // Modal 状态
    applyModalVisible,
    detailModalVisible,
    selectedInvoice,

    // 操作方法
    handleOpenApplyModal,
    handleCloseApplyModal,
    handleCloseDetailModal,
    handleApplyInvoice,
    handleDownload,
    handleViewDetail,
    handlePageChange,
  };
}
