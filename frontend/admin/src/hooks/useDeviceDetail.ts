import { useState, useEffect, useCallback } from 'react';
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
import { useSafeApi } from './useSafeApi';
import { DeviceSchema, DevicePackageSchema } from '@/schemas/api.schemas';

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

  // ===== 数据加载 (使用 useSafeApi) =====

  /**
   * 加载设备信息
   */
  const {
    data: device,
    loading,
    execute: executeLoadDevice,
  } = useSafeApi(
    () => {
      if (!deviceId) {
        return Promise.reject(new Error('设备ID不能为空'));
      }
      return getDevice(deviceId);
    },
    DeviceSchema,
    {
      errorMessage: '加载设备信息失败',
      manual: true,
    }
  );

  /**
   * 加载已安装应用
   */
  const {
    data: packages,
    execute: executeLoadInstalledApps,
  } = useSafeApi(
    () => {
      if (!deviceId) {
        return Promise.reject(new Error('设备ID不能为空'));
      }
      return getInstalledPackages(deviceId);
    },
    z.array(DevicePackageSchema),
    {
      errorMessage: '加载已安装应用失败',
      fallbackValue: [],
      manual: true,
    }
  );

  const installedApps = packages?.map((pkg) => pkg.name) || [];

  /**
   * 初始化加载
   */
  useEffect(() => {
    if (deviceId) {
      executeLoadDevice();
      executeLoadInstalledApps();
    }
  }, [deviceId, executeLoadDevice, executeLoadInstalledApps]);

  // ===== 设备操作 =====

  /**
   * 启动设备
   */
  const handleStart = useCallback(async () => {
    if (!deviceId) return;
    try {
      await startDevice(deviceId);
      message.success('设备启动成功');
      executeLoadDevice();
    } catch (error) {
      message.error('设备启动失败');
    }
  }, [deviceId, executeLoadDevice]);

  /**
   * 停止设备
   */
  const handleStop = useCallback(async () => {
    if (!deviceId) return;
    try {
      await stopDevice(deviceId);
      message.success('设备停止成功');
      executeLoadDevice();
    } catch (error) {
      message.error('设备停止失败');
    }
  }, [deviceId, executeLoadDevice]);

  /**
   * 重启设备
   */
  const handleRestart = useCallback(async () => {
    if (!deviceId) return;
    try {
      await rebootDevice(deviceId);
      message.success('设备重启成功');
      executeLoadDevice();
    } catch (error) {
      message.error('设备重启失败');
    }
  }, [deviceId, executeLoadDevice]);

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
      message.error('截图失败');
    }
  }, [deviceId]);

  // ===== 应用管理 =====

  /**
   * 上传并安装应用
   */
  const handleUploadApp = useCallback(async () => {
    if (!deviceId || fileList.length === 0) return;
    const file = fileList[0].originFileObj;
    if (!file) return;

    try {
      await installApp(deviceId, file);
      message.success('应用安装成功');
      setUploadModalVisible(false);
      setFileList([]);
      form.resetFields();
      executeLoadInstalledApps();
    } catch (error) {
      message.error('应用安装失败');
    }
  }, [deviceId, fileList, form, executeLoadInstalledApps]);

  /**
   * 卸载应用
   */
  const handleUninstallApp = useCallback(
    async (packageName: string) => {
      if (!deviceId) return;
      try {
        await uninstallApp(deviceId, packageName);
        message.success('应用卸载成功');
        executeLoadInstalledApps();
      } catch (error) {
        message.error('应用卸载失败');
      }
    },
    [deviceId, executeLoadInstalledApps]
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
    executeLoadDevice();
  }, [executeLoadDevice]);

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
      executeLoadDevice();
    }, 3000);
  }, [executeLoadDevice]);

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
