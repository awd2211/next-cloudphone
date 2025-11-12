import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeviceMonitor } from '../useDeviceMonitor';
import * as deviceService from '@/services/device';
import type { Device } from '@/types';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock device service
vi.mock('@/services/device', () => ({
  getDevice: vi.fn(),
  getDeviceStats: vi.fn(),
}));

// Mock monitor config
vi.mock('@/utils/monitorConfig', () => ({
  AUTO_REFRESH_INTERVAL: 5000,
  MAX_HISTORY_DATA: 20,
}));

describe('useDeviceMonitor Hook', () => {
  const mockDevice: Device = {
    id: '1',
    name: 'Test Device',
    status: 'running',
    cpu: 2,
    memory: 4096,
    storage: 32768,
    createdAt: '2024-01-01T00:00:00Z',
  } as Device;

  const mockStats = {
    data: {
      cpuUsage: 45.5,
      memoryUsed: 2048,
      memoryTotal: 4096,
      storageUsed: 16384,
      storageTotal: 32768,
      networkIn: 1024,
      networkOut: 512,
      uptime: 3600,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(deviceService.getDevice).mockResolvedValue(mockDevice);
    vi.mocked(deviceService.getDeviceStats).mockResolvedValue(mockStats);
  });

  describe('初始化', () => {
    it('应该初始化device为null', () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));
      expect(result.current.device).toBeNull();
    });

    it('应该初始化stats为null', () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));
      expect(result.current.stats).toBeNull();
    });

    it('应该初始化loading为true', () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));
      expect(result.current.loading).toBe(true);
    });

    it('应该初始化autoRefresh为true', () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));
      expect(result.current.autoRefresh).toBe(true);
    });

    it('应该初始化historyData为空数组', () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));
      expect(result.current.historyData).toEqual([]);
    });
  });

  describe('数据加载', () => {
    it('mount时应该调用getDevice', async () => {
      renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(deviceService.getDevice).toHaveBeenCalledWith('1');
        },
        { timeout: 3000 }
      );
    });

    it('mount时应该调用getDeviceStats', async () => {
      renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(deviceService.getDeviceStats).toHaveBeenCalledWith('1');
        },
        { timeout: 3000 }
      );
    });

    it('没有id时不应该加载数据', () => {
      renderHook(() => useDeviceMonitor(undefined));

      expect(deviceService.getDevice).not.toHaveBeenCalled();
      expect(deviceService.getDeviceStats).not.toHaveBeenCalled();
    });

    it('加载成功应该更新device', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.device).toEqual(mockDevice);
        },
        { timeout: 3000 }
      );
    });

    it('加载成功应该更新stats', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.stats).toEqual(mockStats.data);
        },
        { timeout: 3000 }
      );
    });

    it('加载成功应该设置loading为false', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 3000 }
      );
    });

    it('加载成功应该添加历史数据', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.historyData.length).toBe(1);
        },
        { timeout: 3000 }
      );

      const historyItem = result.current.historyData[0];
      expect(historyItem.cpuUsage).toBe(45.5);
      expect(historyItem.memoryUsage).toBe(50); // 2048/4096 * 100
    });
  });

  describe('自动刷新', () => {
    // 只在这个测试套件中使用fake timers
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('autoRefresh为true时应该设置定时器', async () => {
      renderHook(() => useDeviceMonitor('1'));

      await vi.waitFor(
        () => {
          expect(deviceService.getDeviceStats).toHaveBeenCalledTimes(1);
        },
        { timeout: 3000 }
      );

      vi.clearAllMocks();

      // 前进5秒
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      await vi.waitFor(
        () => {
          expect(deviceService.getDeviceStats).toHaveBeenCalledTimes(1);
        },
        { timeout: 3000 }
      );
    });

    it('autoRefresh为false时不应该自动刷新', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await vi.waitFor(
        () => {
          expect(result.current.stats).toBeDefined();
        },
        { timeout: 3000 }
      );

      // 关闭自动刷新
      act(() => {
        result.current.toggleAutoRefresh();
      });

      expect(result.current.autoRefresh).toBe(false);

      vi.clearAllMocks();

      // 前进5秒
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      // 不应该再次调用
      expect(deviceService.getDeviceStats).not.toHaveBeenCalled();
    });

    it('unmount时应该清理定时器', async () => {
      const { result, unmount } = renderHook(() => useDeviceMonitor('1'));

      await vi.waitFor(
        () => {
          expect(result.current.stats).toBeDefined();
        },
        { timeout: 3000 }
      );

      vi.clearAllMocks();

      unmount();

      // 前进5秒
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      // 不应该再次调用
      expect(deviceService.getDeviceStats).not.toHaveBeenCalled();
    });
  });

  describe('toggleAutoRefresh 切换自动刷新', () => {
    it('应该切换autoRefresh状态', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.stats).toBeDefined();
        },
        { timeout: 3000 }
      );

      expect(result.current.autoRefresh).toBe(true);

      act(() => {
        result.current.toggleAutoRefresh();
      });

      expect(result.current.autoRefresh).toBe(false);

      act(() => {
        result.current.toggleAutoRefresh();
      });

      expect(result.current.autoRefresh).toBe(true);
    });

    it('toggleAutoRefresh应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useDeviceMonitor('1'));

      const firstToggle = result.current.toggleAutoRefresh;
      rerender();
      const secondToggle = result.current.toggleAutoRefresh;

      expect(firstToggle).toBe(secondToggle);
    });
  });

  describe('goBack 返回', () => {
    it('应该导航到设备详情页', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.stats).toBeDefined();
        },
        { timeout: 3000 }
      );

      act(() => {
        result.current.goBack();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/devices/1');
    });
  });

  describe('cpuChartConfig CPU图表配置', () => {
    it('应该定义cpuChartConfig', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.stats).toBeDefined();
        },
        { timeout: 3000 }
      );

      expect(result.current.cpuChartConfig).toBeDefined();
    });

    it('应该使用historyData作为数据源', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.historyData.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      expect(result.current.cpuChartConfig.data).toBe(result.current.historyData);
    });

    it('应该设置正确的字段映射', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.stats).toBeDefined();
        },
        { timeout: 3000 }
      );

      expect(result.current.cpuChartConfig.xField).toBe('time');
      expect(result.current.cpuChartConfig.yField).toBe('cpuUsage');
    });

    it('应该设置蓝色', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.stats).toBeDefined();
        },
        { timeout: 3000 }
      );

      expect(result.current.cpuChartConfig.color).toBe('#1890ff');
    });

    it('应该使用useMemo缓存', async () => {
      const { result, rerender } = renderHook(() => useDeviceMonitor('1'));

      // 等待historyData填充完成
      await waitFor(
        () => {
          expect(result.current.historyData.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      const firstConfig = result.current.cpuChartConfig;
      rerender();
      const secondConfig = result.current.cpuChartConfig;

      expect(firstConfig).toBe(secondConfig);
    });
  });

  describe('memoryChartConfig 内存图表配置', () => {
    it('应该定义memoryChartConfig', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.stats).toBeDefined();
        },
        { timeout: 3000 }
      );

      expect(result.current.memoryChartConfig).toBeDefined();
    });

    it('应该使用historyData作为数据源', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.historyData.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      expect(result.current.memoryChartConfig.data).toBe(result.current.historyData);
    });

    it('应该设置正确的字段映射', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.stats).toBeDefined();
        },
        { timeout: 3000 }
      );

      expect(result.current.memoryChartConfig.xField).toBe('time');
      expect(result.current.memoryChartConfig.yField).toBe('memoryUsage');
    });

    it('应该设置绿色', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.stats).toBeDefined();
        },
        { timeout: 3000 }
      );

      expect(result.current.memoryChartConfig.color).toBe('#52c41a');
    });

    it('应该使用useMemo缓存', async () => {
      const { result, rerender } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.stats).toBeDefined();
        },
        { timeout: 3000 }
      );

      const firstConfig = result.current.memoryChartConfig;
      rerender();
      const secondConfig = result.current.memoryChartConfig;

      expect(firstConfig).toBe(secondConfig);
    });
  });

  describe('loadStats 手动刷新', () => {
    it('应该重新加载stats', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.stats).toBeDefined();
        },
        { timeout: 3000 }
      );

      vi.clearAllMocks();

      await act(async () => {
        await result.current.loadStats();
      });

      expect(deviceService.getDeviceStats).toHaveBeenCalledWith('1');
    });

    it('loadStats应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useDeviceMonitor('1'));

      const firstLoad = result.current.loadStats;
      rerender();
      const secondLoad = result.current.loadStats;

      expect(firstLoad).toBe(secondLoad);
    });
  });

  describe('历史数据管理', () => {
    it('每次加载stats应该添加历史数据', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.historyData.length).toBe(1);
        },
        { timeout: 3000 }
      );

      await act(async () => {
        await result.current.loadStats();
      });

      await waitFor(
        () => {
          expect(result.current.historyData.length).toBe(2);
        },
        { timeout: 3000 }
      );
    });

    it('历史数据应该包含time字段', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.historyData.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      const item = result.current.historyData[0];
      expect(item.time).toBeDefined();
      expect(typeof item.time).toBe('string');
    });

    it('历史数据应该包含cpuUsage字段', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.historyData.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      const item = result.current.historyData[0];
      expect(item.cpuUsage).toBe(45.5);
    });

    it('历史数据应该包含memoryUsage百分比', async () => {
      const { result } = renderHook(() => useDeviceMonitor('1'));

      await waitFor(
        () => {
          expect(result.current.historyData.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      const item = result.current.historyData[0];
      expect(item.memoryUsage).toBe(50); // 2048/4096 * 100
    });
  });
});
