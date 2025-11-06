import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBillList } from '../useBillList';
import * as billingService from '@/services/billing';
import * as exportService from '@/services/export';
import { message } from 'antd';
import type { Bill, BillStats } from '@/services/billing';

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
vi.mock('@/services/billing', () => ({
  getBills: vi.fn(),
  getBillStats: vi.fn(),
  payBill: vi.fn(),
  cancelBill: vi.fn(),
  downloadBill: vi.fn(),
  PaymentMethod: {
    BALANCE: 'balance',
    ALIPAY: 'alipay',
    WECHAT: 'wechat',
    PAYPAL: 'paypal',
  },
}));

// Mock export service
vi.mock('@/services/export', () => ({
  triggerDownload: vi.fn(),
}));

// Mock bill table columns
vi.mock('@/utils/billTableColumns', () => ({
  createBillTableColumns: vi.fn(() => []),
}));

describe('useBillList Hook', () => {
  const mockBills: Bill[] = [
    {
      id: '1',
      billNo: 'BILL-001',
      amount: 100,
      status: 'pending',
      createdAt: '2024-01-01T00:00:00Z',
    } as Bill,
    {
      id: '2',
      billNo: 'BILL-002',
      amount: 200,
      status: 'paid',
      createdAt: '2024-01-02T00:00:00Z',
    } as Bill,
  ];

  const mockStats: BillStats = {
    total: 10,
    pending: 3,
    paid: 5,
    cancelled: 2,
    totalAmount: 1000,
    paidAmount: 600,
  } as BillStats;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(billingService.getBills).mockResolvedValue({
      items: mockBills,
      total: 10,
    });
    vi.mocked(billingService.getBillStats).mockResolvedValue(mockStats);
    vi.mocked(billingService.payBill).mockResolvedValue({
      success: true,
    } as any);
    vi.mocked(billingService.cancelBill).mockResolvedValue(undefined as any);
    vi.mocked(billingService.downloadBill).mockResolvedValue(new Blob() as any);
  });

  describe('初始化', () => {
    it('应该初始化所有状态', () => {
      const { result } = renderHook(() => useBillList());
      expect(typeof result.current.loading).toBe('boolean');
      expect(result.current.bills).toEqual([]);
      expect(result.current.stats).toBeNull();
      expect(result.current.total).toBe(0);
      expect(result.current.paymentModalVisible).toBe(false);
      expect(result.current.selectedBill).toBeNull();
      expect(result.current.paymentMethod).toBe('balance');
      expect(result.current.query).toEqual({ page: 1, pageSize: 10 });
    });
  });

  describe('数据加载', () => {
    it('mount时应该加载账单列表', async () => {
      renderHook(() => useBillList());

      await waitFor(() => {
        expect(billingService.getBills).toHaveBeenCalled();
      });
    });

    it('mount时应该加载统计数据', async () => {
      renderHook(() => useBillList());

      await waitFor(() => {
        expect(billingService.getBillStats).toHaveBeenCalled();
      });
    });

    it('加载成功应该更新bills', async () => {
      const { result } = renderHook(() => useBillList());

      await waitFor(() => {
        expect(result.current.bills).toEqual(mockBills);
      });
    });

    it('加载成功应该更新total', async () => {
      const { result } = renderHook(() => useBillList());

      await waitFor(() => {
        expect(result.current.total).toBe(10);
      });
    });

    it('加载成功应该更新stats', async () => {
      const { result } = renderHook(() => useBillList());

      await waitFor(() => {
        expect(result.current.stats).toEqual(mockStats);
      });
    });

    it('加载失败应该显示错误消息', async () => {
      vi.mocked(billingService.getBills).mockRejectedValue(
        new Error('Network error')
      );

      renderHook(() => useBillList());

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('加载账单列表失败');
      });
    });
  });

  describe('handleFilterChange 筛选变化', () => {
    it('应该更新query并重置page', async () => {
      const { result } = renderHook(() => useBillList());

      await waitFor(() => {
        expect(result.current.bills.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleFilterChange('status', 'paid');
      });

      expect(result.current.query.status).toBe('paid');
      expect(result.current.query.page).toBe(1);
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useBillList());

      const firstHandle = result.current.handleFilterChange;
      rerender();
      const secondHandle = result.current.handleFilterChange;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleDateRangeChange 日期范围变化', () => {
    it('有日期时应该更新query', async () => {
      const { result } = renderHook(() => useBillList());

      await waitFor(() => {
        expect(result.current.bills.length).toBeGreaterThan(0);
      });

      const mockDates = [
        { format: vi.fn(() => '2024-01-01') },
        { format: vi.fn(() => '2024-01-31') },
      ];

      act(() => {
        result.current.handleDateRangeChange(mockDates);
      });

      expect(result.current.query.startDate).toBe('2024-01-01');
      expect(result.current.query.endDate).toBe('2024-01-31');
      expect(result.current.query.page).toBe(1);
    });

    it('日期为空时应该清除日期范围', async () => {
      const { result } = renderHook(() => useBillList());

      await waitFor(() => {
        expect(result.current.bills.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleDateRangeChange(null);
      });

      expect(result.current.query.startDate).toBeUndefined();
      expect(result.current.query.endDate).toBeUndefined();
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useBillList());

      const firstHandle = result.current.handleDateRangeChange;
      rerender();
      const secondHandle = result.current.handleDateRangeChange;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('setPaymentModalVisible 设置支付模态框', () => {
    it('应该更新paymentModalVisible', async () => {
      const { result } = renderHook(() => useBillList());

      await waitFor(() => {
        expect(result.current.bills.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.setPaymentModalVisible(true);
      });

      expect(result.current.paymentModalVisible).toBe(true);
    });
  });

  describe('setPaymentMethod 设置支付方式', () => {
    it('应该更新paymentMethod', async () => {
      const { result } = renderHook(() => useBillList());

      await waitFor(() => {
        expect(result.current.bills.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.setPaymentMethod('alipay' as any);
      });

      expect(result.current.paymentMethod).toBe('alipay');
    });
  });

  describe('handleConfirmPay 确认支付', () => {
    it('没有选中账单时不应该执行', async () => {
      const { result } = renderHook(() => useBillList());

      await waitFor(() => {
        expect(result.current.bills.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.handleConfirmPay();
      });

      expect(billingService.payBill).not.toHaveBeenCalled();
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useBillList());

      const firstHandle = result.current.handleConfirmPay;
      rerender();
      const secondHandle = result.current.handleConfirmPay;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleRefresh 刷新', () => {
    it('应该重新加载bills和stats', async () => {
      const { result } = renderHook(() => useBillList());

      await waitFor(() => {
        expect(result.current.bills.length).toBeGreaterThan(0);
      });

      vi.clearAllMocks();

      act(() => {
        result.current.handleRefresh();
      });

      expect(billingService.getBills).toHaveBeenCalled();
      expect(billingService.getBillStats).toHaveBeenCalled();
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useBillList());

      const firstHandle = result.current.handleRefresh;
      rerender();
      const secondHandle = result.current.handleRefresh;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('columns 表格列配置', () => {
    it('应该定义columns', async () => {
      const { result } = renderHook(() => useBillList());

      await waitFor(() => {
        expect(result.current.bills.length).toBeGreaterThan(0);
      });

      expect(result.current.columns).toBeDefined();
    });

    it('应该使用useMemo缓存', async () => {
      const { result, rerender } = renderHook(() => useBillList());

      await waitFor(() => {
        expect(result.current.bills.length).toBeGreaterThan(0);
      });

      const firstColumns = result.current.columns;
      rerender();
      const secondColumns = result.current.columns;

      expect(firstColumns).toBe(secondColumns);
    });
  });
});
