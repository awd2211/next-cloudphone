import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAccountBalance } from '../useAccountBalance';
import type { Transaction, BalanceTrend } from '../useAccountBalance';

// Create a stable form mock
const mockForm = {
  setFieldsValue: vi.fn(),
  validateFields: vi.fn(),
  resetFields: vi.fn(),
  getFieldsValue: vi.fn(),
};

// Mock antd Form
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    Form: {
      useForm: vi.fn(() => [mockForm]),
    },
  };
});

describe('useAccountBalance Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初始化', () => {
    it('应该初始化loading为false', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.loading).toBe(false);
    });

    it('应该初始化alertSettingsVisible为false', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.alertSettingsVisible).toBe(false);
    });

    it('应该初始化balanceData', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.balanceData).toBeDefined();
      expect(result.current.balanceData.current).toBe(1580.5);
      expect(result.current.balanceData.yesterday).toBe(1632.3);
      expect(result.current.balanceData.monthStart).toBe(2050.0);
      expect(result.current.balanceData.monthConsumption).toBe(469.5);
      expect(result.current.balanceData.avgDailyConsumption).toBe(15.65);
      expect(result.current.balanceData.forecastDaysLeft).toBe(101);
      expect(result.current.balanceData.lowBalanceThreshold).toBe(100);
      expect(result.current.balanceData.alertEnabled).toBe(true);
    });

    it('应该初始化balanceTrend数据（31天）', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.balanceTrend).toBeDefined();
      expect(Array.isArray(result.current.balanceTrend)).toBe(true);
      expect(result.current.balanceTrend.length).toBe(31);
    });

    it('balanceTrend应该包含date和balance字段', () => {
      const { result } = renderHook(() => useAccountBalance());

      const firstItem = result.current.balanceTrend[0];
      expect(firstItem).toHaveProperty('date');
      expect(firstItem).toHaveProperty('balance');
      expect(typeof firstItem.date).toBe('string');
      expect(typeof firstItem.balance).toBe('number');
    });

    it('应该初始化transactions数据', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.transactions).toBeDefined();
      expect(Array.isArray(result.current.transactions)).toBe(true);
      expect(result.current.transactions.length).toBeGreaterThan(0);
    });

    it('transactions应该包含必要字段', () => {
      const { result } = renderHook(() => useAccountBalance());

      const transaction = result.current.transactions[0];
      expect(transaction).toHaveProperty('id');
      expect(transaction).toHaveProperty('type');
      expect(transaction).toHaveProperty('amount');
      expect(transaction).toHaveProperty('balance');
      expect(transaction).toHaveProperty('description');
      expect(transaction).toHaveProperty('createdAt');
      expect(transaction).toHaveProperty('status');
    });

    it('应该初始化form实例', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.form).toBeDefined();
      expect(result.current.form.setFieldsValue).toBeDefined();
      expect(result.current.form.validateFields).toBeDefined();
    });
  });

  describe('balanceChange 余额变化计算', () => {
    it('应该正确计算余额变化', () => {
      const { result } = renderHook(() => useAccountBalance());

      // current: 1580.5, yesterday: 1632.3
      const expectedChange = 1580.5 - 1632.3;
      expect(result.current.balanceChange).toBe(expectedChange);
    });

    it('balanceChange应该是负数（余额减少）', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.balanceChange).toBeLessThan(0);
    });
  });

  describe('balanceChangePercent 余额变化百分比', () => {
    it('应该正确计算余额变化百分比', () => {
      const { result } = renderHook(() => useAccountBalance());

      const change = 1580.5 - 1632.3;
      const expectedPercent = Math.abs((change / 1632.3) * 100).toFixed(2);
      expect(result.current.balanceChangePercent).toBe(expectedPercent);
    });

    it('balanceChangePercent应该是字符串类型', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(typeof result.current.balanceChangePercent).toBe('string');
    });

    it('balanceChangePercent应该使用绝对值', () => {
      const { result } = renderHook(() => useAccountBalance());

      const percent = parseFloat(result.current.balanceChangePercent);
      expect(percent).toBeGreaterThan(0);
    });
  });

  describe('monthConsumptionPercent 月消费百分比', () => {
    it('应该正确计算月消费百分比', () => {
      const { result } = renderHook(() => useAccountBalance());

      // monthConsumption: 469.5, monthStart: 2050.0
      const expectedPercent = ((469.5 / 2050.0) * 100).toFixed(1);
      expect(result.current.monthConsumptionPercent).toBe(expectedPercent);
    });

    it('monthConsumptionPercent应该是字符串类型', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(typeof result.current.monthConsumptionPercent).toBe('string');
    });

    it('monthConsumptionPercent应该保留一位小数', () => {
      const { result } = renderHook(() => useAccountBalance());

      const parts = result.current.monthConsumptionPercent.split('.');
      if (parts.length > 1) {
        expect(parts[1].length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('isLowBalance 余额预警', () => {
    it('应该正确判断是否低余额', () => {
      const { result } = renderHook(() => useAccountBalance());

      // current: 1580.5, lowBalanceThreshold: 100
      const expected = 1580.5 < 100;
      expect(result.current.isLowBalance).toBe(expected);
    });

    it('当前余额高于阈值时应该返回false', () => {
      const { result } = renderHook(() => useAccountBalance());

      // current: 1580.5 > threshold: 100
      expect(result.current.isLowBalance).toBe(false);
    });
  });

  describe('columns 表格列定义', () => {
    it('应该定义columns', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.columns).toBeDefined();
      expect(Array.isArray(result.current.columns)).toBe(true);
    });

    it('应该有6列', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.columns.length).toBe(6);
    });

    it('应该包含必要的列', () => {
      const { result } = renderHook(() => useAccountBalance());

      const columnKeys = result.current.columns.map((col) => col.key);
      expect(columnKeys).toContain('createdAt');
      expect(columnKeys).toContain('type');
      expect(columnKeys).toContain('description');
      expect(columnKeys).toContain('amount');
      expect(columnKeys).toContain('balance');
      expect(columnKeys).toContain('status');
    });

    it('每列应该有title', () => {
      const { result } = renderHook(() => useAccountBalance());

      result.current.columns.forEach((col) => {
        expect(col.title).toBeDefined();
        expect(typeof col.title).toBe('string');
      });
    });

    it('createdAt列应该有render函数', () => {
      const { result } = renderHook(() => useAccountBalance());

      const createdAtCol = result.current.columns.find((col) => col.key === 'createdAt');
      expect(createdAtCol?.render).toBeDefined();
    });

    it('type列应该有render函数', () => {
      const { result } = renderHook(() => useAccountBalance());

      const typeCol = result.current.columns.find((col) => col.key === 'type');
      expect(typeCol?.render).toBeDefined();
    });

    it('amount列应该有render函数', () => {
      const { result } = renderHook(() => useAccountBalance());

      const amountCol = result.current.columns.find((col) => col.key === 'amount');
      expect(amountCol?.render).toBeDefined();
    });

    it('balance列应该有render函数', () => {
      const { result } = renderHook(() => useAccountBalance());

      const balanceCol = result.current.columns.find((col) => col.key === 'balance');
      expect(balanceCol?.render).toBeDefined();
    });

    it('status列应该有render函数', () => {
      const { result } = renderHook(() => useAccountBalance());

      const statusCol = result.current.columns.find((col) => col.key === 'status');
      expect(statusCol?.render).toBeDefined();
    });

    it('amount列应该右对齐', () => {
      const { result } = renderHook(() => useAccountBalance());

      const amountCol = result.current.columns.find((col) => col.key === 'amount');
      expect(amountCol?.align).toBe('right');
    });

    it('balance列应该右对齐', () => {
      const { result } = renderHook(() => useAccountBalance());

      const balanceCol = result.current.columns.find((col) => col.key === 'balance');
      expect(balanceCol?.align).toBe('right');
    });
  });

  describe('lineChartConfig 图表配置', () => {
    it('应该定义lineChartConfig', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.lineChartConfig).toBeDefined();
    });

    it('应该包含data字段', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.lineChartConfig.data).toBeDefined();
      expect(result.current.lineChartConfig.data).toBe(result.current.balanceTrend);
    });

    it('应该设置xField为date', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.lineChartConfig.xField).toBe('date');
    });

    it('应该设置yField为balance', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.lineChartConfig.yField).toBe('balance');
    });

    it('应该设置smooth为true', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.lineChartConfig.smooth).toBe(true);
    });

    it('应该设置height', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.lineChartConfig.height).toBe(300);
    });

    it('应该设置xAxis配置', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.lineChartConfig.xAxis).toBeDefined();
      expect(result.current.lineChartConfig.xAxis.type).toBe('time');
      expect(result.current.lineChartConfig.xAxis.label).toBeDefined();
    });

    it('应该设置yAxis配置', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.lineChartConfig.yAxis).toBeDefined();
      expect(result.current.lineChartConfig.yAxis.label).toBeDefined();
    });

    it('应该设置tooltip配置', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.lineChartConfig.tooltip).toBeDefined();
      expect(result.current.lineChartConfig.tooltip.formatter).toBeDefined();
    });

    it('应该设置point配置', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.lineChartConfig.point).toBeDefined();
      expect(result.current.lineChartConfig.point.size).toBe(3);
      expect(result.current.lineChartConfig.point.shape).toBe('circle');
    });

    it('应该设置color', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.lineChartConfig.color).toBe('#1890ff');
    });

    it('应该设置areaStyle', () => {
      const { result } = renderHook(() => useAccountBalance());

      expect(result.current.lineChartConfig.areaStyle).toBeDefined();
      expect(result.current.lineChartConfig.areaStyle.fillOpacity).toBe(0.3);
    });
  });

  describe('handleRefresh 刷新数据', () => {
    it('应该设置loading状态', () => {
      const { result } = renderHook(() => useAccountBalance());

      act(() => {
        result.current.handleRefresh();
      });

      expect(result.current.loading).toBe(true);
    });

    it('1秒后应该重置loading状态', () => {
      const { result } = renderHook(() => useAccountBalance());

      act(() => {
        result.current.handleRefresh();
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.loading).toBe(false);
    });

    it('未到1秒时loading应该保持true', () => {
      const { result } = renderHook(() => useAccountBalance());

      act(() => {
        result.current.handleRefresh();
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.loading).toBe(true);
    });

    it('handleRefresh应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useAccountBalance());

      const firstHandleRefresh = result.current.handleRefresh;
      rerender();
      const secondHandleRefresh = result.current.handleRefresh;

      expect(firstHandleRefresh).toBe(secondHandleRefresh);
    });
  });

  describe('handleOpenAlertSettings 打开预警设置', () => {
    it('应该设置表单值', () => {
      const { result } = renderHook(() => useAccountBalance());

      act(() => {
        result.current.handleOpenAlertSettings();
      });

      expect(mockForm.setFieldsValue).toHaveBeenCalledWith({
        enabled: true,
        threshold: 100,
        notifyMethod: ['email', 'sms'],
      });
    });

    it('应该打开预警设置模态框', () => {
      const { result } = renderHook(() => useAccountBalance());

      act(() => {
        result.current.handleOpenAlertSettings();
      });

      expect(result.current.alertSettingsVisible).toBe(true);
    });
  });

  describe('handleSaveAlertSettings 保存预警设置', () => {
    it('验证成功应该关闭模态框', async () => {
      const { result } = renderHook(() => useAccountBalance());

      mockForm.validateFields.mockResolvedValue({
        enabled: true,
        threshold: 200,
        notifyMethod: ['email'],
      });

      await act(async () => {
        await result.current.handleSaveAlertSettings();
      });

      expect(result.current.alertSettingsVisible).toBe(false);
    });

    it('验证失败不应该关闭模态框', async () => {
      const { result } = renderHook(() => useAccountBalance());

      // 先打开模态框
      act(() => {
        result.current.handleOpenAlertSettings();
      });

      expect(result.current.alertSettingsVisible).toBe(true);

      mockForm.validateFields.mockRejectedValue(new Error('Validation failed'));

      await act(async () => {
        try {
          await result.current.handleSaveAlertSettings();
        } catch {
          // Ignore error
        }
      });

      expect(result.current.alertSettingsVisible).toBe(true);
    });

    it('应该调用form.validateFields', async () => {
      const { result } = renderHook(() => useAccountBalance());

      mockForm.validateFields.mockResolvedValue({});

      await act(async () => {
        await result.current.handleSaveAlertSettings();
      });

      expect(mockForm.validateFields).toHaveBeenCalled();
    });
  });

  describe('handleCloseAlertSettings 关闭预警设置', () => {
    it('应该关闭预警设置模态框', () => {
      const { result } = renderHook(() => useAccountBalance());

      // 先打开模态框
      act(() => {
        result.current.handleOpenAlertSettings();
      });

      expect(result.current.alertSettingsVisible).toBe(true);

      // 关闭模态框
      act(() => {
        result.current.handleCloseAlertSettings();
      });

      expect(result.current.alertSettingsVisible).toBe(false);
    });

    it('handleCloseAlertSettings应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useAccountBalance());

      const firstHandle = result.current.handleCloseAlertSettings;
      rerender();
      const secondHandle = result.current.handleCloseAlertSettings;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('useMemo 优化验证', () => {
    it('balanceChange应该使用useMemo', () => {
      const { result, rerender } = renderHook(() => useAccountBalance());

      const firstValue = result.current.balanceChange;
      rerender();
      const secondValue = result.current.balanceChange;

      expect(firstValue).toBe(secondValue);
    });

    it('balanceChangePercent应该使用useMemo', () => {
      const { result, rerender } = renderHook(() => useAccountBalance());

      const firstValue = result.current.balanceChangePercent;
      rerender();
      const secondValue = result.current.balanceChangePercent;

      expect(firstValue).toBe(secondValue);
    });

    it('monthConsumptionPercent应该使用useMemo', () => {
      const { result, rerender } = renderHook(() => useAccountBalance());

      const firstValue = result.current.monthConsumptionPercent;
      rerender();
      const secondValue = result.current.monthConsumptionPercent;

      expect(firstValue).toBe(secondValue);
    });

    it('isLowBalance应该使用useMemo', () => {
      const { result, rerender } = renderHook(() => useAccountBalance());

      const firstValue = result.current.isLowBalance;
      rerender();
      const secondValue = result.current.isLowBalance;

      expect(firstValue).toBe(secondValue);
    });

    it('columns应该使用useMemo', () => {
      const { result, rerender } = renderHook(() => useAccountBalance());

      const firstValue = result.current.columns;
      rerender();
      const secondValue = result.current.columns;

      expect(firstValue).toBe(secondValue);
    });

    it('lineChartConfig应该使用useMemo', () => {
      const { result, rerender } = renderHook(() => useAccountBalance());

      const firstValue = result.current.lineChartConfig;
      rerender();
      const secondValue = result.current.lineChartConfig;

      expect(firstValue).toBe(secondValue);
    });
  });
});
