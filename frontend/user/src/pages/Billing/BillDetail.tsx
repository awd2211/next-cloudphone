import React, { useState, useCallback, useEffect } from 'react';
import { Card, message } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  BillHeader,
  BillStatusSteps,
  BillInfoCard,
  BillItemsTable,
  PaymentModal,
  InvoiceModal,
} from '@/components/Bill';
import {
  useBillDetail,
  usePayBill,
  useDownloadBill,
  useApplyInvoice,
} from '@/hooks/queries';
import { PaymentMethod } from '@/services/billing';

// 发票类型（本地定义）
type InvoiceType = 'personal' | 'company';

/**
 * 账单详情页面（React Query 优化版）
 *
 * 优化点：
 * 1. ✅ 使用 React Query hooks 管理数据获取和mutations
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 所有子组件使用 React.memo 优化
 * 4. ✅ 处理函数使用 useCallback 优化
 * 5. ✅ 自动缓存失效和错误处理
 */
const BillDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 本地状态
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('balance' as PaymentMethod);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('personal' as InvoiceType);
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [taxId, setTaxId] = useState('');

  // React Query hooks
  const { data: bill, isLoading: loading, refetch } = useBillDetail(id!);
  const payBill = usePayBill();
  const downloadBill = useDownloadBill();
  const applyInvoice = useApplyInvoice();

  // 刷新
  const handleRefresh = useCallback(() => {
    refetch();
    message.success('刷新成功');
  }, [refetch]);

  // 快捷键支持：Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh]);

  // 打开/关闭支付弹窗
  const openPaymentModal = useCallback(() => setPaymentModalVisible(true), []);
  const closePaymentModal = useCallback(() => setPaymentModalVisible(false), []);

  // 打开/关闭发票弹窗
  const openInvoiceModal = useCallback(() => setInvoiceModalVisible(true), []);
  const closeInvoiceModal = useCallback(() => setInvoiceModalVisible(false), []);

  // 支付账单
  const handlePay = useCallback(async () => {
    if (!bill) return;

    await payBill.mutateAsync({
      billId: bill.id,
      paymentMethod,
    });

    closePaymentModal();
  }, [bill, paymentMethod, payBill, closePaymentModal]);

  // 下载账单 (useDownloadBill 需要完整 Bill 对象)
  const handleDownload = useCallback(async () => {
    if (!bill) return;
    await downloadBill.mutateAsync(bill);
  }, [bill, downloadBill]);

  // 申请发票 (InvoiceRequest 需要 billId, type, title, email)
  const handleApplyInvoice = useCallback(async () => {
    if (!bill) return;

    await applyInvoice.mutateAsync({
      billId: bill.id,
      type: invoiceType,
      title: invoiceTitle,
      taxId: invoiceType === 'company' ? taxId : undefined,
      email: '', // 需要从用户信息获取或添加输入框
    });

    closeInvoiceModal();
  }, [bill, invoiceType, invoiceTitle, taxId, applyInvoice, closeInvoiceModal]);

  // 打印账单
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // 返回列表
  const handleBack = useCallback(() => {
    navigate('/billing');
  }, [navigate]);

  // 加载中状态
  if (loading || !bill) {
    return <Card loading={loading} />;
  }

  return (
    <ErrorBoundary>
      <div>
        {/* 页头 */}
        <BillHeader
          bill={bill}
          onBack={handleBack}
          onPay={openPaymentModal}
          onApplyInvoice={openInvoiceModal}
          onDownload={handleDownload}
          onPrint={handlePrint}
        />

        {/* 状态步骤 */}
        <BillStatusSteps bill={bill} />

        {/* 账单信息 */}
        <BillInfoCard bill={bill} />

        {/* 账单明细 */}
        <BillItemsTable bill={bill} />

        {/* 支付 Modal */}
        <PaymentModal
          visible={paymentModalVisible}
          bill={bill}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          onOk={handlePay}
          onCancel={closePaymentModal}
        />

        {/* 发票 Modal */}
        <InvoiceModal
          visible={invoiceModalVisible}
          invoiceType={invoiceType}
          invoiceTitle={invoiceTitle}
          taxId={taxId}
          onInvoiceTypeChange={setInvoiceType}
          onInvoiceTitleChange={setInvoiceTitle}
          onTaxIdChange={setTaxId}
          onOk={handleApplyInvoice}
          onCancel={closeInvoiceModal}
        />
      </div>
    </ErrorBoundary>
  );
};

export default BillDetail;
