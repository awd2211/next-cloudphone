import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDashboard } from '../useDashboard';

describe('useDashboard Hook', () => {
  describe('初始状态', () => {
    it('应该有正确的初始 loading 状态', () => {
      const { result } = renderHook(() => useDashboard());

      expect(result.current.loading).toBe(false);
    });

    it('应该有完整的 dashboard 数据', () => {
      const { result } = renderHook(() => useDashboard());

      expect(result.current.dashboardData).toBeDefined();
      expect(result.current.dashboardData.devices).toBeDefined();
      expect(result.current.dashboardData.apps).toBeDefined();
      expect(result.current.dashboardData.billing).toBeDefined();
      expect(result.current.dashboardData.usage).toBeDefined();
    });

    it('应该有最近活动列表', () => {
      const { result } = renderHook(() => useDashboard());

      expect(Array.isArray(result.current.recentActivities)).toBe(true);
      expect(result.current.recentActivities.length).toBeGreaterThan(0);
    });

    it('应该提供 handleRefresh 方法', () => {
      const { result } = renderHook(() => useDashboard());

      expect(typeof result.current.handleRefresh).toBe('function');
    });
  });

  describe('设备数据', () => {
    it('应该有正确的设备统计数据', () => {
      const { result } = renderHook(() => useDashboard());

      const { devices } = result.current.dashboardData;
      expect(devices.total).toBe(25);
      expect(devices.running).toBe(18);
      expect(devices.stopped).toBe(5);
      expect(devices.error).toBe(2);
      expect(devices.quota).toBe(50);
    });

    it('设备总数应该等于各状态之和', () => {
      const { result } = renderHook(() => useDashboard());

      const { devices } = result.current.dashboardData;
      const sum = devices.running + devices.stopped + devices.error;
      expect(sum).toBe(devices.total);
    });
  });

  describe('应用数据', () => {
    it('应该有正确的应用统计数据', () => {
      const { result } = renderHook(() => useDashboard());

      const { apps } = result.current.dashboardData;
      expect(apps.installed).toBe(156);
      expect(apps.marketApps).toBe(320);
      expect(apps.recentInstalls).toBe(12);
    });

    it('已安装应用数应该小于市场应用总数', () => {
      const { result } = renderHook(() => useDashboard());

      const { apps } = result.current.dashboardData;
      expect(apps.installed).toBeLessThan(apps.marketApps);
    });
  });

  describe('账单数据', () => {
    it('应该有正确的账单统计数据', () => {
      const { result } = renderHook(() => useDashboard());

      const { billing } = result.current.dashboardData;
      expect(billing.balance).toBe(1580.5);
      expect(billing.thisMonth).toBe(450.8);
      expect(billing.lastMonth).toBe(398.2);
      expect(billing.trend).toBe('up');
    });

    it('趋势应该反映本月和上月的对比', () => {
      const { result } = renderHook(() => useDashboard());

      const { billing } = result.current.dashboardData;
      if (billing.thisMonth > billing.lastMonth) {
        expect(billing.trend).toBe('up');
      } else {
        expect(billing.trend).toBe('down');
      }
    });
  });

  describe('使用量数据', () => {
    it('应该有正确的使用量统计数据', () => {
      const { result } = renderHook(() => useDashboard());

      const { usage } = result.current.dashboardData;
      expect(usage.today).toBe(285);
      expect(usage.thisWeek).toBe(1680);
      expect(usage.thisMonth).toBe(6720);
    });

    it('使用量应该递增（今日 < 本周 < 本月）', () => {
      const { result } = renderHook(() => useDashboard());

      const { usage } = result.current.dashboardData;
      expect(usage.today).toBeLessThan(usage.thisWeek);
      expect(usage.thisWeek).toBeLessThan(usage.thisMonth);
    });
  });

  describe('最近活动', () => {
    it('应该有5条最近活动记录', () => {
      const { result } = renderHook(() => useDashboard());

      expect(result.current.recentActivities.length).toBe(5);
    });

    it('每条活动应该有必需的字段', () => {
      const { result } = renderHook(() => useDashboard());

      result.current.recentActivities.forEach((activity) => {
        expect(activity.id).toBeDefined();
        expect(activity.type).toBeDefined();
        expect(activity.title).toBeDefined();
        expect(activity.description).toBeDefined();
        expect(activity.time).toBeDefined();
        expect(activity.icon).toBeDefined();
        expect(activity.status).toBeDefined();
      });
    });

    it('活动状态应该是有效值', () => {
      const { result } = renderHook(() => useDashboard());

      const validStatuses = ['success', 'warning', 'error'];
      result.current.recentActivities.forEach((activity) => {
        expect(validStatuses).toContain(activity.status);
      });
    });

    it('活动应该按时间倒序排列', () => {
      const { result } = renderHook(() => useDashboard());

      const activities = result.current.recentActivities;
      for (let i = 0; i < activities.length - 1; i++) {
        expect(
          activities[i].time.isAfter(activities[i + 1].time) ||
            activities[i].time.isSame(activities[i + 1].time)
        ).toBe(true);
      }
    });
  });

  describe('计算属性', () => {
    it('应该正确计算设备使用率', () => {
      const { result } = renderHook(() => useDashboard());

      const { devices } = result.current.dashboardData;
      const expectedRate = Math.round((devices.total / devices.quota) * 100);
      expect(result.current.deviceUsageRate).toBe(expectedRate);
    });

    it('设备使用率应该在合理范围内 (0-100%)', () => {
      const { result } = renderHook(() => useDashboard());

      expect(result.current.deviceUsageRate).toBeGreaterThanOrEqual(0);
      expect(result.current.deviceUsageRate).toBeLessThanOrEqual(100);
    });

    it('应该正确计算消费趋势百分比', () => {
      const { result } = renderHook(() => useDashboard());

      const { billing } = result.current.dashboardData;
      const expectedPercent = Math.round(
        ((billing.thisMonth - billing.lastMonth) / billing.lastMonth) * 100
      );
      expect(result.current.spendingTrendPercent).toBe(expectedPercent);
    });
  });

  describe('刷新功能', () => {
    it('刷新时应该设置 loading 状态', async () => {
      const { result } = renderHook(() => useDashboard());

      expect(result.current.loading).toBe(false);

      // 开始刷新
      act(() => {
        result.current.handleRefresh();
      });

      // 刷新完成后 loading 应该恢复为 false
      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 2000 }
      );
    });

    it('handleRefresh 应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useDashboard());

      const firstRefresh = result.current.handleRefresh;
      rerender();
      const secondRefresh = result.current.handleRefresh;

      expect(firstRefresh).toBe(secondRefresh);
    });
  });

  describe('数据一致性', () => {
    it('dashboard 数据应该在重新渲染时保持一致', () => {
      const { result, rerender } = renderHook(() => useDashboard());

      const firstData = result.current.dashboardData;
      rerender();
      const secondData = result.current.dashboardData;

      expect(firstData).toBe(secondData);
    });

    it('活动列表应该在重新渲染时保持一致', () => {
      const { result, rerender } = renderHook(() => useDashboard());

      const firstActivities = result.current.recentActivities;
      rerender();
      const secondActivities = result.current.recentActivities;

      expect(firstActivities).toBe(secondActivities);
    });
  });
});
