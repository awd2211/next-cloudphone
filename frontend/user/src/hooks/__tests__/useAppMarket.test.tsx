import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAppMarket } from '../useAppMarket';
import * as appService from '@/services/app';
import * as deviceService from '@/services/device';
import { message } from 'antd';
import type { Application, Device } from '@/types';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Create stable form mock
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
      warning: vi.fn(),
    },
  };
});

// Mock app service
vi.mock('@/services/app', () => ({
  getApps: vi.fn(),
  installAppToDevice: vi.fn(),
}));

// Mock device service
vi.mock('@/services/device', () => ({
  getMyDevices: vi.fn(),
}));

describe('useAppMarket Hook', () => {
  const mockApps: Application[] = [
    {
      id: '1',
      name: 'Test App 1',
      category: 'social',
      version: '1.0.0',
      icon: 'icon1.png',
    } as Application,
    {
      id: '2',
      name: 'Test App 2',
      category: 'games',
      version: '2.0.0',
      icon: 'icon2.png',
    } as Application,
  ];

  const mockDevices: Device[] = [
    {
      id: 'device-1',
      name: 'Device 1',
      status: 'running',
    } as Device,
    {
      id: 'device-2',
      name: 'Device 2',
      status: 'running',
    } as Device,
    {
      id: 'device-3',
      name: 'Device 3',
      status: 'stopped',
    } as Device,
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(appService.getApps).mockResolvedValue({
      data: mockApps,
      total: 10,
    } as any);

    vi.mocked(deviceService.getMyDevices).mockResolvedValue({
      data: mockDevices,
      total: 3,
    } as any);

    vi.mocked(appService.installAppToDevice).mockResolvedValue(undefined as any);
  });

  describe('初始化', () => {
    it('应该初始化所有状态', () => {
      const { result } = renderHook(() => useAppMarket());

      expect(result.current.apps).toEqual([]);
      expect(result.current.devices).toEqual([]);
      expect(typeof result.current.loading).toBe('boolean');
      expect(result.current.total).toBe(0);
      expect(result.current.page).toBe(1);
      expect(result.current.pageSize).toBe(12);
      expect(result.current.search).toBe('');
      expect(result.current.category).toBe('');
      expect(result.current.installModalVisible).toBe(false);
      expect(result.current.selectedApp).toBeNull();
      expect(result.current.form).toBe(mockForm);
    });

    it('应该初始化categories', () => {
      const { result } = renderHook(() => useAppMarket());

      expect(result.current.categories).toEqual([
        { label: '全部', value: '' },
        { label: '社交', value: 'social' },
        { label: '娱乐', value: 'entertainment' },
        { label: '工具', value: 'tools' },
        { label: '游戏', value: 'games' },
        { label: '办公', value: 'productivity' },
        { label: '其他', value: 'others' },
      ]);
    });
  });

  describe('数据加载', () => {
    it('mount时应该加载应用列表', async () => {
      renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(appService.getApps).toHaveBeenCalledWith({
          page: 1,
          pageSize: 12,
          category: '',
          search: '',
        });
      });
    });

    it('mount时应该加载设备列表', async () => {
      renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(deviceService.getMyDevices).toHaveBeenCalledWith({
          page: 1,
          pageSize: 100,
        });
      });
    });

    it('加载成功应该更新apps', async () => {
      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.apps).toEqual(mockApps);
      });
    });

    it('加载成功应该更新total', async () => {
      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.total).toBe(10);
      });
    });

    it('加载成功应该只包含运行中的设备', async () => {
      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.devices).toHaveLength(2);
        expect(result.current.devices.every(d => d.status === 'running')).toBe(true);
      });
    });

    it('加载应用失败应该显示错误消息', async () => {
      vi.mocked(appService.getApps).mockRejectedValue(new Error('Network error'));

      renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('加载应用列表失败');
      });
    });
  });

  describe('setSearch 设置搜索关键词', () => {
    it('应该更新search状态', async () => {
      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.setSearch('test keyword');
      });

      expect(result.current.search).toBe('test keyword');
    });
  });

  describe('setCategory 设置分类', () => {
    it('应该更新category状态', async () => {
      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.setCategory('social');
      });

      expect(result.current.category).toBe('social');
    });
  });

  describe('handleSearch 搜索', () => {
    it('应该重置page为1', async () => {
      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      // 先设置page为2
      act(() => {
        result.current.handleLoadMore();
      });

      expect(result.current.page).toBe(2);

      vi.clearAllMocks();

      // 搜索时应该重置为1
      act(() => {
        result.current.handleSearch();
      });

      expect(result.current.page).toBe(1);
    });

    it('应该调用getApps', async () => {
      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      vi.clearAllMocks();

      act(() => {
        result.current.setSearch('test');
        result.current.handleSearch();
      });

      await waitFor(() => {
        expect(appService.getApps).toHaveBeenCalled();
      });
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useAppMarket());

      const firstHandle = result.current.handleSearch;
      rerender();
      const secondHandle = result.current.handleSearch;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleView 查看详情', () => {
    it('应该导航到应用详情页', async () => {
      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleView(mockApps[0]);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/apps/1');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useAppMarket());

      const firstHandle = result.current.handleView;
      rerender();
      const secondHandle = result.current.handleView;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleInstall 打开安装弹窗', () => {
    it('没有运行中设备时应该提示警告', async () => {
      vi.mocked(deviceService.getMyDevices).mockResolvedValue({
        data: [],
        total: 0,
      } as any);

      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleInstall(mockApps[0]);
      });

      expect(message.warning).toHaveBeenCalledWith('没有运行中的设备，请先启动设备');
      expect(result.current.installModalVisible).toBe(false);
    });

    it('有设备时应该打开安装弹窗', async () => {
      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.devices.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleInstall(mockApps[0]);
      });

      expect(result.current.installModalVisible).toBe(true);
      expect(result.current.selectedApp).toBe(mockApps[0]);
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useAppMarket());

      const firstHandle = result.current.handleInstall;
      rerender();
      const secondHandle = result.current.handleInstall;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleInstallConfirm 确认安装', () => {
    it('没有selectedApp时不应该执行', async () => {
      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.handleInstallConfirm({ deviceId: 'device-1' });
      });

      expect(appService.installAppToDevice).not.toHaveBeenCalled();
    });

    it('安装成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.devices.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleInstall(mockApps[0]);
      });

      await act(async () => {
        await result.current.handleInstallConfirm({ deviceId: 'device-1' });
      });

      expect(message.success).toHaveBeenCalledWith('应用安装成功');
    });

    it('安装成功应该关闭弹窗', async () => {
      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.devices.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleInstall(mockApps[0]);
      });

      expect(result.current.installModalVisible).toBe(true);

      await act(async () => {
        await result.current.handleInstallConfirm({ deviceId: 'device-1' });
      });

      expect(result.current.installModalVisible).toBe(false);
    });

    it('安装成功应该重置表单', async () => {
      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.devices.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleInstall(mockApps[0]);
      });

      vi.clearAllMocks();

      await act(async () => {
        await result.current.handleInstallConfirm({ deviceId: 'device-1' });
      });

      expect(mockForm.resetFields).toHaveBeenCalled();
    });

    it('安装失败应该显示错误消息', async () => {
      vi.mocked(appService.installAppToDevice).mockRejectedValue(
        new Error('安装失败')
      );

      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.devices.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleInstall(mockApps[0]);
      });

      await act(async () => {
        await result.current.handleInstallConfirm({ deviceId: 'device-1' });
      });

      expect(message.error).toHaveBeenCalledWith('应用安装失败');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useAppMarket());

      const firstHandle = result.current.handleInstallConfirm;
      rerender();
      const secondHandle = result.current.handleInstallConfirm;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleInstallCancel 取消安装', () => {
    it('应该关闭弹窗', async () => {
      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.devices.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleInstall(mockApps[0]);
        result.current.handleInstallCancel();
      });

      expect(result.current.installModalVisible).toBe(false);
    });

    it('应该重置表单', async () => {
      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.devices.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleInstall(mockApps[0]);
      });

      vi.clearAllMocks();

      act(() => {
        result.current.handleInstallCancel();
      });

      expect(mockForm.resetFields).toHaveBeenCalled();
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useAppMarket());

      const firstHandle = result.current.handleInstallCancel;
      rerender();
      const secondHandle = result.current.handleInstallCancel;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleLoadMore 加载更多', () => {
    it('应该增加page', async () => {
      const { result } = renderHook(() => useAppMarket());

      await waitFor(() => {
        expect(result.current.apps.length).toBeGreaterThan(0);
      });

      expect(result.current.page).toBe(1);

      act(() => {
        result.current.handleLoadMore();
      });

      expect(result.current.page).toBe(2);
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useAppMarket());

      const firstHandle = result.current.handleLoadMore;
      rerender();
      const secondHandle = result.current.handleLoadMore;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('categories useMemo', () => {
    it('应该缓存categories', () => {
      const { result, rerender } = renderHook(() => useAppMarket());

      const firstCategories = result.current.categories;
      rerender();
      const secondCategories = result.current.categories;

      expect(firstCategories).toBe(secondCategories);
    });
  });
});
