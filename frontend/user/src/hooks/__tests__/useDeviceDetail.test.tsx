import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeviceDetail } from '../useDeviceDetail';
import * as deviceService from '@/services/device';
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
    },
  };
});

// Mock device service
vi.mock('@/services/device', () => ({
  getDevice: vi.fn(),
  startDevice: vi.fn(),
  stopDevice: vi.fn(),
  rebootDevice: vi.fn(),
}));

describe('useDeviceDetail Hook', () => {
  const mockDevice = {
    id: 'device-123',
    name: '我的云手机',
    status: 'running',
    template: 'Android 11',
    cpu: 2,
    memory: 4096,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    vi.mocked(deviceService.getDevice).mockResolvedValue(mockDevice as any);
    vi.mocked(deviceService.startDevice).mockResolvedValue(undefined as any);
    vi.mocked(deviceService.stopDevice).mockResolvedValue(undefined as any);
    vi.mocked(deviceService.rebootDevice).mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初始化', () => {
    it('应该初始化所有状态', () => {
      const { result } = renderHook(() => useDeviceDetail('device-123'));

      expect(result.current.device).toBeNull();
      expect(typeof result.current.loading).toBe('boolean');
    });
  });

  describe('数据加载', () => {
    it('mount时应该加载设备信息', async () => {
      renderHook(() => useDeviceDetail('device-123'));

      await vi.runOnlyPendingTimersAsync();

      expect(deviceService.getDevice).toHaveBeenCalledWith('device-123');
    });

    it('加载成功应该更新device', async () => {
      const { result } = renderHook(() => useDeviceDetail('device-123'));

      await vi.runOnlyPendingTimersAsync();

      expect(result.current.device).toEqual(mockDevice);
    });

    it('加载失败应该显示错误消息', async () => {
      vi.mocked(deviceService.getDevice).mockRejectedValue(
        new Error('网络错误')
      );

      renderHook(() => useDeviceDetail('device-123'));

      await vi.runOnlyPendingTimersAsync();

      expect(message.error).toHaveBeenCalledWith('加载设备信息失败');
    });

    it('没有id时不应该加载', async () => {
      renderHook(() => useDeviceDetail(undefined));

      await vi.runOnlyPendingTimersAsync();

      expect(deviceService.getDevice).not.toHaveBeenCalled();
    });

  });

  describe('handleStart 启动设备', () => {
    it('没有id时不应该执行', async () => {
      const { result } = renderHook(() => useDeviceDetail(undefined));

      await act(async () => {
        await result.current.handleStart();
      });

      expect(deviceService.startDevice).not.toHaveBeenCalled();
    });

    it('启动成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useDeviceDetail('device-123'));

      await vi.runOnlyPendingTimersAsync();

      await act(async () => {
        await result.current.handleStart();
      });

      expect(message.success).toHaveBeenCalledWith('设备启动成功');
    });

    it('启动成功应该重新加载设备信息', async () => {
      const { result } = renderHook(() => useDeviceDetail('device-123'));

      await vi.runOnlyPendingTimersAsync();

      vi.clearAllMocks();

      await act(async () => {
        await result.current.handleStart();
      });

      await vi.runOnlyPendingTimersAsync();

      expect(deviceService.getDevice).toHaveBeenCalled();
    });

    it('启动失败应该显示错误消息', async () => {
      vi.mocked(deviceService.startDevice).mockRejectedValue(
        new Error('启动失败')
      );

      const { result } = renderHook(() => useDeviceDetail('device-123'));

      await vi.runOnlyPendingTimersAsync();

      await act(async () => {
        await result.current.handleStart();
      });

      expect(message.error).toHaveBeenCalledWith('设备启动失败');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useDeviceDetail('device-123'));

      const firstHandle = result.current.handleStart;
      rerender();
      const secondHandle = result.current.handleStart;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleStop 停止设备', () => {
    it('没有id时不应该执行', async () => {
      const { result } = renderHook(() => useDeviceDetail(undefined));

      await act(async () => {
        await result.current.handleStop();
      });

      expect(deviceService.stopDevice).not.toHaveBeenCalled();
    });

    it('停止成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useDeviceDetail('device-123'));

      await vi.runOnlyPendingTimersAsync();

      await act(async () => {
        await result.current.handleStop();
      });

      expect(message.success).toHaveBeenCalledWith('设备停止成功');
    });

    it('停止成功应该重新加载设备信息', async () => {
      const { result } = renderHook(() => useDeviceDetail('device-123'));

      await vi.runOnlyPendingTimersAsync();

      vi.clearAllMocks();

      await act(async () => {
        await result.current.handleStop();
      });

      await vi.runOnlyPendingTimersAsync();

      expect(deviceService.getDevice).toHaveBeenCalled();
    });

    it('停止失败应该显示错误消息', async () => {
      vi.mocked(deviceService.stopDevice).mockRejectedValue(
        new Error('停止失败')
      );

      const { result } = renderHook(() => useDeviceDetail('device-123'));

      await vi.runOnlyPendingTimersAsync();

      await act(async () => {
        await result.current.handleStop();
      });

      expect(message.error).toHaveBeenCalledWith('设备停止失败');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useDeviceDetail('device-123'));

      const firstHandle = result.current.handleStop;
      rerender();
      const secondHandle = result.current.handleStop;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleReboot 重启设备', () => {
    it('没有id时不应该执行', async () => {
      const { result } = renderHook(() => useDeviceDetail(undefined));

      await act(async () => {
        await result.current.handleReboot();
      });

      expect(deviceService.rebootDevice).not.toHaveBeenCalled();
    });

    it('重启成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useDeviceDetail('device-123'));

      await vi.runOnlyPendingTimersAsync();

      await act(async () => {
        await result.current.handleReboot();
      });

      expect(message.success).toHaveBeenCalledWith('设备重启中...');
    });

    it('重启成功应该延迟2秒后重新加载', async () => {
      const { result } = renderHook(() => useDeviceDetail('device-123'));

      await vi.runOnlyPendingTimersAsync();

      vi.clearAllMocks();

      await act(async () => {
        await result.current.handleReboot();
      });

      // 2秒前不应该调用
      expect(deviceService.getDevice).not.toHaveBeenCalled();

      // 前进2秒
      await vi.advanceTimersByTimeAsync(2000);

      expect(deviceService.getDevice).toHaveBeenCalled();
    });

    it('重启失败应该显示错误消息', async () => {
      vi.mocked(deviceService.rebootDevice).mockRejectedValue(
        new Error('重启失败')
      );

      const { result } = renderHook(() => useDeviceDetail('device-123'));

      await vi.runOnlyPendingTimersAsync();

      await act(async () => {
        await result.current.handleReboot();
      });

      expect(message.error).toHaveBeenCalledWith('设备重启失败');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useDeviceDetail('device-123'));

      const firstHandle = result.current.handleReboot;
      rerender();
      const secondHandle = result.current.handleReboot;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('导航', () => {
    it('handleBack应该导航到设备列表页', async () => {
      const { result } = renderHook(() => useDeviceDetail('device-123'));

      await vi.runOnlyPendingTimersAsync();

      act(() => {
        result.current.handleBack();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/devices');
    });

    it('handleMonitor应该导航到监控页', async () => {
      const { result } = renderHook(() => useDeviceDetail('device-123'));

      await vi.runOnlyPendingTimersAsync();

      act(() => {
        result.current.handleMonitor();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/devices/device-123/monitor');
    });

    it('handleSnapshots应该导航到快照页', async () => {
      const { result } = renderHook(() => useDeviceDetail('device-123'));

      await vi.runOnlyPendingTimersAsync();

      act(() => {
        result.current.handleSnapshots();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/devices/device-123/snapshots');
    });

    it('导航函数应该是稳定的引用', () => {
      const { result, rerender } = renderHook(() => useDeviceDetail('device-123'));

      const firstBack = result.current.handleBack;
      const firstMonitor = result.current.handleMonitor;
      const firstSnapshots = result.current.handleSnapshots;

      rerender();

      expect(result.current.handleBack).toBe(firstBack);
      expect(result.current.handleMonitor).toBe(firstMonitor);
      expect(result.current.handleSnapshots).toBe(firstSnapshots);
    });
  });
});
