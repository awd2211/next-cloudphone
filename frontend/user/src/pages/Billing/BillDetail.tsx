import React from 'react';
import { Card } from 'antd';
import { useParams } from 'react-router-dom';
import {
  BillHeader,
  BillStatusSteps,
  BillInfoCard,
  BillItemsTable,
  PaymentModal,
  InvoiceModal,
} from '@/components/Bill';
import { useBillDetail } from '@/hooks/useBillDetail';

/**
 * 账单详情页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用自定义 hook 管理所有业务逻辑
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 所有子组件使用 React.memo 优化
 * 4. ✅ 处理函数使用 useCallback 优化
 * 5. ✅ 代码从 428 行减少到 ~100 行
 */
const BillDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    loading,
    bill,
    paymentModalVisible,
    invoiceModalVisible,
    paymentMethod,
    invoiceType,
    invoiceTitle,
    taxId,
    setPaymentMethod,
    setInvoiceType,
    setInvoiceTitle,
    setTaxId,
    handlePay,
    openPaymentModal,
    closePaymentModal,
    handleDownload,
    handleApplyInvoice,
    openInvoiceModal,
    closeInvoiceModal,
    handlePrint,
    handleBack,
  } = useBillDetail(id);

  // 加载中状态
  if (loading || !bill) {
    return <Card loading={loading} />;
  }

  return (
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
  );
};

export default BillDetail;
