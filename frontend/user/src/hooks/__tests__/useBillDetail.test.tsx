import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBillDetail } from '../useBillDetail';
import * as billingService from '@/services/billing';
import { PaymentMethod } from '@/services/billing';
import * as exportService from '@/services/export';
import { message } from 'antd';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock antd
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      loading: vi.fn(),
    },
  };
});

// Mock billing service
vi.mock('@/services/billing', async () => {
  const actual = await vi.importActual('@/services/billing');
  return {
    ...actual,
    getBillDetail: vi.fn(),
    payBill: vi.fn(),
    downloadBill: vi.fn(),
    applyInvoice: vi.fn(),
  };
});

// Mock export service
vi.mock('@/services/export', () => ({
  triggerDownload: vi.fn(),
}));

// Mock window.print
global.window.print = vi.fn();

describe('useBillDetail Hook', () => {
  const mockBill = {
    id: 'bill-123',
    billNo: 'BILL-2025-001',
    amount: 299.99,
    status: 'unpaid',
    items: [
      { name: '云手机服务', amount: 299.99 },
    ],
  };

  const mockPaymentSuccess = {
    success: true,
    message: '支付成功',
  };

  const mockPaymentRedirect = {
    success: true,
    redirectUrl: 'https://payment.example.com/pay',
  };

  const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });

  // 保存原始的 window.location
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.location.href
    delete (window as any).location;
    window.location = { ...originalLocation, href: '' } as any;

    vi.mocked(billingService.getBillDetail).mockResolvedValue(mockBill as any);
    vi.mocked(billingService.payBill).mockResolvedValue(mockPaymentSuccess as any);
    vi.mocked(billingService.downloadBill).mockResolvedValue(mockBlob as any);
    vi.mocked(billingService.applyInvoice).mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  describe('初始化', () => {
    it('应该初始化所有状态', () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      expect(typeof result.current.loading).toBe('boolean');
      expect(result.current.bill).toBeNull();
      expect(result.current.paymentModalVisible).toBe(false);
      expect(result.current.invoiceModalVisible).toBe(false);
      expect(result.current.paymentMethod).toBe(PaymentMethod.BALANCE);
      expect(result.current.invoiceType).toBe('personal');
      expect(result.current.invoiceTitle).toBe('');
      expect(result.current.taxId).toBe('');
    });
  });

  describe('数据加载', () => {
    it('mount时应该加载账单详情', async () => {
      renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(billingService.getBillDetail).toHaveBeenCalledWith('bill-123');
      });
    });

    it('加载成功应该更新bill', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).toEqual(mockBill);
      });
    });

    it('加载失败应该显示错误消息', async () => {
      vi.mocked(billingService.getBillDetail).mockRejectedValue(
        new Error('网络错误')
      );

      renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('加载账单详情失败');
      });
    });

    it('没有id时不应该加载', async () => {
      renderHook(() => useBillDetail(undefined));

      await waitFor(() => {
        expect(billingService.getBillDetail).not.toHaveBeenCalled();
      });
    });
  });

  describe('handlePay 支付账单', () => {
    it('没有bill时不应该执行', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await act(async () => {
        await result.current.handlePay();
      });

      expect(billingService.payBill).not.toHaveBeenCalled();
    });

    it('支付成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      await act(async () => {
        await result.current.handlePay();
      });

      expect(message.success).toHaveBeenCalledWith('支付成功！');
    });

    it('支付成功应该关闭支付弹窗', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      act(() => {
        result.current.openPaymentModal();
      });

      expect(result.current.paymentModalVisible).toBe(true);

      await act(async () => {
        await result.current.handlePay();
      });

      expect(result.current.paymentModalVisible).toBe(false);
    });

    it('支付成功应该重新加载账单', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      vi.clearAllMocks();

      await act(async () => {
        await result.current.handlePay();
      });

      await waitFor(() => {
        expect(billingService.getBillDetail).toHaveBeenCalled();
      });
    });

    it('需要跳转时应该设置window.location.href', async () => {
      vi.mocked(billingService.payBill).mockResolvedValue(mockPaymentRedirect as any);

      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      await act(async () => {
        await result.current.handlePay();
      });

      expect(window.location.href).toBe('https://payment.example.com/pay');
    });

    it('支付失败应该显示错误消息', async () => {
      vi.mocked(billingService.payBill).mockResolvedValue({
        success: false,
        message: '余额不足',
      } as any);

      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      await act(async () => {
        await result.current.handlePay();
      });

      expect(message.error).toHaveBeenCalledWith('余额不足');
    });

    it('支付异常应该显示默认错误消息', async () => {
      vi.mocked(billingService.payBill).mockRejectedValue(new Error('网络错误'));

      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      await act(async () => {
        await result.current.handlePay();
      });

      expect(message.error).toHaveBeenCalledWith('支付失败');
    });

    it('应该使用选择的支付方式', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      act(() => {
        result.current.setPaymentMethod(PaymentMethod.ALIPAY);
      });

      await act(async () => {
        await result.current.handlePay();
      });

      expect(billingService.payBill).toHaveBeenCalledWith({
        billId: 'bill-123',
        paymentMethod: PaymentMethod.ALIPAY,
      });
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useBillDetail('bill-123'));

      const firstHandle = result.current.handlePay;
      rerender();
      const secondHandle = result.current.handlePay;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleDownload 下载账单', () => {
    it('没有bill时不应该执行', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(billingService.downloadBill).not.toHaveBeenCalled();
    });

    it('下载成功应该调用triggerDownload', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(exportService.triggerDownload).toHaveBeenCalledWith(
        mockBlob,
        '账单-BILL-2025-001.pdf'
      );
    });

    it('下载时应该显示loading消息', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(message.loading).toHaveBeenCalledWith({
        content: '正在下载...',
        key: 'download',
      });
    });

    it('下载成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(message.success).toHaveBeenCalledWith({
        content: '下载成功！',
        key: 'download',
      });
    });

    it('下载失败应该显示错误消息', async () => {
      vi.mocked(billingService.downloadBill).mockRejectedValue(new Error('下载失败'));

      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleDownload();
      });

      expect(message.error).toHaveBeenCalledWith({
        content: '下载失败',
        key: 'download',
      });
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useBillDetail('bill-123'));

      const firstHandle = result.current.handleDownload;
      rerender();
      const secondHandle = result.current.handleDownload;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleApplyInvoice 申请发票', () => {
    it('没有bill时不应该执行', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await act(async () => {
        await result.current.handleApplyInvoice();
      });

      expect(billingService.applyInvoice).not.toHaveBeenCalled();
    });

    it('个人发票不应该包含税号', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      act(() => {
        result.current.setInvoiceType('personal');
        result.current.setInvoiceTitle('张三');
      });

      await act(async () => {
        await result.current.handleApplyInvoice();
      });

      const callArg = vi.mocked(billingService.applyInvoice).mock.calls[0][0];
      expect(callArg.type).toBe('personal');
      expect(callArg.title).toBe('张三');
      expect(callArg.taxId).toBeUndefined();
    });

    it('企业发票应该包含税号', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      act(() => {
        result.current.setInvoiceType('company');
        result.current.setInvoiceTitle('某某科技有限公司');
        result.current.setTaxId('123456789012345678');
      });

      await act(async () => {
        await result.current.handleApplyInvoice();
      });

      const callArg = vi.mocked(billingService.applyInvoice).mock.calls[0][0];
      expect(callArg.type).toBe('company');
      expect(callArg.title).toBe('某某科技有限公司');
      expect(callArg.taxId).toBe('123456789012345678');
    });

    it('申请成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleApplyInvoice();
      });

      expect(message.success).toHaveBeenCalledWith('发票申请已提交');
    });

    it('申请成功应该关闭发票弹窗', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      act(() => {
        result.current.openInvoiceModal();
      });

      expect(result.current.invoiceModalVisible).toBe(true);

      await act(async () => {
        await result.current.handleApplyInvoice();
      });

      expect(result.current.invoiceModalVisible).toBe(false);
    });

    it('申请失败应该显示错误消息', async () => {
      vi.mocked(billingService.applyInvoice).mockRejectedValue(new Error('申请失败'));

      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleApplyInvoice();
      });

      expect(message.error).toHaveBeenCalledWith('申请发票失败');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useBillDetail('bill-123'));

      const firstHandle = result.current.handleApplyInvoice;
      rerender();
      const secondHandle = result.current.handleApplyInvoice;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('Modal 控制', () => {
    it('openPaymentModal应该打开支付弹窗', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      act(() => {
        result.current.openPaymentModal();
      });

      expect(result.current.paymentModalVisible).toBe(true);
    });

    it('closePaymentModal应该关闭支付弹窗', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      act(() => {
        result.current.openPaymentModal();
        result.current.closePaymentModal();
      });

      expect(result.current.paymentModalVisible).toBe(false);
    });

    it('openInvoiceModal应该打开发票弹窗', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      act(() => {
        result.current.openInvoiceModal();
      });

      expect(result.current.invoiceModalVisible).toBe(true);
    });

    it('closeInvoiceModal应该关闭发票弹窗', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      act(() => {
        result.current.openInvoiceModal();
        result.current.closeInvoiceModal();
      });

      expect(result.current.invoiceModalVisible).toBe(false);
    });

    it('Modal控制函数应该是稳定的引用', () => {
      const { result, rerender } = renderHook(() => useBillDetail('bill-123'));

      const firstOpen = result.current.openPaymentModal;
      const firstClose = result.current.closePaymentModal;
      const firstOpenInvoice = result.current.openInvoiceModal;
      const firstCloseInvoice = result.current.closeInvoiceModal;

      rerender();

      expect(result.current.openPaymentModal).toBe(firstOpen);
      expect(result.current.closePaymentModal).toBe(firstClose);
      expect(result.current.openInvoiceModal).toBe(firstOpenInvoice);
      expect(result.current.closeInvoiceModal).toBe(firstCloseInvoice);
    });
  });

  describe('handlePrint 打印账单', () => {
    it('应该调用window.print', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      act(() => {
        result.current.handlePrint();
      });

      expect(window.print).toHaveBeenCalled();
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useBillDetail('bill-123'));

      const firstHandle = result.current.handlePrint;
      rerender();
      const secondHandle = result.current.handlePrint;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleBack 导航', () => {
    it('应该导航到账单列表页', async () => {
      const { result } = renderHook(() => useBillDetail('bill-123'));

      await waitFor(() => {
        expect(result.current.bill).not.toBeNull();
      });

      act(() => {
        result.current.handleBack();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/billing');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useBillDetail('bill-123'));

      const firstHandle = result.current.handleBack;
      rerender();
      const secondHandle = result.current.handleBack;

      expect(firstHandle).toBe(secondHandle);
    });
  });
});
