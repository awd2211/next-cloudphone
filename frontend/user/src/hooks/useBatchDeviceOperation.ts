import { useState, useCallback } from 'react';
import { message } from 'antd';
import {
  batchStartDevices,
  batchStopDevices,
  batchRestartDevices,
  batchDeleteDevices,
  batchInstallApp,
} from '@/services/device';
import type { BatchOperationResult } from '@/components/Device';

/**
 * 批量设备操作 Hook
 *
 * 功能：
 * 1. 批量启动/停止/重启设备
 * 2. 批量删除设备
 * 3. 批量安装应用
 * 4. 实时更新操作进度
 * 5. 错误处理和结果统计
 */
export const useBatchDeviceOperation = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [operationType, setOperationType] = useState('');
  const [results, setResults] = useState<BatchOperationResult[]>([]);
  const [installAppModalVisible, setInstallAppModalVisible] = useState(false);

  /**
   * 初始化结果列表
   */
  const initResults = useCallback(
    (
      deviceIds: string[],
      deviceNames: Record<string, string>
    ): BatchOperationResult[] => {
      return deviceIds.map((id) => ({
        deviceId: id,
        deviceName: deviceNames[id] || id,
        status: 'pending',
      }));
    },
    []
  );

  /**
   * 更新单个设备的状态
   */
  const updateDeviceStatus = useCallback(
    (
      deviceId: string,
      status: BatchOperationResult['status'],
      errorMessage?: string
    ) => {
      setResults((prev) =>
        prev.map((item) =>
          item.deviceId === deviceId
            ? { ...item, status, errorMessage }
            : item
        )
      );
    },
    []
  );

  /**
   * 批量启动设备
   */
  const handleBatchStart = useCallback(
    async (deviceIds: string[], deviceNames: Record<string, string>) => {
      setModalTitle('批量启动设备');
      setOperationType('启动');
      setResults(initResults(deviceIds, deviceNames));
      setModalVisible(true);

      try {
        // 设置所有设备为处理中
        deviceIds.forEach((id) => {
          updateDeviceStatus(id, 'processing');
        });

        // 调用批量启动 API
        const response = await batchStartDevices({ deviceIds });

        // 更新每个设备的结果
        response.results.forEach((result: any) => {
          updateDeviceStatus(
            result.deviceId,
            result.success ? 'success' : 'failed',
            result.error
          );
        });

        // 显示总结消息
        const successCount = response.results.filter((r: any) => r.success).length;
        const failedCount = response.results.length - successCount;

        if (failedCount === 0) {
          message.success(`成功启动 ${successCount} 个设备`);
        } else {
          message.warning(
            `启动完成：${successCount} 个成功，${failedCount} 个失败`
          );
        }
      } catch (error: any) {
        // 所有设备标记为失败
        deviceIds.forEach((id) => {
          updateDeviceStatus(
            id,
            'failed',
            error.response?.data?.message || '启动失败'
          );
        });
        message.error('批量启动失败');
      }
    },
    [initResults, updateDeviceStatus]
  );

  /**
   * 批量停止设备
   */
  const handleBatchStop = useCallback(
    async (deviceIds: string[], deviceNames: Record<string, string>) => {
      setModalTitle('批量停止设备');
      setOperationType('停止');
      setResults(initResults(deviceIds, deviceNames));
      setModalVisible(true);

      try {
        deviceIds.forEach((id) => {
          updateDeviceStatus(id, 'processing');
        });

        const response = await batchStopDevices({ deviceIds });

        response.results.forEach((result: any) => {
          updateDeviceStatus(
            result.deviceId,
            result.success ? 'success' : 'failed',
            result.error
          );
        });

        const successCount = response.results.filter((r: any) => r.success).length;
        const failedCount = response.results.length - successCount;

        if (failedCount === 0) {
          message.success(`成功停止 ${successCount} 个设备`);
        } else {
          message.warning(
            `停止完成：${successCount} 个成功，${failedCount} 个失败`
          );
        }
      } catch (error: any) {
        deviceIds.forEach((id) => {
          updateDeviceStatus(
            id,
            'failed',
            error.response?.data?.message || '停止失败'
          );
        });
        message.error('批量停止失败');
      }
    },
    [initResults, updateDeviceStatus]
  );

  /**
   * 批量重启设备
   */
  const handleBatchRestart = useCallback(
    async (deviceIds: string[], deviceNames: Record<string, string>) => {
      setModalTitle('批量重启设备');
      setOperationType('重启');
      setResults(initResults(deviceIds, deviceNames));
      setModalVisible(true);

      try {
        deviceIds.forEach((id) => {
          updateDeviceStatus(id, 'processing');
        });

        const response = await batchRestartDevices({ deviceIds });

        response.results.forEach((result: any) => {
          updateDeviceStatus(
            result.deviceId,
            result.success ? 'success' : 'failed',
            result.error
          );
        });

        const successCount = response.results.filter((r: any) => r.success).length;
        const failedCount = response.results.length - successCount;

        if (failedCount === 0) {
          message.success(`成功重启 ${successCount} 个设备`);
        } else {
          message.warning(
            `重启完成：${successCount} 个成功，${failedCount} 个失败`
          );
        }
      } catch (error: any) {
        deviceIds.forEach((id) => {
          updateDeviceStatus(
            id,
            'failed',
            error.response?.data?.message || '重启失败'
          );
        });
        message.error('批量重启失败');
      }
    },
    [initResults, updateDeviceStatus]
  );

  /**
   * 批量删除设备
   */
  const handleBatchDelete = useCallback(
    async (
      deviceIds: string[],
      deviceNames: Record<string, string>,
      onSuccess?: () => void
    ) => {
      setModalTitle('批量删除设备');
      setOperationType('删除');
      setResults(initResults(deviceIds, deviceNames));
      setModalVisible(true);

      try {
        deviceIds.forEach((id) => {
          updateDeviceStatus(id, 'processing');
        });

        const response = await batchDeleteDevices({ deviceIds });

        response.results.forEach((result: any) => {
          updateDeviceStatus(
            result.deviceId,
            result.success ? 'success' : 'failed',
            result.error
          );
        });

        const successCount = response.results.filter((r: any) => r.success).length;
        const failedCount = response.results.length - successCount;

        if (failedCount === 0) {
          message.success(`成功删除 ${successCount} 个设备`);
          onSuccess?.();
        } else {
          message.warning(
            `删除完成：${successCount} 个成功，${failedCount} 个失败`
          );
          if (successCount > 0) {
            onSuccess?.();
          }
        }
      } catch (error: any) {
        deviceIds.forEach((id) => {
          updateDeviceStatus(
            id,
            'failed',
            error.response?.data?.message || '删除失败'
          );
        });
        message.error('批量删除失败');
      }
    },
    [initResults, updateDeviceStatus]
  );

  /**
   * 批量安装应用
   */
  const handleBatchInstallApp = useCallback(
    async (
      appId: string,
      deviceIds: string[],
      deviceNames: Record<string, string>
    ) => {
      setModalTitle('批量安装应用');
      setOperationType('安装应用');
      setResults(initResults(deviceIds, deviceNames));
      setModalVisible(true);
      setInstallAppModalVisible(false);

      try {
        deviceIds.forEach((id) => {
          updateDeviceStatus(id, 'processing');
        });

        const response = await batchInstallApp({ appId, deviceIds });

        response.results.forEach((result: any) => {
          updateDeviceStatus(
            result.deviceId,
            result.success ? 'success' : 'failed',
            result.error
          );
        });

        const successCount = response.results.filter((r: any) => r.success).length;
        const failedCount = response.results.length - successCount;

        if (failedCount === 0) {
          message.success(`成功为 ${successCount} 个设备安装应用`);
        } else {
          message.warning(
            `安装完成：${successCount} 个成功，${failedCount} 个失败`
          );
        }
      } catch (error: any) {
        deviceIds.forEach((id) => {
          updateDeviceStatus(
            id,
            'failed',
            error.response?.data?.message || '安装失败'
          );
        });
        message.error('批量安装应用失败');
      }
    },
    [initResults, updateDeviceStatus]
  );

  /**
   * 关闭进度模态框
   */
  const closeModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  /**
   * 打开批量安装应用模态框
   */
  const openInstallAppModal = useCallback(() => {
    setInstallAppModalVisible(true);
  }, []);

  /**
   * 关闭批量安装应用模态框
   */
  const closeInstallAppModal = useCallback(() => {
    setInstallAppModalVisible(false);
  }, []);

  return {
    // 状态
    modalVisible,
    modalTitle,
    operationType,
    results,
    installAppModalVisible,

    // 操作方法
    handleBatchStart,
    handleBatchStop,
    handleBatchRestart,
    handleBatchDelete,
    handleBatchInstallApp,
    openInstallAppModal,
    closeInstallAppModal,
    closeModal,
  };
};
