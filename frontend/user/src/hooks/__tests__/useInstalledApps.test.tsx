import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInstalledApps, InstalledApp } from '../useInstalledApps';
import * as appService from '@/services/app';
import { message } from 'antd';

// Mock antd
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

// Mock app service
vi.mock('@/services/app', () => ({
  getInstalledApps: vi.fn(),
  uninstallApp: vi.fn(),
  batchUninstallApps: vi.fn(),
  updateApp: vi.fn(),
}));

describe('useInstalledApps Hook', () => {
  const mockApps: InstalledApp[] = [
    {
      packageName: 'com.user.app1',
      name: 'User App 1',
      version: '1.0.0',
      versionCode: 1,
      size: 1024,
      installTime: '2024-01-01',
      updateTime: '2024-01-01',
      isSystemApp: false,
      hasUpdate: true,
    },
    {
      packageName: 'com.user.app2',
      name: 'User App 2',
      version: '2.0.0',
      versionCode: 2,
      size: 2048,
      installTime: '2024-01-02',
      updateTime: '2024-01-02',
      isSystemApp: false,
      hasUpdate: false,
    },
    {
      packageName: 'com.android.system',
      name: 'System App',
      version: '1.0.0',
      versionCode: 1,
      size: 4096,
      installTime: '2024-01-01',
      updateTime: '2024-01-01',
      isSystemApp: true,
      hasUpdate: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(appService.getInstalledApps).mockResolvedValue(mockApps);
    vi.mocked(appService.uninstallApp).mockResolvedValue(undefined as any);
    vi.mocked(appService.batchUninstallApps).mockResolvedValue({
      results: [{ packageName: 'com.user.app1', success: true }],
    } as any);
    vi.mocked(appService.updateApp).mockResolvedValue(undefined as any);
  });

  describe('初始化', () => {
    it('应该初始化所有状态', () => {
      const { result } = renderHook(() => useInstalledApps('device-123'));

      expect(result.current.apps).toEqual([]);
      expect(typeof result.current.loading).toBe('boolean');
      expect(result.current.selectedAppIds).toEqual([]);
      expect(result.current.stats).toEqual({
        total: 0,
        system: 0,
        user: 0,
        updatable: 0,
      });
    });
  });

  describe('数据加载', () => {
    it('有deviceId时应该加载应用列表', async () => {
      renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(appService.getInstalledApps).toHaveBeenCalledWith('device-123');
      });
    });

    it('没有deviceId时不应该加载', async () => {
      renderHook(() => useInstalledApps(null));

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(appService.getInstalledApps).not.toHaveBeenCalled();
    });

    it('加载成功应该更新apps', async () => {
      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps).toEqual(mockApps);
      });
    });

    it('加载失败应该显示错误消息', async () => {
      vi.mocked(appService.getInstalledApps).mockRejectedValue({
        response: { data: { message: '加载失败' } },
      });

      renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('加载失败');
      });
    });

    it('加载失败应该清空apps', async () => {
      vi.mocked(appService.getInstalledApps).mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps).toEqual([]);
      });
    });
  });

  describe('stats 统计信息', () => {
    it('应该正确计算统计信息', async () => {
      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      expect(result.current.stats).toEqual({
        total: 3,
        system: 1,
        user: 2,
        updatable: 1,
      });
    });
  });

  describe('handleSelectApp 选择应用', () => {
    it('选中应该添加到selectedAppIds', async () => {
      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectApp('com.user.app1', true);
      });

      expect(result.current.selectedAppIds).toContain('com.user.app1');
    });

    it('取消选中应该从selectedAppIds移除', async () => {
      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectApp('com.user.app1', true);
        result.current.handleSelectApp('com.user.app1', false);
      });

      expect(result.current.selectedAppIds).not.toContain('com.user.app1');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useInstalledApps('device-123'));

      const firstHandle = result.current.handleSelectApp;
      rerender();
      const secondHandle = result.current.handleSelectApp;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleSelectAll 全选', () => {
    it('应该选择所有非系统应用', async () => {
      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectAll();
      });

      expect(result.current.selectedAppIds).toEqual(['com.user.app1', 'com.user.app2']);
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useInstalledApps('device-123'));

      const firstHandle = result.current.handleSelectAll;
      rerender();
      const secondHandle = result.current.handleSelectAll;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleClearSelection 清除选择', () => {
    it('应该清空selectedAppIds', async () => {
      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectAll();
        result.current.handleClearSelection();
      });

      expect(result.current.selectedAppIds).toEqual([]);
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useInstalledApps('device-123'));

      const firstHandle = result.current.handleClearSelection;
      rerender();
      const secondHandle = result.current.handleClearSelection;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleUninstall 卸载应用', () => {
    it('没有deviceId时应该提示错误', async () => {
      const { result } = renderHook(() => useInstalledApps(null));

      await act(async () => {
        await result.current.handleUninstall('com.user.app1');
      });

      expect(message.error).toHaveBeenCalledWith('请先选择设备');
      expect(appService.uninstallApp).not.toHaveBeenCalled();
    });

    it('卸载成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.handleUninstall('com.user.app1');
      });

      expect(message.success).toHaveBeenCalledWith('应用卸载成功');
    });

    it('卸载成功应该刷新列表', async () => {
      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      vi.clearAllMocks();

      await act(async () => {
        await result.current.handleUninstall('com.user.app1');
      });

      expect(appService.getInstalledApps).toHaveBeenCalledWith('device-123');
    });

    it('卸载失败应该显示错误消息', async () => {
      vi.mocked(appService.uninstallApp).mockRejectedValue({
        response: { data: { message: '卸载失败' } },
      });

      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.handleUninstall('com.user.app1');
      });

      expect(message.error).toHaveBeenCalledWith('卸载失败');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useInstalledApps('device-123'));

      const firstHandle = result.current.handleUninstall;
      rerender();
      const secondHandle = result.current.handleUninstall;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleBatchUninstall 批量卸载', () => {
    it('没有deviceId时应该提示错误', async () => {
      const { result } = renderHook(() => useInstalledApps(null));

      await act(async () => {
        await result.current.handleBatchUninstall();
      });

      expect(message.error).toHaveBeenCalledWith('请先选择设备');
    });

    it('没有选中应用时应该提示警告', async () => {
      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.handleBatchUninstall();
      });

      expect(message.warning).toHaveBeenCalledWith('请先选择要卸载的应用');
    });

    it('只选中系统应用时应该提示警告', async () => {
      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectApp('com.android.system', true);
      });

      await act(async () => {
        await result.current.handleBatchUninstall();
      });

      expect(message.warning).toHaveBeenCalledWith('系统应用无法卸载');
    });

    it('批量卸载成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectApp('com.user.app1', true);
      });

      await act(async () => {
        await result.current.handleBatchUninstall();
      });

      expect(message.success).toHaveBeenCalledWith('成功卸载 1 个应用');
    });

    it('批量卸载失败应该显示错误消息', async () => {
      vi.mocked(appService.batchUninstallApps).mockRejectedValue({
        response: { data: { message: '批量卸载失败' } },
      });

      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectApp('com.user.app1', true);
      });

      await act(async () => {
        await result.current.handleBatchUninstall();
      });

      expect(message.error).toHaveBeenCalledWith('批量卸载失败');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useInstalledApps('device-123'));

      const firstHandle = result.current.handleBatchUninstall;
      rerender();
      const secondHandle = result.current.handleBatchUninstall;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleUpdate 更新应用', () => {
    it('没有deviceId时应该提示错误', async () => {
      const { result } = renderHook(() => useInstalledApps(null));

      await act(async () => {
        await result.current.handleUpdate('com.user.app1');
      });

      expect(message.error).toHaveBeenCalledWith('请先选择设备');
    });

    it('更新成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.handleUpdate('com.user.app1');
      });

      expect(message.success).toHaveBeenCalledWith('应用更新成功');
    });

    it('更新失败应该显示错误消息', async () => {
      vi.mocked(appService.updateApp).mockRejectedValue({
        response: { data: { message: '更新失败' } },
      });

      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.handleUpdate('com.user.app1');
      });

      expect(message.error).toHaveBeenCalledWith('更新失败');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useInstalledApps('device-123'));

      const firstHandle = result.current.handleUpdate;
      rerender();
      const secondHandle = result.current.handleUpdate;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleRefresh 刷新', () => {
    it('应该显示提示消息', async () => {
      const { result } = renderHook(() => useInstalledApps('device-123'));

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleRefresh();
      });

      expect(message.info).toHaveBeenCalledWith('正在刷新应用列表...');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useInstalledApps('device-123'));

      const firstHandle = result.current.handleRefresh;
      rerender();
      const secondHandle = result.current.handleRefresh;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('deviceId变化', () => {
    it('deviceId变化应该重新加载应用', async () => {
      const { rerender } = renderHook(
        ({ deviceId }) => useInstalledApps(deviceId),
        { initialProps: { deviceId: 'device-123' } }
      );

      await waitFor(() => {
        expect(appService.getInstalledApps).toHaveBeenCalledWith('device-123');
      });

      vi.clearAllMocks();

      rerender({ deviceId: 'device-456' });

      await waitFor(() => {
        expect(appService.getInstalledApps).toHaveBeenCalledWith('device-456');
      });
    });

    it('deviceId变化应该清除选择', async () => {
      const { result, rerender } = renderHook(
        ({ deviceId }) => useInstalledApps(deviceId),
        { initialProps: { deviceId: 'device-123' } }
      );

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectApp('com.user.app1', true);
      });

      expect(result.current.selectedAppIds.length).toBeGreaterThan(0);

      rerender({ deviceId: 'device-456' });

      await waitFor(() => {
        expect(result.current.selectedAppIds).toEqual([]);
      });
    });
  });
});
