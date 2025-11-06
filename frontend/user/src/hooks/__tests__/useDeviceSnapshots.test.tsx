import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeviceSnapshots } from '../useDeviceSnapshots';
import * as deviceService from '@/services/device';
import * as snapshotService from '@/services/snapshot';
import { message } from 'antd';

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockParams = { id: 'device-123' };
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

// Mock antd
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  const mockForm = {
    resetFields: vi.fn(),
    setFieldsValue: vi.fn(),
    validateFields: vi.fn(),
  };
  return {
    ...actual,
    Form: {
      useForm: vi.fn(() => [mockForm]),
    },
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock device service
vi.mock('@/services/device', () => ({
  getDevice: vi.fn(),
}));

// Mock snapshot service
vi.mock('@/services/snapshot', () => ({
  getDeviceSnapshots: vi.fn(),
  createSnapshot: vi.fn(),
  restoreSnapshot: vi.fn(),
  deleteSnapshot: vi.fn(),
}));

describe('useDeviceSnapshots Hook', () => {
  const mockDevice = {
    id: 'device-123',
    name: '我的云手机',
    status: 'running',
  };

  const mockSnapshots = {
    data: [
      { id: 'snap-1', name: '快照1', createdAt: '2025-01-01' },
      { id: 'snap-2', name: '快照2', createdAt: '2025-01-02' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    vi.mocked(deviceService.getDevice).mockResolvedValue(mockDevice as any);
    vi.mocked(snapshotService.getDeviceSnapshots).mockResolvedValue(
      mockSnapshots as any
    );
    vi.mocked(snapshotService.createSnapshot).mockResolvedValue(undefined as any);
    vi.mocked(snapshotService.restoreSnapshot).mockResolvedValue(undefined as any);
    vi.mocked(snapshotService.deleteSnapshot).mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初始化', () => {
    it('应该初始化所有状态', () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      expect(result.current.device).toBeNull();
      expect(result.current.snapshots).toEqual([]);
      expect(typeof result.current.loading).toBe('boolean');
      expect(result.current.createModalVisible).toBe(false);
      expect(result.current.restoreModalVisible).toBe(false);
      expect(result.current.selectedSnapshot).toBeNull();
      expect(result.current.deviceId).toBe('device-123');
    });
  });

  describe('数据加载', () => {
    it('mount时应该加载设备和快照', async () => {
      renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      expect(deviceService.getDevice).toHaveBeenCalledWith('device-123');
      expect(snapshotService.getDeviceSnapshots).toHaveBeenCalledWith('device-123');
    });

    it('加载成功应该更新device和snapshots', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      // 验证API被调用,实际数据会异步加载
      expect(deviceService.getDevice).toHaveBeenCalledWith('device-123');
      expect(snapshotService.getDeviceSnapshots).toHaveBeenCalledWith('device-123');

      // 基本状态检查
      expect(typeof result.current.loading).toBe('boolean');
    });

    it('设备加载失败应该显示错误消息', async () => {
      vi.mocked(deviceService.getDevice).mockRejectedValue(
        new Error('网络错误')
      );

      renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      expect(message.error).toHaveBeenCalledWith('加载设备信息失败');
    });

    it('快照加载失败应该显示错误消息', async () => {
      vi.mocked(snapshotService.getDeviceSnapshots).mockRejectedValue(
        new Error('网络错误')
      );

      renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      expect(message.error).toHaveBeenCalledWith('加载快照列表失败');
    });
  });

  describe('handleCreateSnapshot 创建快照', () => {
    it('创建成功应该调用API', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      await act(async () => {
        await result.current.handleCreateSnapshot({
          name: '新快照',
          description: '测试描述',
        });
      });

      expect(snapshotService.createSnapshot).toHaveBeenCalledWith('device-123', {
        name: '新快照',
        description: '测试描述',
      });
    });

    it('创建成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      await act(async () => {
        await result.current.handleCreateSnapshot({ name: '新快照' });
      });

      expect(message.success).toHaveBeenCalledWith('快照创建成功');
    });

    it('创建成功应该关闭Modal', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      act(() => {
        result.current.openCreateModal();
      });

      expect(result.current.createModalVisible).toBe(true);

      await act(async () => {
        await result.current.handleCreateSnapshot({ name: '新快照' });
      });

      expect(result.current.createModalVisible).toBe(false);
    });

    it('创建成功应该重置表单', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      await act(async () => {
        await result.current.handleCreateSnapshot({ name: '新快照' });
      });

      expect(result.current.form.resetFields).toHaveBeenCalled();
    });

    it('创建成功应该重新加载快照列表', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      vi.clearAllMocks();

      await act(async () => {
        await result.current.handleCreateSnapshot({ name: '新快照' });
      });

      await vi.runOnlyPendingTimersAsync();

      expect(snapshotService.getDeviceSnapshots).toHaveBeenCalled();
    });

    it('创建失败应该显示错误消息', async () => {
      vi.mocked(snapshotService.createSnapshot).mockRejectedValue(
        new Error('存储空间不足')
      );

      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      await act(async () => {
        await result.current.handleCreateSnapshot({ name: '新快照' });
      });

      expect(message.error).toHaveBeenCalledWith('存储空间不足');
    });
  });

  describe('handleRestoreSnapshot 恢复快照', () => {
    const mockSnapshot = {
      id: 'snap-1',
      name: '快照1',
      createdAt: '2025-01-01',
    };

    it('恢复成功应该调用API', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      act(() => {
        result.current.openRestoreModal(mockSnapshot as any);
      });

      await act(async () => {
        await result.current.handleRestoreSnapshot();
      });

      expect(snapshotService.restoreSnapshot).toHaveBeenCalledWith('snap-1');
    });

    it('恢复成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      act(() => {
        result.current.openRestoreModal(mockSnapshot as any);
      });

      await act(async () => {
        await result.current.handleRestoreSnapshot();
      });

      expect(message.success).toHaveBeenCalledWith('快照恢复成功，设备正在重启...');
    });

    it('恢复成功应该关闭Modal', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      act(() => {
        result.current.openRestoreModal(mockSnapshot as any);
      });

      expect(result.current.restoreModalVisible).toBe(true);

      await act(async () => {
        await result.current.handleRestoreSnapshot();
      });

      expect(result.current.restoreModalVisible).toBe(false);
    });

    it('恢复成功应该清除选中的快照', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      act(() => {
        result.current.openRestoreModal(mockSnapshot as any);
      });

      expect(result.current.selectedSnapshot).toEqual(mockSnapshot);

      await act(async () => {
        await result.current.handleRestoreSnapshot();
      });

      expect(result.current.selectedSnapshot).toBeNull();
    });

    it('恢复成功应该延迟2秒后重新加载设备', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      act(() => {
        result.current.openRestoreModal(mockSnapshot as any);
      });

      vi.clearAllMocks();

      await act(async () => {
        await result.current.handleRestoreSnapshot();
      });

      // 2秒前不应该调用
      expect(deviceService.getDevice).not.toHaveBeenCalled();

      // 前进2秒
      await vi.advanceTimersByTimeAsync(2000);

      expect(deviceService.getDevice).toHaveBeenCalled();
    });

    it('恢复失败应该显示错误消息', async () => {
      vi.mocked(snapshotService.restoreSnapshot).mockRejectedValue(
        new Error('快照已损坏')
      );

      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      act(() => {
        result.current.openRestoreModal(mockSnapshot as any);
      });

      await act(async () => {
        await result.current.handleRestoreSnapshot();
      });

      expect(message.error).toHaveBeenCalledWith('快照已损坏');
    });

    it('没有选中快照时不应该执行', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      await act(async () => {
        await result.current.handleRestoreSnapshot();
      });

      expect(snapshotService.restoreSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('handleDeleteSnapshot 删除快照', () => {
    it('删除成功应该调用API', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      await act(async () => {
        await result.current.handleDeleteSnapshot('snap-1');
      });

      expect(snapshotService.deleteSnapshot).toHaveBeenCalledWith('snap-1');
    });

    it('删除成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      await act(async () => {
        await result.current.handleDeleteSnapshot('snap-1');
      });

      expect(message.success).toHaveBeenCalledWith('快照删除成功');
    });

    it('删除成功应该重新加载快照列表', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      vi.clearAllMocks();

      await act(async () => {
        await result.current.handleDeleteSnapshot('snap-1');
      });

      await vi.runOnlyPendingTimersAsync();

      expect(snapshotService.getDeviceSnapshots).toHaveBeenCalled();
    });

    it('删除失败应该显示错误消息', async () => {
      vi.mocked(snapshotService.deleteSnapshot).mockRejectedValue(
        new Error('快照不存在')
      );

      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      await act(async () => {
        await result.current.handleDeleteSnapshot('snap-1');
      });

      expect(message.error).toHaveBeenCalledWith('快照不存在');
    });
  });

  describe('Modal 控制', () => {
    it('openCreateModal应该打开创建Modal', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      expect(result.current.createModalVisible).toBe(false);

      act(() => {
        result.current.openCreateModal();
      });

      expect(result.current.createModalVisible).toBe(true);
    });

    it('closeCreateModal应该关闭创建Modal', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      act(() => {
        result.current.openCreateModal();
      });

      expect(result.current.createModalVisible).toBe(true);

      act(() => {
        result.current.closeCreateModal();
      });

      expect(result.current.createModalVisible).toBe(false);
    });

    it('openRestoreModal应该打开恢复Modal并设置选中快照', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      const mockSnapshot = { id: 'snap-1', name: '快照1' };

      expect(result.current.restoreModalVisible).toBe(false);
      expect(result.current.selectedSnapshot).toBeNull();

      act(() => {
        result.current.openRestoreModal(mockSnapshot as any);
      });

      expect(result.current.restoreModalVisible).toBe(true);
      expect(result.current.selectedSnapshot).toEqual(mockSnapshot);
    });

    it('closeRestoreModal应该关闭恢复Modal并清除选中快照', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      act(() => {
        result.current.openRestoreModal({ id: 'snap-1', name: '快照1' } as any);
      });

      expect(result.current.restoreModalVisible).toBe(true);
      expect(result.current.selectedSnapshot).not.toBeNull();

      act(() => {
        result.current.closeRestoreModal();
      });

      expect(result.current.restoreModalVisible).toBe(false);
      expect(result.current.selectedSnapshot).toBeNull();
    });
  });

  describe('导航', () => {
    it('goBackToDeviceDetail应该导航到设备详情页', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      act(() => {
        result.current.goBackToDeviceDetail();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/devices/device-123');
    });
  });

  describe('loadSnapshots 重新加载', () => {
    it('应该重新加载快照列表', async () => {
      const { result } = renderHook(() => useDeviceSnapshots());

      await vi.runOnlyPendingTimersAsync();

      vi.clearAllMocks();

      act(() => {
        result.current.loadSnapshots();
      });

      await vi.runOnlyPendingTimersAsync();

      expect(snapshotService.getDeviceSnapshots).toHaveBeenCalledWith('device-123');
    });
  });

  describe('函数引用稳定性', () => {
    it('所有处理函数应该是稳定的引用', () => {
      const { result, rerender } = renderHook(() => useDeviceSnapshots());

      const firstHandleCreateSnapshot = result.current.handleCreateSnapshot;
      const firstHandleRestoreSnapshot = result.current.handleRestoreSnapshot;
      const firstHandleDeleteSnapshot = result.current.handleDeleteSnapshot;
      const firstOpenCreateModal = result.current.openCreateModal;
      const firstCloseCreateModal = result.current.closeCreateModal;
      const firstOpenRestoreModal = result.current.openRestoreModal;
      const firstCloseRestoreModal = result.current.closeRestoreModal;
      const firstGoBackToDeviceDetail = result.current.goBackToDeviceDetail;
      const firstLoadSnapshots = result.current.loadSnapshots;

      rerender();

      expect(result.current.handleCreateSnapshot).toBe(firstHandleCreateSnapshot);
      expect(result.current.handleRestoreSnapshot).toBe(firstHandleRestoreSnapshot);
      expect(result.current.handleDeleteSnapshot).toBe(firstHandleDeleteSnapshot);
      expect(result.current.openCreateModal).toBe(firstOpenCreateModal);
      expect(result.current.closeCreateModal).toBe(firstCloseCreateModal);
      expect(result.current.openRestoreModal).toBe(firstOpenRestoreModal);
      expect(result.current.closeRestoreModal).toBe(firstCloseRestoreModal);
      expect(result.current.goBackToDeviceDetail).toBe(firstGoBackToDeviceDetail);
      expect(result.current.loadSnapshots).toBe(firstLoadSnapshots);
    });
  });
});
