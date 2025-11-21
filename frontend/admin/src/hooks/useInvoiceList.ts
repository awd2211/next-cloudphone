import { useState, useCallback } from 'react';
import { message } from 'antd';
import request from '@/utils/request';
import { useInvoiceTableColumns, type Invoice } from '@/components/Billing';

export const useInvoiceList = () => {
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
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // 查看详情
  const handleViewDetail = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailModalVisible(true);
  }, []);

  // 下载发票
  const handleDownload = useCallback(async (invoice: Invoice) => {
    try {
      // 调用后端 API 下载发票 PDF
      const response = await request.get(`/invoices/${invoice.id}/download`, {
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
    invoices,
    loading,
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
