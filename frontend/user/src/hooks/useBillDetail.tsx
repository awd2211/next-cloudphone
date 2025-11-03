import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import {
  getBillDetail,
  payBill,
  downloadBill,
  applyInvoice,
  PaymentMethod,
  type Bill,
  type InvoiceRequest,
} from '@/services/billing';
import { triggerDownload } from '@/services/export';

/**
 * 账单详情 Hook
 *
 * 优化点:
 * 1. ✅ 提取所有业务逻辑到自定义 hook
 * 2. ✅ 使用 useCallback 优化所有处理函数
 * 3. ✅ 统一错误处理和消息提示
 * 4. ✅ 集中管理所有状态
 */
export function useBillDetail(id: string | undefined) {
  const navigate = useNavigate();

  // ===== 状态管理 =====
  const [loading, setLoading] = useState(false);
  const [bill, setBill] = useState<Bill | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.BALANCE);
  const [invoiceType, setInvoiceType] = useState<'personal' | 'company'>('personal');
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [taxId, setTaxId] = useState('');

  // ===== 数据加载 =====
  /**
   * 加载账单详情
   */
  const loadBillDetail = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const data = await getBillDetail(id);
      setBill(data);
    } catch (error) {
      message.error('加载账单详情失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ===== 支付功能 =====
  /**
   * 处理支付
   */
  const handlePay = useCallback(async () => {
    if (!bill) return;

    try {
      const result = await payBill({ billId: bill.id, paymentMethod });
      if (result.success) {
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        } else {
          message.success('支付成功！');
          setPaymentModalVisible(false);
          loadBillDetail();
        }
      } else {
        message.error(result.message || '支付失败');
      }
    } catch (error) {
      message.error('支付失败');
    }
  }, [bill, paymentMethod, loadBillDetail]);

  // ===== 下载功能 =====
  /**
   * 下载账单
   */
  const handleDownload = useCallback(async () => {
    if (!bill) return;

    try {
      message.loading({ content: '正在下载...', key: 'download' });
      const blob = await downloadBill(bill.id);
      triggerDownload(blob, `账单-${bill.billNo}.pdf`);
      message.success({ content: '下载成功！', key: 'download' });
    } catch (error) {
      message.error({ content: '下载失败', key: 'download' });
    }
  }, [bill]);

  // ===== 发票功能 =====
  /**
   * 申请发票
   */
  const handleApplyInvoice = useCallback(async () => {
    if (!bill) return;

    try {
      const invoiceData: InvoiceRequest = {
        billId: bill.id,
        type: invoiceType,
        title: invoiceTitle,
        taxId: invoiceType === 'company' ? taxId : undefined,
        email: '', // 从用户信息获取
      };
      await applyInvoice(invoiceData);
      message.success('发票申请已提交');
      setInvoiceModalVisible(false);
    } catch (error) {
      message.error('申请发票失败');
    }
  }, [bill, invoiceType, invoiceTitle, taxId]);

  // ===== Modal 控制 =====
  /**
   * 打开支付 Modal
   */
  const openPaymentModal = useCallback(() => {
    setPaymentModalVisible(true);
  }, []);

  /**
   * 关闭支付 Modal
   */
  const closePaymentModal = useCallback(() => {
    setPaymentModalVisible(false);
  }, []);

  /**
   * 打开发票 Modal
   */
  const openInvoiceModal = useCallback(() => {
    setInvoiceModalVisible(true);
  }, []);

  /**
   * 关闭发票 Modal
   */
  const closeInvoiceModal = useCallback(() => {
    setInvoiceModalVisible(false);
  }, []);

  // ===== 打印功能 =====
  /**
   * 打印账单
   */
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ===== 导航 =====
  /**
   * 返回列表
   */
  const handleBack = useCallback(() => {
    navigate('/billing');
  }, [navigate]);

  // ===== 副作用 =====
  useEffect(() => {
    loadBillDetail();
  }, [loadBillDetail]);

  // ===== 返回所有状态和方法 =====
  return {
    // 状态
    loading,
    bill,
    paymentModalVisible,
    invoiceModalVisible,
    paymentMethod,
    invoiceType,
    invoiceTitle,
    taxId,

    // 状态设置
    setPaymentMethod,
    setInvoiceType,
    setInvoiceTitle,
    setTaxId,

    // 数据操作
    loadBillDetail,

    // 支付功能
    handlePay,
    openPaymentModal,
    closePaymentModal,

    // 下载功能
    handleDownload,

    // 发票功能
    handleApplyInvoice,
    openInvoiceModal,
    closeInvoiceModal,

    // 打印功能
    handlePrint,

    // 导航
    handleBack,
  };
}
