import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInvoiceList } from '../useInvoiceList';
import * as billingService from '@/services/billing';
import { message } from 'antd';
import type { Invoice, Bill } from '@/services/billing';

// Create mock form
const mockForm = {
  resetFields: vi.fn(),
  validateFields: vi.fn(),
  setFieldsValue: vi.fn(),
  getFieldsValue: vi.fn(),
};

// Mock antd
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    Form: {
      useForm: vi.fn(() => [mockForm]),
    },
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock billing service
vi.mock('@/services/billing', () => ({
  getInvoices: vi.fn(),
  downloadInvoice: vi.fn(),
  applyInvoice: vi.fn(),
  getBills: vi.fn(),
  BillStatus: {
    PENDING: 'pending',
    PAID: 'paid',
    CANCELLED: 'cancelled',
  },
}));

// Mock invoice table columns
vi.mock('@/utils/invoiceTableColumns', () => ({
  createInvoiceTableColumns: vi.fn(() => []),
}));

describe('useInvoiceList Hook', () => {
  const mockInvoices: Invoice[] = [
    {
      id: '1',
      invoiceNo: 'INV-001',
      billId: 'bill-1',
      amount: 100,
      status: 'approved',
      createdAt: '2024-01-01T00:00:00Z',
    } as Invoice,
    {
      id: '2',
      invoiceNo: 'INV-002',
      billId: 'bill-2',
      amount: 200,
      status: 'pending',
      createdAt: '2024-01-02T00:00:00Z',
    } as Invoice,
  ];

  const mockBills: Bill[] = [
    {
      id: 'bill-3',
      billNo: 'BILL-003',
      amount: 300,
      status: 'paid',
      createdAt: '2024-01-03T00:00:00Z',
    } as Bill,
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(billingService.getInvoices).mockResolvedValue({
      items: mockInvoices,
      total: 10,
    });
    vi.mocked(billingService.getBills).mockResolvedValue({
      items: mockBills,
      total: 1,
    });
    vi.mocked(billingService.applyInvoice).mockResolvedValue(undefined as any);
    vi.mocked(billingService.downloadInvoice).mockResolvedValue(new Blob() as any);
  });

  describe('初始化', () => {
    it('应该初始化所有状态', () => {
      const { result } = renderHook(() => useInvoiceList());
      expect(result.current.invoices).toEqual([]);
      expect(result.current.bills).toEqual([]);
      expect(typeof result.current.loading).toBe('boolean');
      expect(result.current.downloading).toBe(false);
      expect(result.current.total).toBe(0);
      expect(result.current.page).toBe(1);
      expect(result.current.pageSize).toBe(10);
      expect(result.current.applyModalVisible).toBe(false);
      expect(result.current.detailModalVisible).toBe(false);
      expect(result.current.selectedInvoice).toBeNull();
      expect(result.current.form).toBe(mockForm);
    });
  });

  describe('数据加载', () => {
    it('mount时应该加载发票列表', async () => {
      renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(billingService.getInvoices).toHaveBeenCalledWith({
          page: 1,
          pageSize: 10,
        });
      });
    });

    it('加载成功应该更新invoices', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices).toEqual(mockInvoices);
      });
    });

    it('加载成功应该更新total', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.total).toBe(10);
      });
    });

    it('加载失败应该显示错误消息', async () => {
      vi.mocked(billingService.getInvoices).mockRejectedValue(
        new Error('Network error')
      );

      renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('加载发票列表失败');
      });
    });
  });

  describe('handleOpenApplyModal 打开申请弹窗', () => {
    it('应该打开申请弹窗', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleOpenApplyModal();
      });

      expect(result.current.applyModalVisible).toBe(true);
    });

    it('打开弹窗应该加载已支付账单', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBeGreaterThan(0);
      });

      vi.clearAllMocks();

      act(() => {
        result.current.handleOpenApplyModal();
      });

      await waitFor(() => {
        expect(billingService.getBills).toHaveBeenCalledWith({
          status: 'paid',
          pageSize: 100,
        });
      });
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useInvoiceList());

      const firstHandle = result.current.handleOpenApplyModal;
      rerender();
      const secondHandle = result.current.handleOpenApplyModal;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleCloseApplyModal 关闭申请弹窗', () => {
    it('应该关闭申请弹窗', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleOpenApplyModal();
        result.current.handleCloseApplyModal();
      });

      expect(result.current.applyModalVisible).toBe(false);
    });

    it('应该重置表单', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleOpenApplyModal();
        result.current.handleCloseApplyModal();
      });

      expect(mockForm.resetFields).toHaveBeenCalled();
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useInvoiceList());

      const firstHandle = result.current.handleCloseApplyModal;
      rerender();
      const secondHandle = result.current.handleCloseApplyModal;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleApplyInvoice 申请发票', () => {
    it('申请成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBeGreaterThan(0);
      });

      vi.clearAllMocks();

      const values = {
        billId: 'bill-3',
        title: 'Test Company',
        taxNumber: '123456789',
      };

      await act(async () => {
        await result.current.handleApplyInvoice(values as any);
      });

      expect(message.success).toHaveBeenCalledWith('发票申请已提交，请等待审核');
    });

    it('申请成功应该关闭弹窗', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleOpenApplyModal();
      });

      const values = {
        billId: 'bill-3',
        title: 'Test Company',
        taxNumber: '123456789',
      };

      await act(async () => {
        await result.current.handleApplyInvoice(values as any);
      });

      expect(result.current.applyModalVisible).toBe(false);
    });

    it('申请成功应该重置表单', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBeGreaterThan(0);
      });

      vi.clearAllMocks();

      const values = {
        billId: 'bill-3',
        title: 'Test Company',
        taxNumber: '123456789',
      };

      await act(async () => {
        await result.current.handleApplyInvoice(values as any);
      });

      expect(mockForm.resetFields).toHaveBeenCalled();
    });

    it('申请失败应该显示错误消息', async () => {
      vi.mocked(billingService.applyInvoice).mockRejectedValue(
        new Error('申请失败')
      );

      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBeGreaterThan(0);
      });

      const values = {
        billId: 'bill-3',
        title: 'Test Company',
        taxNumber: '123456789',
      };

      await act(async () => {
        await result.current.handleApplyInvoice(values as any);
      });

      expect(message.error).toHaveBeenCalled();
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useInvoiceList());

      const firstHandle = result.current.handleApplyInvoice;
      rerender();
      const secondHandle = result.current.handleApplyInvoice;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleViewDetail 查看详情', () => {
    it('应该设置selectedInvoice', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleViewDetail(mockInvoices[0]);
      });

      expect(result.current.selectedInvoice).toBe(mockInvoices[0]);
    });

    it('应该打开详情弹窗', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleViewDetail(mockInvoices[0]);
      });

      expect(result.current.detailModalVisible).toBe(true);
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useInvoiceList());

      const firstHandle = result.current.handleViewDetail;
      rerender();
      const secondHandle = result.current.handleViewDetail;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleCloseDetailModal 关闭详情弹窗', () => {
    it('应该关闭详情弹窗', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleViewDetail(mockInvoices[0]);
        result.current.handleCloseDetailModal();
      });

      expect(result.current.detailModalVisible).toBe(false);
    });

    it('应该清空selectedInvoice', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleViewDetail(mockInvoices[0]);
        result.current.handleCloseDetailModal();
      });

      expect(result.current.selectedInvoice).toBeNull();
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useInvoiceList());

      const firstHandle = result.current.handleCloseDetailModal;
      rerender();
      const secondHandle = result.current.handleCloseDetailModal;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handlePageChange 分页变化', () => {
    it('应该更新page和pageSize', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handlePageChange(2, 20);
      });

      expect(result.current.page).toBe(2);
      expect(result.current.pageSize).toBe(20);
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useInvoiceList());

      const firstHandle = result.current.handlePageChange;
      rerender();
      const secondHandle = result.current.handlePageChange;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('columns 表格列配置', () => {
    it('应该定义columns', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBeGreaterThan(0);
      });

      expect(result.current.columns).toBeDefined();
    });

    it('应该使用useMemo缓存', async () => {
      const { result, rerender } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBeGreaterThan(0);
      });

      const firstColumns = result.current.columns;
      rerender();
      const secondColumns = result.current.columns;

      expect(firstColumns).toBe(secondColumns);
    });
  });
});
