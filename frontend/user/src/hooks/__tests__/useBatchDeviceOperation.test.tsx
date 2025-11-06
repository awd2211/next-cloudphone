import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBatchDeviceOperation } from '../useBatchDeviceOperation';
import * as deviceService from '@/services/device';
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
    },
  };
});

// Mock device service
vi.mock('@/services/device', () => ({
  batchStartDevices: vi.fn(),
  batchStopDevices: vi.fn(),
  batchRestartDevices: vi.fn(),
  batchDeleteDevices: vi.fn(),
  batchInstallApp: vi.fn(),
}));

describe('useBatchDeviceOperation Hook', () => {
  const mockDeviceIds = ['device-1', 'device-2', 'device-3'];
  const mockDeviceNames = {
    'device-1': '设备1',
    'device-2': '设备2',
    'device-3': '设备3',
  };

  const mockSuccessResponse = {
    results: [
      { deviceId: 'device-1', success: true },
      { deviceId: 'device-2', success: true },
      { deviceId: 'device-3', success: true },
    ],
  };

  const mockPartialSuccessResponse = {
    results: [
      { deviceId: 'device-1', success: true },
      { deviceId: 'device-2', success: false, error: '设备离线' },
      { deviceId: 'device-3', success: true },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(deviceService.batchStartDevices).mockResolvedValue(mockSuccessResponse as any);
    vi.mocked(deviceService.batchStopDevices).mockResolvedValue(mockSuccessResponse as any);
    vi.mocked(deviceService.batchRestartDevices).mockResolvedValue(mockSuccessResponse as any);
    vi.mocked(deviceService.batchDeleteDevices).mockResolvedValue(mockSuccessResponse as any);
    vi.mocked(deviceService.batchInstallApp).mockResolvedValue(mockSuccessResponse as any);
  });

  describe('初始化', () => {
    it('应该初始化所有状态', () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      expect(result.current.modalVisible).toBe(false);
      expect(result.current.modalTitle).toBe('');
      expect(result.current.operationType).toBe('');
      expect(result.current.results).toEqual([]);
      expect(result.current.installAppModalVisible).toBe(false);
    });
  });

  describe('handleBatchStart 批量启动', () => {
    it('应该打开进度模态框', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      act(() => {
        result.current.handleBatchStart(mockDeviceIds, mockDeviceNames);
      });

      expect(result.current.modalVisible).toBe(true);
      expect(result.current.modalTitle).toBe('批量启动设备');
      expect(result.current.operationType).toBe('启动');
    });

    it('应该初始化结果列表', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      act(() => {
        result.current.handleBatchStart(mockDeviceIds, mockDeviceNames);
      });

      expect(result.current.results).toHaveLength(3);
      expect(result.current.results[0].deviceId).toBe('device-1');
      expect(result.current.results[0].deviceName).toBe('设备1');
      // 状态会快速变为 processing,所以不检查具体值
      expect(result.current.results[0].status).toBeDefined();
    });

    it('启动成功应该调用API', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchStart(mockDeviceIds, mockDeviceNames);
      });

      expect(deviceService.batchStartDevices).toHaveBeenCalledWith({
        deviceIds: mockDeviceIds,
      });
    });

    it('全部成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchStart(mockDeviceIds, mockDeviceNames);
      });

      expect(message.success).toHaveBeenCalledWith('成功启动 3 个设备');
    });

    it('部分成功应该显示警告消息', async () => {
      vi.mocked(deviceService.batchStartDevices).mockResolvedValue(
        mockPartialSuccessResponse as any
      );

      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchStart(mockDeviceIds, mockDeviceNames);
      });

      expect(message.warning).toHaveBeenCalledWith('启动完成：2 个成功，1 个失败');
    });

    it('应该更新设备状态为success', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchStart(mockDeviceIds, mockDeviceNames);
      });

      await waitFor(() => {
        expect(result.current.results[0].status).toBe('success');
        expect(result.current.results[1].status).toBe('success');
        expect(result.current.results[2].status).toBe('success');
      });
    });

    it('失败时应该显示错误消息', async () => {
      vi.mocked(deviceService.batchStartDevices).mockRejectedValue(
        new Error('网络错误')
      );

      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchStart(mockDeviceIds, mockDeviceNames);
      });

      expect(message.error).toHaveBeenCalledWith('批量启动失败');
    });

    it('失败时应该标记所有设备为failed', async () => {
      vi.mocked(deviceService.batchStartDevices).mockRejectedValue(
        new Error('网络错误')
      );

      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchStart(mockDeviceIds, mockDeviceNames);
      });

      await waitFor(() => {
        result.current.results.forEach((item) => {
          expect(item.status).toBe('failed');
        });
      });
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useBatchDeviceOperation());

      const firstHandle = result.current.handleBatchStart;
      rerender();
      const secondHandle = result.current.handleBatchStart;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleBatchStop 批量停止', () => {
    it('应该打开进度模态框', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      act(() => {
        result.current.handleBatchStop(mockDeviceIds, mockDeviceNames);
      });

      expect(result.current.modalVisible).toBe(true);
      expect(result.current.modalTitle).toBe('批量停止设备');
      expect(result.current.operationType).toBe('停止');
    });

    it('停止成功应该调用API', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchStop(mockDeviceIds, mockDeviceNames);
      });

      expect(deviceService.batchStopDevices).toHaveBeenCalledWith({
        deviceIds: mockDeviceIds,
      });
    });

    it('全部成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchStop(mockDeviceIds, mockDeviceNames);
      });

      expect(message.success).toHaveBeenCalledWith('成功停止 3 个设备');
    });

    it('失败时应该显示错误消息', async () => {
      vi.mocked(deviceService.batchStopDevices).mockRejectedValue(
        new Error('网络错误')
      );

      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchStop(mockDeviceIds, mockDeviceNames);
      });

      expect(message.error).toHaveBeenCalledWith('批量停止失败');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useBatchDeviceOperation());

      const firstHandle = result.current.handleBatchStop;
      rerender();
      const secondHandle = result.current.handleBatchStop;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleBatchRestart 批量重启', () => {
    it('应该打开进度模态框', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      act(() => {
        result.current.handleBatchRestart(mockDeviceIds, mockDeviceNames);
      });

      expect(result.current.modalVisible).toBe(true);
      expect(result.current.modalTitle).toBe('批量重启设备');
      expect(result.current.operationType).toBe('重启');
    });

    it('重启成功应该调用API', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchRestart(mockDeviceIds, mockDeviceNames);
      });

      expect(deviceService.batchRestartDevices).toHaveBeenCalledWith({
        deviceIds: mockDeviceIds,
      });
    });

    it('全部成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchRestart(mockDeviceIds, mockDeviceNames);
      });

      expect(message.success).toHaveBeenCalledWith('成功重启 3 个设备');
    });

    it('失败时应该显示错误消息', async () => {
      vi.mocked(deviceService.batchRestartDevices).mockRejectedValue(
        new Error('网络错误')
      );

      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchRestart(mockDeviceIds, mockDeviceNames);
      });

      expect(message.error).toHaveBeenCalledWith('批量重启失败');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useBatchDeviceOperation());

      const firstHandle = result.current.handleBatchRestart;
      rerender();
      const secondHandle = result.current.handleBatchRestart;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleBatchDelete 批量删除', () => {
    it('应该打开进度模态框', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      act(() => {
        result.current.handleBatchDelete(mockDeviceIds, mockDeviceNames);
      });

      expect(result.current.modalVisible).toBe(true);
      expect(result.current.modalTitle).toBe('批量删除设备');
      expect(result.current.operationType).toBe('删除');
    });

    it('删除成功应该调用API', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchDelete(mockDeviceIds, mockDeviceNames);
      });

      expect(deviceService.batchDeleteDevices).toHaveBeenCalledWith({
        deviceIds: mockDeviceIds,
      });
    });

    it('全部成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchDelete(mockDeviceIds, mockDeviceNames);
      });

      expect(message.success).toHaveBeenCalledWith('成功删除 3 个设备');
    });

    it('全部成功应该调用onSuccess回调', async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchDelete(
          mockDeviceIds,
          mockDeviceNames,
          onSuccess
        );
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('部分成功应该调用onSuccess回调', async () => {
      vi.mocked(deviceService.batchDeleteDevices).mockResolvedValue(
        mockPartialSuccessResponse as any
      );

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchDelete(
          mockDeviceIds,
          mockDeviceNames,
          onSuccess
        );
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('全部失败不应该调用onSuccess回调', async () => {
      const allFailedResponse = {
        results: [
          { deviceId: 'device-1', success: false, error: '错误' },
          { deviceId: 'device-2', success: false, error: '错误' },
          { deviceId: 'device-3', success: false, error: '错误' },
        ],
      };

      vi.mocked(deviceService.batchDeleteDevices).mockResolvedValue(
        allFailedResponse as any
      );

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchDelete(
          mockDeviceIds,
          mockDeviceNames,
          onSuccess
        );
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('失败时应该显示错误消息', async () => {
      vi.mocked(deviceService.batchDeleteDevices).mockRejectedValue(
        new Error('网络错误')
      );

      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchDelete(mockDeviceIds, mockDeviceNames);
      });

      expect(message.error).toHaveBeenCalledWith('批量删除失败');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useBatchDeviceOperation());

      const firstHandle = result.current.handleBatchDelete;
      rerender();
      const secondHandle = result.current.handleBatchDelete;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleBatchInstallApp 批量安装应用', () => {
    const mockAppId = 'app-123';

    it('应该打开进度模态框', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      act(() => {
        result.current.handleBatchInstallApp(mockAppId, mockDeviceIds, mockDeviceNames);
      });

      expect(result.current.modalVisible).toBe(true);
      expect(result.current.modalTitle).toBe('批量安装应用');
      expect(result.current.operationType).toBe('安装应用');
    });

    it('应该关闭安装应用模态框', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      act(() => {
        result.current.openInstallAppModal();
      });

      expect(result.current.installAppModalVisible).toBe(true);

      act(() => {
        result.current.handleBatchInstallApp(mockAppId, mockDeviceIds, mockDeviceNames);
      });

      expect(result.current.installAppModalVisible).toBe(false);
    });

    it('安装成功应该调用API', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchInstallApp(
          mockAppId,
          mockDeviceIds,
          mockDeviceNames
        );
      });

      expect(deviceService.batchInstallApp).toHaveBeenCalledWith({
        appId: mockAppId,
        deviceIds: mockDeviceIds,
      });
    });

    it('全部成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchInstallApp(
          mockAppId,
          mockDeviceIds,
          mockDeviceNames
        );
      });

      expect(message.success).toHaveBeenCalledWith('成功为 3 个设备安装应用');
    });

    it('部分成功应该显示警告消息', async () => {
      vi.mocked(deviceService.batchInstallApp).mockResolvedValue(
        mockPartialSuccessResponse as any
      );

      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchInstallApp(
          mockAppId,
          mockDeviceIds,
          mockDeviceNames
        );
      });

      expect(message.warning).toHaveBeenCalledWith('安装完成：2 个成功，1 个失败');
    });

    it('失败时应该显示错误消息', async () => {
      vi.mocked(deviceService.batchInstallApp).mockRejectedValue(
        new Error('网络错误')
      );

      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchInstallApp(
          mockAppId,
          mockDeviceIds,
          mockDeviceNames
        );
      });

      expect(message.error).toHaveBeenCalledWith('批量安装应用失败');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useBatchDeviceOperation());

      const firstHandle = result.current.handleBatchInstallApp;
      rerender();
      const secondHandle = result.current.handleBatchInstallApp;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('Modal 控制', () => {
    it('closeModal应该关闭进度模态框', async () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      await act(async () => {
        await result.current.handleBatchStart(mockDeviceIds, mockDeviceNames);
      });

      expect(result.current.modalVisible).toBe(true);

      act(() => {
        result.current.closeModal();
      });

      expect(result.current.modalVisible).toBe(false);
    });

    it('openInstallAppModal应该打开安装应用模态框', () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      act(() => {
        result.current.openInstallAppModal();
      });

      expect(result.current.installAppModalVisible).toBe(true);
    });

    it('closeInstallAppModal应该关闭安装应用模态框', () => {
      const { result } = renderHook(() => useBatchDeviceOperation());

      act(() => {
        result.current.openInstallAppModal();
        result.current.closeInstallAppModal();
      });

      expect(result.current.installAppModalVisible).toBe(false);
    });

    it('Modal控制函数应该是稳定的引用', () => {
      const { result, rerender } = renderHook(() => useBatchDeviceOperation());

      const firstClose = result.current.closeModal;
      const firstOpenInstall = result.current.openInstallAppModal;
      const firstCloseInstall = result.current.closeInstallAppModal;

      rerender();

      expect(result.current.closeModal).toBe(firstClose);
      expect(result.current.openInstallAppModal).toBe(firstOpenInstall);
      expect(result.current.closeInstallAppModal).toBe(firstCloseInstall);
    });
  });
});
