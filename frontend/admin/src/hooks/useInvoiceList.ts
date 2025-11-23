import { useState, useCallback, useMemo } from 'react';
import { message } from 'antd';
import { api } from '@/utils/api';
import { useInvoiceTableColumns, type Invoice } from '@/components/Billing';

export const useInvoiceList = () => {
  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 搜索状态
  const [searchKeyword, setSearchKeyword] = useState('');

  // Mock 数据状态
  const [invoices, _setInvoices] = useState<Invoice[]>([
    {
      id: 'inv-001',
      invoiceNo: 'INV-202510-001',
      billingPeriod: '2025年10月',
      amount: 6542.3,
      status: 'unpaid',
      issueDate: '2025-10-20',
      dueDate: '2025-10-30',
      items: [
        { description: '设备租赁费用', quantity: 15, unitPrice: 180.0, amount: 2700.0 },
        { description: 'CPU 使用费', quantity: 320, unitPrice: 4.5, amount: 1440.0 },
        { description: '内存使用费', quantity: 512, unitPrice: 2.8, amount: 1433.6 },
        { description: '存储费用', quantity: 100, unitPrice: 9.687, amount: 968.7 },
      ],
    },
    {
      id: 'inv-002',
      invoiceNo: 'INV-202509-001',
      billingPeriod: '2025年9月',
      amount: 7128.5,
      status: 'paid',
      issueDate: '2025-09-20',
      dueDate: '2025-09-30',
      paidDate: '2025-09-25',
      items: [
        { description: '设备租赁费用', quantity: 18, unitPrice: 180.0, amount: 3240.0 },
        { description: 'CPU 使用费', quantity: 350, unitPrice: 4.5, amount: 1575.0 },
        { description: '内存使用费', quantity: 600, unitPrice: 2.8, amount: 1680.0 },
        { description: '存储费用', quantity: 65, unitPrice: 9.746, amount: 633.5 },
      ],
    },
    {
      id: 'inv-003',
      invoiceNo: 'INV-202508-001',
      billingPeriod: '2025年8月',
      amount: 5896.2,
      status: 'paid',
      issueDate: '2025-08-20',
      dueDate: '2025-08-30',
      paidDate: '2025-08-22',
      items: [
        { description: '设备租赁费用', quantity: 12, unitPrice: 180.0, amount: 2160.0 },
        { description: 'CPU 使用费', quantity: 280, unitPrice: 4.5, amount: 1260.0 },
        { description: '内存使用费', quantity: 450, unitPrice: 2.8, amount: 1260.0 },
        { description: '存储费用', quantity: 120, unitPrice: 9.302, amount: 1216.2 },
      ],
    },
  ]);

  const [loading, _setLoading] = useState(false);
  const [error, _setError] = useState<Error | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // 筛选后的账单数据
  const filteredInvoices = useMemo(() => {
    if (!searchKeyword) return invoices;
    return invoices.filter(
      (inv) =>
        inv.invoiceNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        inv.billingPeriod.includes(searchKeyword)
    );
  }, [invoices, searchKeyword]);

  // 统计数据
  const stats = useMemo(() => {
    const paid = invoices.filter((i) => i.status === 'paid').length;
    const unpaid = invoices.filter((i) => i.status === 'unpaid').length;
    const totalAmount = invoices.reduce((sum, i) => sum + i.amount, 0);
    const unpaidAmount = invoices
      .filter((i) => i.status === 'unpaid')
      .reduce((sum, i) => sum + i.amount, 0);
    return {
      total: invoices.length,
      paid,
      unpaid,
      totalAmount,
      unpaidAmount,
    };
  }, [invoices]);

  // 刷新数据
  const refetch = useCallback(() => {
    // TODO: 当有真实 API 时实现
    message.info('账单数据已刷新');
  }, []);

  // 搜索处理
  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  // 查看详情
  const handleViewDetail = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailModalVisible(true);
  }, []);

  // 下载发票
  const handleDownload = useCallback(async (invoice: Invoice) => {
    try {
      // 调用后端 API 下载发票 PDF
      const response = await api.get(`/invoices/${invoice.id}/download`, {
        responseType: 'blob', // 关键：告诉 axios 响应类型是 blob
      });

      // 创建 Blob 对象
      const blob = new Blob([response as any], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // 创建下载链接
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoice.invoiceNo}.pdf`);
      document.body.appendChild(link);
      link.click();

      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('发票下载成功');
    } catch (error) {
      message.error('发票下载失败');
      console.error('Failed to download invoice:', error);
    }
  }, []);

  // 关闭详情模态框
  const handleCloseDetail = useCallback(() => {
    setDetailModalVisible(false);
    setSelectedInvoice(null);
  }, []);

  // 表格列定义
  const columns = useInvoiceTableColumns({
    onViewDetail: handleViewDetail,
    onDownload: handleDownload,
  });

  return {
    // 数据状态
    invoices: filteredInvoices,
    total: filteredInvoices.length,
    loading,
    error,
    refetch,

    // 分页状态
    page,
    pageSize,
    setPage,
    setPageSize,

    // 搜索状态
    searchKeyword,
    handleSearch,

    // 统计数据
    stats,

    // 模态框状态
    detailModalVisible,
    selectedInvoice,

    // 表格列
    columns,

    // 处理函数
    handleViewDetail,
    handleDownload,
    handleCloseDetail,
  };
};
