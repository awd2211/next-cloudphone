import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeviceList } from '../useDeviceList';
import * as deviceService from '@/services/device';
import { message } from 'antd';
import type { Device } from '@/types';

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  };
});

// Mock device service
vi.mock('@/services/device', () => ({
  getMyDevices: vi.fn(),
  startDevice: vi.fn(),
  stopDevice: vi.fn(),
  rebootDevice: vi.fn(),
  getMyDeviceStats: vi.fn(),
}));

describe('useDeviceList Hook', () => {
  const mockDevices: Device[] = [
    {
      id: '1',
      name: 'Test Device 1',
      status: 'running',
      cpu: 2,
      memory: 4096,
      storage: 32768,
      createdAt: '2024-01-01T00:00:00Z',
    } as Device,
    {
      id: '2',
      name: 'Test Device 2',
      status: 'stopped',
      cpu: 4,
      memory: 8192,
      storage: 65536,
      createdAt: '2024-01-02T00:00:00Z',
    } as Device,
  ];

  const mockStats = {
    total: 10,
    running: 6,
    stopped: 4,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Setup default mock implementations
    vi.mocked(deviceService.getMyDevices).mockResolvedValue({
      data: mockDevices,
      total: 10,
    });
    vi.mocked(deviceService.getMyDeviceStats).mockResolvedValue(mockStats);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初始化', () => {
    it('应该初始化devices为空数组', () => {
      const { result } = renderHook(() => useDeviceList());

      expect(result.current.devices).toEqual([]);
    });

    it('应该初始化stats为null', () => {
      const { result } = renderHook(() => useDeviceList());

      expect(result.current.stats).toBeNull();
    });

    it('应该初始化loading为false', () => {
      const { result } = renderHook(() => useDeviceList());

      expect(result.current.loading).toBe(false);
    });

    it('应该初始化pagination配置', () => {
      const { result } = renderHook(() => useDeviceList());

      expect(result.current.pagination).toBeDefined();
      expect(result.current.pagination.current).toBe(1);
      expect(result.current.pagination.pageSize).toBe(10);
      expect(result.current.pagination.total).toBe(0);
      expect(result.current.pagination.showSizeChanger).toBe(true);
    });

    it('pagination应该有showTotal函数', () => {
      const { result } = renderHook(() => useDeviceList());

      expect(result.current.pagination.showTotal).toBeDefined();
      const text = result.current.pagination.showTotal(100);
      expect(text).toBe('共 100 条');
    });

    it('应该初始化actions对象', () => {
      const { result } = renderHook(() => useDeviceList());

      expect(result.current.actions).toBeDefined();
      expect(result.current.actions.handleStart).toBeDefined();
      expect(result.current.actions.handleStop).toBeDefined();
      expect(result.current.actions.handleReboot).toBeDefined();
      expect(result.current.actions.handleCreateSuccess).toBeDefined();
      expect(result.current.actions.handleRefresh).toBeDefined();
    });
  });

  describe('自动加载数据', () => {
    it('mount时应该调用getMyDevices', async () => {
      renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(deviceService.getMyDevices).toHaveBeenCalledWith({
          page: 1,
          pageSize: 10,
        });
      });
    });

    it('mount时应该调用getMyDeviceStats', async () => {
      renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(deviceService.getMyDeviceStats).toHaveBeenCalled();
      });
    });

    it('加载成功应该更新devices', async () => {
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });
    });

    it('加载成功应该更新total', async () => {
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.pagination.total).toBe(10);
      });
    });

    it('加载成功应该更新stats', async () => {
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.stats).toEqual(mockStats);
      });
    });

    it('加载失败应该显示错误消息', async () => {
      vi.mocked(deviceService.getMyDevices).mockRejectedValue(new Error('Network error'));

      renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('加载设备列表失败');
      });
    });

    it('加载过程中loading应该为true', async () => {
      let resolveDevices: any;
      vi.mocked(deviceService.getMyDevices).mockReturnValue(
        new Promise((resolve) => {
          resolveDevices = resolve;
        })
      );

      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      resolveDevices({ data: mockDevices, total: 10 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('handleStart 启动设备', () => {
    it('应该调用startDevice API', async () => {
      vi.mocked(deviceService.startDevice).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      await act(async () => {
        await result.current.actions.handleStart('1');
      });

      expect(deviceService.startDevice).toHaveBeenCalledWith('1');
    });

    it('启动成功应该显示成功消息', async () => {
      vi.mocked(deviceService.startDevice).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      await act(async () => {
        await result.current.actions.handleStart('1');
      });

      expect(message.success).toHaveBeenCalledWith('设备启动成功');
    });

    it('启动成功应该重新加载设备列表', async () => {
      vi.mocked(deviceService.startDevice).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      vi.clearAllMocks();

      await act(async () => {
        await result.current.actions.handleStart('1');
      });

      await waitFor(() => {
        expect(deviceService.getMyDevices).toHaveBeenCalled();
      });
    });

    it('启动成功应该重新加载统计数据', async () => {
      vi.mocked(deviceService.startDevice).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      vi.clearAllMocks();

      await act(async () => {
        await result.current.actions.handleStart('1');
      });

      await waitFor(() => {
        expect(deviceService.getMyDeviceStats).toHaveBeenCalled();
      });
    });

    it('启动失败应该显示错误消息', async () => {
      vi.mocked(deviceService.startDevice).mockRejectedValue(new Error('Start failed'));
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      await act(async () => {
        await result.current.actions.handleStart('1');
      });

      expect(message.error).toHaveBeenCalledWith('设备启动失败');
    });
  });

  describe('handleStop 停止设备', () => {
    it('应该调用stopDevice API', async () => {
      vi.mocked(deviceService.stopDevice).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      await act(async () => {
        await result.current.actions.handleStop('1');
      });

      expect(deviceService.stopDevice).toHaveBeenCalledWith('1');
    });

    it('停止成功应该显示成功消息', async () => {
      vi.mocked(deviceService.stopDevice).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      await act(async () => {
        await result.current.actions.handleStop('1');
      });

      expect(message.success).toHaveBeenCalledWith('设备停止成功');
    });

    it('停止成功应该重新加载设备列表', async () => {
      vi.mocked(deviceService.stopDevice).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      vi.clearAllMocks();

      await act(async () => {
        await result.current.actions.handleStop('1');
      });

      await waitFor(() => {
        expect(deviceService.getMyDevices).toHaveBeenCalled();
      });
    });

    it('停止成功应该重新加载统计数据', async () => {
      vi.mocked(deviceService.stopDevice).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      vi.clearAllMocks();

      await act(async () => {
        await result.current.actions.handleStop('1');
      });

      await waitFor(() => {
        expect(deviceService.getMyDeviceStats).toHaveBeenCalled();
      });
    });

    it('停止失败应该显示错误消息', async () => {
      vi.mocked(deviceService.stopDevice).mockRejectedValue(new Error('Stop failed'));
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      await act(async () => {
        await result.current.actions.handleStop('1');
      });

      expect(message.error).toHaveBeenCalledWith('设备停止失败');
    });
  });

  describe('handleReboot 重启设备', () => {
    it('应该调用rebootDevice API', async () => {
      vi.mocked(deviceService.rebootDevice).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      await act(async () => {
        await result.current.actions.handleReboot('1');
      });

      expect(deviceService.rebootDevice).toHaveBeenCalledWith('1');
    });

    it('重启成功应该显示成功消息', async () => {
      vi.mocked(deviceService.rebootDevice).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      await act(async () => {
        await result.current.actions.handleReboot('1');
      });

      expect(message.success).toHaveBeenCalledWith('设备重启中...');
    });

    it('重启成功应该在2秒后重新加载设备列表', async () => {
      vi.mocked(deviceService.rebootDevice).mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      vi.clearAllMocks();

      await act(async () => {
        await result.current.actions.handleReboot('1');
      });

      // 立即不应该调用
      expect(deviceService.getMyDevices).not.toHaveBeenCalled();

      // 2秒后应该调用
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(deviceService.getMyDevices).toHaveBeenCalled();
      });
    });

    it('重启失败应该显示错误消息', async () => {
      vi.mocked(deviceService.rebootDevice).mockRejectedValue(new Error('Reboot failed'));
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      await act(async () => {
        await result.current.actions.handleReboot('1');
      });

      expect(message.error).toHaveBeenCalledWith('设备重启失败');
    });
  });

  describe('handleCreateSuccess 创建成功', () => {
    it('应该显示成功消息', async () => {
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      const newDevice: Device = {
        id: '3',
        name: 'New Device',
        status: 'running',
      } as Device;

      act(() => {
        result.current.actions.handleCreateSuccess(newDevice);
      });

      expect(message.success).toHaveBeenCalledWith('设备 "New Device" 创建成功！');
    });

    it('创建成功应该重新加载设备列表', async () => {
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      vi.clearAllMocks();

      const newDevice: Device = {
        id: '3',
        name: 'New Device',
        status: 'running',
      } as Device;

      act(() => {
        result.current.actions.handleCreateSuccess(newDevice);
      });

      await waitFor(() => {
        expect(deviceService.getMyDevices).toHaveBeenCalled();
      });
    });

    it('创建成功应该重新加载统计数据', async () => {
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      vi.clearAllMocks();

      const newDevice: Device = {
        id: '3',
        name: 'New Device',
        status: 'running',
      } as Device;

      act(() => {
        result.current.actions.handleCreateSuccess(newDevice);
      });

      await waitFor(() => {
        expect(deviceService.getMyDeviceStats).toHaveBeenCalled();
      });
    });
  });

  describe('handlePageChange 分页变化', () => {
    it('应该更新page和pageSize', async () => {
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      act(() => {
        result.current.pagination.onChange(2, 20);
      });

      expect(result.current.pagination.current).toBe(2);
      expect(result.current.pagination.pageSize).toBe(20);
    });

    it('分页变化应该触发数据重新加载', async () => {
      const { result } = renderHook(() => useDeviceList());

      await waitFor(() => {
        expect(result.current.devices).toEqual(mockDevices);
      });

      vi.clearAllMocks();

      act(() => {
        result.current.pagination.onChange(2, 20);
      });

      await waitFor(() => {
        expect(deviceService.getMyDevices).toHaveBeenCalledWith({
          page: 2,
          pageSize: 20,
        });
      });
    });
  });

  describe('handleRefresh 刷新', () => {
    it('应该调用loadDevices和loadStats', async () => {
      const { result } = renderHook(() => useDeviceList());

      // 等待初始加载完成
      await waitFor(() => {
        expect(result.current.devices.length).toBeGreaterThan(0);
      });

      // 清除mock调用记录
      vi.clearAllMocks();

      // 执行refresh
      act(() => {
        result.current.actions.handleRefresh();
      });

      // 验证API被调用
      expect(deviceService.getMyDevices).toHaveBeenCalled();
      expect(deviceService.getMyDeviceStats).toHaveBeenCalled();
    });
  });

  describe('useCallback 优化验证', () => {
    it('pagination.onChange应该保持稳定', () => {
      const { result, rerender } = renderHook(() => useDeviceList());

      const firstOnChange = result.current.pagination.onChange;
      rerender();
      const secondOnChange = result.current.pagination.onChange;

      expect(firstOnChange).toBe(secondOnChange);
    });
  });
});
