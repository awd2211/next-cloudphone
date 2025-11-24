import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAccountBalance } from '../useAccountBalance';

// Mock data
const mockBalanceInfo = {
  userId: 'test-user',
  availableBalance: 1580.5,
  frozenBalance: 0,
  totalBalance: 1580.5,
  currency: 'CNY',
  lowBalanceThreshold: 100,
  alertEnabled: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-12T00:00:00Z',
};

const mockStats = {
  userId: 'test-user',
  currentBalance: 1580.5,
  yesterdayBalance: 1632.3,
  monthStartBalance: 2050.0,
  monthConsumption: 469.5,
  avgDailyConsumption: 15.65,
  forecastDaysLeft: 101,
  totalRecharge: 5000,
  totalConsume: 3419.5,
  transactionCount: 50,
};

const mockTransactions = {
  data: [
    {
      id: '1',
      userId: 'test-user',
      type: 'consume' as const,
      amount: -51.8,
      balanceBefore: 1632.3,
      balanceAfter: 1580.5,
      description: '设备使用费用',
      status: 'success' as const,
      createdAt: '2025-01-12T10:00:00Z',
    },
    {
      id: '2',
      userId: 'test-user',
      type: 'recharge' as const,
      amount: 100,
      balanceBefore: 1532.3,
      balanceAfter: 1632.3,
      description: '账户充值',
      status: 'success' as const,
      createdAt: '2025-01-11T15:30:00Z',
    },
  ],
  total: 2,
};

// Mock React Query hooks
vi.mock('../queries/useBalance', () => ({
  useUserBalance: vi.fn(),
  useBalanceTransactions: vi.fn(),
  useBalanceStatistics: vi.fn(),
}));

// Mock antd Form
const mockForm = {
  setFieldsValue: vi.fn(),
  validateFields: vi.fn(),
  resetFields: vi.fn(),
  getFieldsValue: vi.fn(),
};

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    Form: {
      useForm: vi.fn(() => [mockForm]),
    },
  };
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'test-user'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAccountBalance Hook (React Query版本)', () => {
  let useUserBalance: any;
  let useBalanceTransactions: any;
  let useBalanceStatistics: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import mocked hooks
    const balanceModule = await import('../queries/useBalance');
    useUserBalance = balanceModule.useUserBalance;
    useBalanceTransactions = balanceModule.useBalanceTransactions;
    useBalanceStatistics = balanceModule.useBalanceStatistics;

    // Setup default mocks
    useUserBalance.mockReturnValue({
      data: mockBalanceInfo,
      isLoading: false,
      refetch: vi.fn(),
    });

    useBalanceTransactions.mockReturnValue({
      data: mockTransactions,
      isLoading: false,
      refetch: vi.fn(),
    });

    useBalanceStatistics.mockReturnValue({
      data: mockStats,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  describe('初始化', () => {
    it('应该初始化loading为false', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('应该初始化alertSettingsVisible为false', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.alertSettingsVisible).toBe(false);
      });
    });

    it('应该初始化balanceData', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.balanceData).toBeDefined();
        expect(result.current.balanceData.current).toBe(1580.5);
        expect(result.current.balanceData.yesterday).toBe(1632.3);
        expect(result.current.balanceData.monthStart).toBe(2050.0);
        expect(result.current.balanceData.monthConsumption).toBe(469.5);
      });
    });

    it('应该初始化balanceTrend数据（31天）', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.balanceTrend).toBeDefined();
        expect(Array.isArray(result.current.balanceTrend)).toBe(true);
        expect(result.current.balanceTrend.length).toBe(31);
      });
    });

    it('balanceTrend应该包含date和balance字段', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const firstItem = result.current.balanceTrend[0];
        expect(firstItem).toHaveProperty('date');
        expect(firstItem).toHaveProperty('balance');
        expect(typeof firstItem.date).toBe('string');
        expect(typeof firstItem.balance).toBe('number');
      });
    });

    it('应该初始化transactions数据', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.transactions).toBeDefined();
        expect(Array.isArray(result.current.transactions)).toBe(true);
        expect(result.current.transactions.length).toBe(2);
      });
    });

    it('transactions应该包含必要字段', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const transaction = result.current.transactions[0];
        expect(transaction).toHaveProperty('id');
        expect(transaction).toHaveProperty('type');
        expect(transaction).toHaveProperty('amount');
        expect(transaction).toHaveProperty('balance');
        expect(transaction).toHaveProperty('description');
        expect(transaction).toHaveProperty('createdAt');
        expect(transaction).toHaveProperty('status');
      });
    });

    it('应该初始化form实例', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.form).toBeDefined();
        expect(result.current.form.setFieldsValue).toBeDefined();
        expect(result.current.form.validateFields).toBeDefined();
      });
    });
  });

  describe('balanceChange 余额变化计算', () => {
    it('应该正确计算余额变化', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const expectedChange = 1580.5 - 1632.3;
        expect(result.current.balanceChange).toBe(expectedChange);
      });
    });

    it('balanceChange应该是负数（余额减少）', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.balanceChange).toBeLessThan(0);
      });
    });
  });

  describe('balanceChangePercent 余额变化百分比', () => {
    it('应该正确计算余额变化百分比', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const change = 1580.5 - 1632.3;
        const expectedPercent = Math.abs((change / 1632.3) * 100).toFixed(2);
        expect(result.current.balanceChangePercent).toBe(expectedPercent);
      });
    });

    it('balanceChangePercent应该是字符串类型', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(typeof result.current.balanceChangePercent).toBe('string');
      });
    });

    it('balanceChangePercent应该使用绝对值', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const percent = parseFloat(result.current.balanceChangePercent);
        expect(percent).toBeGreaterThan(0);
      });
    });
  });

  describe('monthConsumptionPercent 月消费百分比', () => {
    it('应该正确计算月消费百分比', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const expectedPercent = ((469.5 / 2050.0) * 100).toFixed(1);
        expect(result.current.monthConsumptionPercent).toBe(expectedPercent);
      });
    });

    it('monthConsumptionPercent应该是字符串类型', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(typeof result.current.monthConsumptionPercent).toBe('string');
      });
    });

    it('monthConsumptionPercent应该保留一位小数', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const parts = result.current.monthConsumptionPercent.split('.');
        if (parts.length > 1) {
          expect(parts[1].length).toBeLessThanOrEqual(1);
        }
      });
    });
  });

  describe('isLowBalance 余额预警', () => {
    it('应该正确判断是否低余额', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const expected = 1580.5 < 100;
        expect(result.current.isLowBalance).toBe(expected);
      });
    });

    it('当前余额高于阈值时应该返回false', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLowBalance).toBe(false);
      });
    });
  });

  describe('columns 表格列定义', () => {
    it('应该定义columns', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.columns).toBeDefined();
        expect(Array.isArray(result.current.columns)).toBe(true);
      });
    });

    it('应该有6列', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.columns.length).toBe(6);
      });
    });

    it('应该包含必要的列', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const columnKeys = result.current.columns.map((col: any) => col.key);
        expect(columnKeys).toContain('createdAt');
        expect(columnKeys).toContain('type');
        expect(columnKeys).toContain('description');
        expect(columnKeys).toContain('amount');
        expect(columnKeys).toContain('balance');
        expect(columnKeys).toContain('status');
      });
    });

    it('每列应该有title', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        result.current.columns.forEach((col: any) => {
          expect(col.title).toBeDefined();
          expect(typeof col.title).toBe('string');
        });
      });
    });

    it('createdAt列应该有render函数', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const createdAtCol = result.current.columns.find((col: any) => col.key === 'createdAt');
        expect(createdAtCol?.render).toBeDefined();
      });
    });

    it('type列应该有render函数', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const typeCol = result.current.columns.find((col: any) => col.key === 'type');
        expect(typeCol?.render).toBeDefined();
      });
    });

    it('amount列应该有render函数', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const amountCol = result.current.columns.find((col: any) => col.key === 'amount');
        expect(amountCol?.render).toBeDefined();
      });
    });

    it('balance列应该有render函数', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const balanceCol = result.current.columns.find((col: any) => col.key === 'balance');
        expect(balanceCol?.render).toBeDefined();
      });
    });

    it('status列应该有render函数', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const statusCol = result.current.columns.find((col: any) => col.key === 'status');
        expect(statusCol?.render).toBeDefined();
      });
    });

    it('amount列应该右对齐', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const amountCol = result.current.columns.find((col: any) => col.key === 'amount');
        expect(amountCol?.align).toBe('right');
      });
    });

    it('balance列应该右对齐', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        const balanceCol = result.current.columns.find((col: any) => col.key === 'balance');
        expect(balanceCol?.align).toBe('right');
      });
    });
  });

  describe('lineChartConfig 图表配置', () => {
    it('应该定义lineChartConfig', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.lineChartConfig).toBeDefined();
      });
    });

    it('应该包含data字段', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.lineChartConfig.data).toBeDefined();
        expect(result.current.lineChartConfig.data).toBe(result.current.balanceTrend);
      });
    });

    it('应该设置xField为date', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.lineChartConfig.xField).toBe('date');
      });
    });

    it('应该设置yField为balance', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.lineChartConfig.yField).toBe('balance');
      });
    });

    it('应该设置smooth为true', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.lineChartConfig.smooth).toBe(true);
      });
    });

    it('应该设置height', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.lineChartConfig.height).toBe(300);
      });
    });

    it('应该设置xAxis配置', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.lineChartConfig.xAxis).toBeDefined();
        expect(result.current.lineChartConfig.xAxis.type).toBe('time');
        expect(result.current.lineChartConfig.xAxis.label).toBeDefined();
      });
    });

    it('应该设置yAxis配置', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.lineChartConfig.yAxis).toBeDefined();
        expect(result.current.lineChartConfig.yAxis.label).toBeDefined();
      });
    });

    it('应该设置tooltip配置', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.lineChartConfig.tooltip).toBeDefined();
        expect(result.current.lineChartConfig.tooltip.formatter).toBeDefined();
      });
    });

    it('应该设置point配置', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.lineChartConfig.point).toBeDefined();
        expect(result.current.lineChartConfig.point.size).toBe(3);
        expect(result.current.lineChartConfig.point.shape).toBe('circle');
      });
    });

    it('应该设置color', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.lineChartConfig.color).toBe('#1677ff');
      });
    });

    it('应该设置areaStyle', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.lineChartConfig.areaStyle).toBeDefined();
        expect(result.current.lineChartConfig.areaStyle.fillOpacity).toBe(0.3);
      });
    });
  });

  describe('handleRefresh 刷新数据', () => {
    it('应该调用所有refetch函数', async () => {
      const mockRefetchBalance = vi.fn();
      const mockRefetchTransactions = vi.fn();
      const mockRefetchStats = vi.fn();

      useUserBalance.mockReturnValue({
        data: mockBalanceInfo,
        isLoading: false,
        refetch: mockRefetchBalance,
      });

      useBalanceTransactions.mockReturnValue({
        data: mockTransactions,
        isLoading: false,
        refetch: mockRefetchTransactions,
      });

      useBalanceStatistics.mockReturnValue({
        data: mockStats,
        isLoading: false,
        refetch: mockRefetchStats,
      });

      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.handleRefresh).toBeDefined();
      });

      await result.current.handleRefresh();

      expect(mockRefetchBalance).toHaveBeenCalled();
      expect(mockRefetchTransactions).toHaveBeenCalled();
      expect(mockRefetchStats).toHaveBeenCalled();
    });

    it('handleRefresh应该是稳定的函数引用', async () => {
      const { result, rerender } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.handleRefresh).toBeDefined();
      });

      const firstHandleRefresh = result.current.handleRefresh;
      rerender();
      const secondHandleRefresh = result.current.handleRefresh;

      expect(firstHandleRefresh).toBe(secondHandleRefresh);
    });
  });

  describe('handleOpenAlertSettings 打开预警设置', () => {
    it('应该设置表单值', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.handleOpenAlertSettings).toBeDefined();
      });

      result.current.handleOpenAlertSettings();

      expect(mockForm.setFieldsValue).toHaveBeenCalledWith({
        enabled: true,
        threshold: 100,
        notifyMethod: ['email', 'sms'],
      });
    });

    it('应该打开预警设置模态框', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.handleOpenAlertSettings).toBeDefined();
      });

      result.current.handleOpenAlertSettings();

      await waitFor(() => {
        expect(result.current.alertSettingsVisible).toBe(true);
      });
    });
  });

  describe('handleSaveAlertSettings 保存预警设置', () => {
    it('验证成功应该关闭模态框', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      mockForm.validateFields.mockResolvedValue({
        enabled: true,
        threshold: 200,
        notifyMethod: ['email'],
      });

      await waitFor(() => {
        expect(result.current.handleSaveAlertSettings).toBeDefined();
      });

      await result.current.handleSaveAlertSettings();

      await waitFor(() => {
        expect(result.current.alertSettingsVisible).toBe(false);
      });
    });

    it('验证失败不应该关闭模态框', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.handleOpenAlertSettings).toBeDefined();
      });

      // 先打开模态框
      result.current.handleOpenAlertSettings();

      await waitFor(() => {
        expect(result.current.alertSettingsVisible).toBe(true);
      });

      mockForm.validateFields.mockRejectedValue(new Error('Validation failed'));

      try {
        await result.current.handleSaveAlertSettings();
      } catch {
        // Ignore error
      }

      await waitFor(() => {
        expect(result.current.alertSettingsVisible).toBe(true);
      });
    });

    it('应该调用form.validateFields', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      mockForm.validateFields.mockResolvedValue({});

      await waitFor(() => {
        expect(result.current.handleSaveAlertSettings).toBeDefined();
      });

      await result.current.handleSaveAlertSettings();

      expect(mockForm.validateFields).toHaveBeenCalled();
    });
  });

  describe('handleCloseAlertSettings 关闭预警设置', () => {
    it('应该关闭预警设置模态框', async () => {
      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.handleOpenAlertSettings).toBeDefined();
      });

      // 先打开模态框
      result.current.handleOpenAlertSettings();

      await waitFor(() => {
        expect(result.current.alertSettingsVisible).toBe(true);
      });

      // 关闭模态框
      result.current.handleCloseAlertSettings();

      await waitFor(() => {
        expect(result.current.alertSettingsVisible).toBe(false);
      });
    });

    it('handleCloseAlertSettings应该是稳定的函数引用', async () => {
      const { result, rerender } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.handleCloseAlertSettings).toBeDefined();
      });

      const firstHandle = result.current.handleCloseAlertSettings;
      rerender();
      const secondHandle = result.current.handleCloseAlertSettings;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('useMemo 优化验证', () => {
    it('balanceChange应该使用useMemo', async () => {
      const { result, rerender } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.balanceChange).toBeDefined();
      });

      const firstValue = result.current.balanceChange;
      rerender();
      const secondValue = result.current.balanceChange;

      expect(firstValue).toBe(secondValue);
    });

    it('balanceChangePercent应该使用useMemo', async () => {
      const { result, rerender } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.balanceChangePercent).toBeDefined();
      });

      const firstValue = result.current.balanceChangePercent;
      rerender();
      const secondValue = result.current.balanceChangePercent;

      expect(firstValue).toBe(secondValue);
    });

    it('monthConsumptionPercent应该使用useMemo', async () => {
      const { result, rerender } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.monthConsumptionPercent).toBeDefined();
      });

      const firstValue = result.current.monthConsumptionPercent;
      rerender();
      const secondValue = result.current.monthConsumptionPercent;

      expect(firstValue).toBe(secondValue);
    });

    it('isLowBalance应该使用useMemo', async () => {
      const { result, rerender } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLowBalance).toBeDefined();
      });

      const firstValue = result.current.isLowBalance;
      rerender();
      const secondValue = result.current.isLowBalance;

      expect(firstValue).toBe(secondValue);
    });

    it('columns应该使用useMemo', async () => {
      const { result, rerender } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.columns).toBeDefined();
      });

      const firstValue = result.current.columns;
      rerender();
      const secondValue = result.current.columns;

      expect(firstValue).toBe(secondValue);
    });

    it('lineChartConfig应该使用useMemo', async () => {
      const { result, rerender } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.lineChartConfig).toBeDefined();
      });

      const firstValue = result.current.lineChartConfig;
      rerender();
      const secondValue = result.current.lineChartConfig;

      expect(firstValue).toBe(secondValue);
    });
  });

  describe('Loading状态处理', () => {
    it('当任一query loading时应该显示loading', async () => {
      useUserBalance.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });
    });

    it('所有query加载完成后应该不显示loading', async () => {
      useUserBalance.mockReturnValue({
        data: mockBalanceInfo,
        isLoading: false,
        refetch: vi.fn(),
      });

      useBalanceTransactions.mockReturnValue({
        data: mockTransactions,
        isLoading: false,
        refetch: vi.fn(),
      });

      useBalanceStatistics.mockReturnValue({
        data: mockStats,
        isLoading: false,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('数据为空时的默认值', () => {
    it('当balanceInfo和stats为空时应该返回默认值', async () => {
      useUserBalance.mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
      });

      useBalanceTransactions.mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
      });

      useBalanceStatistics.mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useAccountBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.balanceData.current).toBe(0);
        expect(result.current.balanceData.yesterday).toBe(0);
        expect(result.current.balanceData.monthStart).toBe(0);
        expect(result.current.balanceData.lowBalanceThreshold).toBe(100);
        expect(result.current.balanceData.alertEnabled).toBe(true);
        expect(result.current.transactions).toEqual([]);
      });
    });
  });
});
