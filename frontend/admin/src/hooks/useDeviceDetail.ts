import { useState, useCallback } from 'react';
import { message, Form } from 'antd';
import type { UploadFile } from 'antd';
import { z } from 'zod';
import {
  getDevice,
  startDevice,
  stopDevice,
  rebootDevice,
  installApp,
  uninstallApp,
  getInstalledPackages,
  takeScreenshot,
} from '@/services/device';
import dayjs from 'dayjs';
import { useValidatedQuery } from '@/hooks/utils';
import { DeviceSchema, DevicePackageSchema } from '@/schemas/api.schemas';
import { handleError } from '@/utils/errorHandling';

/**
 * 设备详情页面业务逻辑 Hook
 *
 * 功能:
 * 1. 数据加载 (设备信息、已安装应用) - 使用 useSafeApi + Zod 验证
 * 2. 设备操作 (启动、停止、重启、截图)
 * 3. 应用管理 (安装、卸载)
 * 4. 快照管理
 * 5. Modal 状态管理
 */
export const useDeviceDetail = (deviceId: string | undefined) => {
  // ===== Upload 和 Form 状态 =====
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  // ===== 应用操作相关状态 =====
  const [appOperationModalVisible, setAppOperationModalVisible] = useState(false);
  const [appOperationType, setAppOperationType] = useState<'start' | 'stop' | 'clear-data'>('start');

  // ===== 快照管理相关状态 =====
  const [createSnapshotModalVisible, setCreateSnapshotModalVisible] = useState(false);
  const [restoreSnapshotModalVisible, setRestoreSnapshotModalVisible] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>();
  const [selectedSnapshotName, setSelectedSnapshotName] = useState<string>();

  // ===== 数据加载 (使用 useValidatedQuery) =====

  /**
   * 加载设备信息
   */
  const {
    data: device,
    isLoading: loading,
    isError: hasError,
    error: deviceError,
    refetch: loadDevice,
  } = useValidatedQuery({
    queryKey: ['device-detail', deviceId],
    queryFn: () => {
      if (!deviceId) {
        return Promise.reject(new Error('设备ID不能为空'));
      }
      return getDevice(deviceId);
    },
    schema: DeviceSchema,
    apiErrorMessage: '加载设备信息失败',
    enabled: !!deviceId,
    staleTime: 10 * 1000, // 设备状态变化较快，10秒缓存
  });

  /**
   * 加载已安装应用
   */
  const {
    data: packages,
    refetch: loadInstalledApps,
  } = useValidatedQuery({
    queryKey: ['device-packages', deviceId],
    queryFn: () => {
      if (!deviceId) {
        return Promise.reject(new Error('设备ID不能为空'));
      }
      return getInstalledPackages(deviceId);
    },
    schema: z.array(DevicePackageSchema),
    apiErrorMessage: '加载已安装应用失败',
    fallbackValue: [],
    enabled: !!deviceId,
    staleTime: 60 * 1000, // 已安装应用变化较慢，60秒缓存
  });

  const installedApps = packages?.map((pkg) => pkg.name) || [];

  // ===== 设备操作 =====

  /**
   * 启动设备
   */
  const handleStart = useCallback(async () => {
    if (!deviceId) return;
    try {
      await startDevice(deviceId);
      message.success('设备启动成功');
      loadDevice();
    } catch (error) {
      handleError(error, {
        customMessage: '设备启动失败，请稍后重试',
        messageType: 'message',
      });
    }
  }, [deviceId, loadDevice]);

  /**
   * 停止设备
   */
  const handleStop = useCallback(async () => {
    if (!deviceId) return;
    try {
      await stopDevice(deviceId);
      message.success('设备停止成功');
      loadDevice();
    } catch (error) {
      handleError(error, {
        customMessage: '设备停止失败，请稍后重试',
        messageType: 'message',
      });
    }
  }, [deviceId, loadDevice]);

  /**
   * 重启设备
   */
  const handleRestart = useCallback(async () => {
    if (!deviceId) return;
    try {
      await rebootDevice(deviceId);
      message.success('设备重启成功');
      loadDevice();
    } catch (error) {
      handleError(error, {
        customMessage: '设备重启失败，请稍后重试',
        messageType: 'message',
      });
    }
  }, [deviceId, loadDevice]);

  /**
   * 截图
   */
  const handleScreenshot = useCallback(async () => {
    if (!deviceId) return;
    try {
      const blob = await takeScreenshot(deviceId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `screenshot-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('截图成功');
    } catch (error) {
      handleError(error, {
        customMessage: '截图失败，设备可能未响应',
        messageType: 'message',
      });
    }
  }, [deviceId]);

  // ===== 应用管理 =====

  /**
   * 上传并安装应用
   */
  const handleUploadApp = useCallback(async () => {
    if (!deviceId || fileList.length === 0) return;
    const file = fileList[0]?.originFileObj;
    if (!file) return;

    try {
      await installApp(deviceId, file);
      message.success('应用安装成功');
      setUploadModalVisible(false);
      setFileList([]);
      form.resetFields();
      loadInstalledApps();
    } catch (error) {
      handleError(error, {
        customMessage: '应用安装失败，请检查APK文件是否正确',
        messageType: 'notification',
      });
    }
  }, [deviceId, fileList, form, loadInstalledApps]);

  /**
   * 卸载应用
   */
  const handleUninstallApp = useCallback(
    async (packageName: string) => {
      if (!deviceId) return;
      try {
        await uninstallApp(deviceId, packageName);
        message.success('应用卸载成功');
        loadInstalledApps();
      } catch (error) {
        handleError(error, {
          customMessage: '应用卸载失败，该应用可能正在运行',
          messageType: 'message',
        });
      }
    },
    [deviceId, loadInstalledApps]
  );

  /**
   * 打开应用操作模态框
   */
  const handleOpenAppOperation = useCallback((type: 'start' | 'stop' | 'clear-data') => {
    setAppOperationType(type);
    setAppOperationModalVisible(true);
  }, []);

  /**
   * 应用操作成功回调
   */
  const handleAppOperationSuccess = useCallback(() => {
    setAppOperationModalVisible(false);
    loadDevice();
  }, [loadDevice]);

  // ===== 快照管理 =====

  /**
   * 创建快照成功回调
   */
  const handleCreateSnapshotSuccess = useCallback(() => {
    setCreateSnapshotModalVisible(false);
    message.success('快照创建成功');
  }, []);

  /**
   * 恢复快照
   */
  const handleRestoreSnapshot = useCallback((snapshotId: string, snapshotName: string) => {
    setSelectedSnapshotId(snapshotId);
    setSelectedSnapshotName(snapshotName);
    setRestoreSnapshotModalVisible(true);
  }, []);

  /**
   * 恢复快照成功回调
   */
  const handleRestoreSnapshotSuccess = useCallback(() => {
    setRestoreSnapshotModalVisible(false);
    setSelectedSnapshotId(undefined);
    setSelectedSnapshotName(undefined);
    message.success('快照恢复成功，设备将重启');
    setTimeout(() => {
      loadDevice();
    }, 3000);
  }, [loadDevice]);

  /**
   * 取消安装应用
   */
  const handleCancelInstallApp = useCallback(() => {
    setUploadModalVisible(false);
    setFileList([]);
    form.resetFields();
  }, [form]);

  /**
   * 取消恢复快照
   */
  const handleCancelRestoreSnapshot = useCallback(() => {
    setRestoreSnapshotModalVisible(false);
    setSelectedSnapshotId(undefined);
    setSelectedSnapshotName(undefined);
  }, []);

  return {
    device: device || null,
    loading,
    error: deviceError,
    hasError,
    refetch: loadDevice,
    installedApps,
    uploadModalVisible,
    fileList,
    form,
    appOperationModalVisible,
    appOperationType,
    createSnapshotModalVisible,
    restoreSnapshotModalVisible,
    selectedSnapshotId,
    selectedSnapshotName,
    setUploadModalVisible,
    setFileList,
    setCreateSnapshotModalVisible,
    setAppOperationModalVisible,
    handleStart,
    handleStop,
    handleRestart,
    handleScreenshot,
    handleUploadApp,
    handleUninstallApp,
    handleOpenAppOperation,
    handleAppOperationSuccess,
    handleCreateSnapshotSuccess,
    handleRestoreSnapshot,
    handleRestoreSnapshotSuccess,
    handleCancelInstallApp,
    handleCancelRestoreSnapshot,
  };
};
