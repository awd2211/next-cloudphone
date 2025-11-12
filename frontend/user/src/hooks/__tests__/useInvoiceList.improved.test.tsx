/**
 * 改进版测试示例 - 展示如何编写更有价值的测试
 *
 * 改进点：
 * 1. 测试边界条件和错误场景
 * 2. 测试业务逻辑而不只是函数调用
 * 3. 测试复杂的状态转换
 * 4. 测试竞态条件
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInvoiceList } from '../useInvoiceList';
import * as billingService from '@/services/billing';

vi.mock('@/services/billing');
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    Form: { useForm: vi.fn(() => [{ resetFields: vi.fn() }]) },
    message: { success: vi.fn(), error: vi.fn() },
  };
});
vi.mock('@/utils/invoiceTableColumns', () => ({
  createInvoiceTableColumns: vi.fn(() => []),
}));

describe('useInvoiceList - 改进版测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(billingService.getInvoices).mockResolvedValue({
      items: [],
      total: 0,
    });
    vi.mocked(billingService.getBills).mockResolvedValue({
      items: [],
      total: 0,
    });
  });

  describe('边界条件测试', () => {
    it('空数据时应该正常工作', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.invoices).toEqual([]);
      expect(result.current.total).toBe(0);
    });

    it('大量数据时应该正确分页', async () => {
      vi.mocked(billingService.getInvoices).mockResolvedValue({
        items: Array(100).fill(null).map((_, i) => ({
          id: `${i}`,
          invoiceNo: `INV-${i}`,
        })) as any,
        total: 1000,
      });

      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBe(100);
      });

      expect(result.current.total).toBe(1000);
    });

    it('网络错误后重试应该成功', async () => {
      let callCount = 0;
      vi.mocked(billingService.getInvoices).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ items: [], total: 0 });
      });

      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 重试 - 改变分页参数触发新请求
      await act(async () => {
        result.current.handlePageChange(2, 10);
      });

      await waitFor(
        () => {
          expect(callCount).toBe(2);
          expect(result.current.invoices).toEqual([]);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('竞态条件测试', () => {
    // ✅ 已修复：hook现在使用requestId tracking防止竞态条件
    it('快速翻页时应该只显示最后一次请求的结果', async () => {
      let resolveFirst: any;
      let resolveSecond: any;

      const firstPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise((resolve) => {
        resolveSecond = resolve;
      });

      let callCount = 0;
      vi.mocked(billingService.getInvoices).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? firstPromise as any : secondPromise as any;
      });

      const { result } = renderHook(() => useInvoiceList());

      // 第一次请求
      await waitFor(
        () => {
          expect(billingService.getInvoices).toHaveBeenCalledTimes(1);
        },
        { timeout: 3000 }
      );

      // 快速发起第二次请求（第一次还没完成）
      await act(async () => {
        result.current.handlePageChange(2, 10);
      });

      await waitFor(
        () => {
          expect(billingService.getInvoices).toHaveBeenCalledTimes(2);
        },
        { timeout: 3000 }
      );

      // 第二次请求先返回
      act(() => {
        resolveSecond({ items: [{ id: '2', invoiceNo: 'INV-002' }], total: 1 });
      });

      await waitFor(
        () => {
          expect(result.current.invoices).toEqual([
            { id: '2', invoiceNo: 'INV-002' },
          ]);
        },
        { timeout: 3000 }
      );

      // 第一次请求后返回（应该被忽略）
      act(() => {
        resolveFirst({ items: [{ id: '1', invoiceNo: 'INV-001' }], total: 1 });
      });

      // 等待一下，确保状态没有被第一次请求覆盖
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 问题：当前实现可能会被第一次请求覆盖！
      // 这个测试会暴露竞态条件的 bug
      expect(result.current.invoices).toEqual([
        { id: '2', invoiceNo: 'INV-002' },
      ]);
    });
  });

  describe('业务逻辑测试', () => {
    it('申请发票时应该过滤掉已有发票的账单', async () => {
      const invoices = [
        { id: '1', billId: 'bill-1', invoiceNo: 'INV-001' },
        { id: '2', billId: 'bill-2', invoiceNo: 'INV-002' },
      ];

      const bills = [
        { id: 'bill-1', billNo: 'BILL-001', status: 'paid' },
        { id: 'bill-2', billNo: 'BILL-002', status: 'paid' },
        { id: 'bill-3', billNo: 'BILL-003', status: 'paid' },
      ];

      vi.mocked(billingService.getInvoices).mockResolvedValue({
        items: invoices as any,
        total: 2,
      });

      vi.mocked(billingService.getBills).mockResolvedValue({
        items: bills as any,
        total: 3,
      });

      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.invoices.length).toBe(2);
      });

      act(() => {
        result.current.handleOpenApplyModal();
      });

      await waitFor(() => {
        // 关键断言：只应该显示 bill-3，因为 bill-1 和 bill-2 已经有发票了
        expect(result.current.bills).toEqual([
          { id: 'bill-3', billNo: 'BILL-003', status: 'paid' },
        ]);
      });
    });

    it('分页参数变化应该正确传递到 API', async () => {
      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handlePageChange(3, 20);
      });

      await waitFor(() => {
        expect(billingService.getInvoices).toHaveBeenLastCalledWith({
          page: 3,
          pageSize: 20,
        });
      });
    });
  });

  describe('状态一致性测试', () => {
    it('加载过程中 loading 状态应该正确', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(billingService.getInvoices).mockReturnValue(promise as any);

      const { result } = renderHook(() => useInvoiceList());

      // 初始可能是 false 或 true（取决于执行时机）
      const initialLoading = result.current.loading;

      // 等待状态稳定到 true
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // 完成请求
      resolvePromise({ items: [], total: 0 });

      // loading 应该变回 false
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('连续操作时状态应该保持一致', async () => {
      vi.mocked(billingService.getInvoices).mockResolvedValue({
        items: [],
        total: 0,
      });

      const { result } = renderHook(() => useInvoiceList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 打开弹窗
      act(() => {
        result.current.handleOpenApplyModal();
      });
      expect(result.current.applyModalVisible).toBe(true);

      // 关闭弹窗
      act(() => {
        result.current.handleCloseApplyModal();
      });
      expect(result.current.applyModalVisible).toBe(false);

      // 再次打开
      act(() => {
        result.current.handleOpenApplyModal();
      });
      expect(result.current.applyModalVisible).toBe(true);
    });
  });

  describe('错误恢复测试', () => {
    it('多次错误后仍然可以正常使用', async () => {
      let callCount = 0;
      vi.mocked(billingService.getInvoices).mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.reject(new Error('Error'));
        }
        return Promise.resolve({ items: [], total: 0 });
      });

      const { result } = renderHook(() => useInvoiceList());

      // 第一次失败
      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 3000 }
      );

      // 重试 - 切换到第2页
      await act(async () => {
        result.current.handlePageChange(2, 10);
      });

      await waitFor(
        () => {
          expect(callCount).toBe(2);
        },
        { timeout: 3000 }
      );

      // 再次重试 - 切换到第3页
      await act(async () => {
        result.current.handlePageChange(3, 10);
      });

      await waitFor(
        () => {
          expect(callCount).toBe(3);
        },
        { timeout: 3000 }
      );

      // 最后一次应该成功 - 切换到第4页
      await act(async () => {
        result.current.handlePageChange(4, 10);
      });

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
          expect(callCount).toBe(4);
        },
        { timeout: 3000 }
      );
    });
  });
});
