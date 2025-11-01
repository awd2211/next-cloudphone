import { useState, useEffect, useCallback } from 'react';
import { message, Form } from 'antd';
import type { UploadFile } from 'antd';
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
import type { Device } from '@/types';
import dayjs from 'dayjs';

export const useDeviceDetail = (deviceId: string | undefined) => {
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(false);
  const [installedApps, setInstalledApps] = useState<string[]>([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  // 应用操作相关状态
  const [appOperationModalVisible, setAppOperationModalVisible] = useState(false);
  const [appOperationType, setAppOperationType] = useState<'start' | 'stop' | 'clear-data'>('start');

  // 快照管理相关状态
  const [createSnapshotModalVisible, setCreateSnapshotModalVisible] = useState(false);
  const [restoreSnapshotModalVisible, setRestoreSnapshotModalVisible] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>();
  const [selectedSnapshotName, setSelectedSnapshotName] = useState<string>();

  const loadDevice = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const data = await getDevice(deviceId);
      setDevice(data);
    } catch (error) {
      message.error('加载设备信息失败');
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  const loadInstalledApps = useCallback(async () => {
    if (!deviceId) return;
    try {
      const packages = await getInstalledPackages(deviceId);
      const appNames = packages.map((pkg) => pkg.name);
      setInstalledApps(appNames);
    } catch (error) {
      message.error('加载已安装应用失败');
    }
  }, [deviceId]);

  useEffect(() => {
    loadDevice();
    loadInstalledApps();
  }, [loadDevice, loadInstalledApps]);

  const handleStart = useCallback(async () => {
    if (!deviceId) return;
    try {
      await startDevice(deviceId);
      message.success('设备启动成功');
      loadDevice();
    } catch (error) {
      message.error('设备启动失败');
    }
  }, [deviceId, loadDevice]);

  const handleStop = useCallback(async () => {
    if (!deviceId) return;
    try {
      await stopDevice(deviceId);
      message.success('设备停止成功');
      loadDevice();
    } catch (error) {
      message.error('设备停止失败');
    }
  }, [deviceId, loadDevice]);

  const handleRestart = useCallback(async () => {
    if (!deviceId) return;
    try {
      await rebootDevice(deviceId);
      message.success('设备重启成功');
      loadDevice();
    } catch (error) {
      message.error('设备重启失败');
    }
  }, [deviceId, loadDevice]);

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
      loadInstalledApps();
    } catch (error) {
      message.error('应用安装失败');
    }
  }, [deviceId, fileList, form, loadInstalledApps]);

  const handleUninstallApp = useCallback(
    async (packageName: string) => {
      if (!deviceId) return;
      try {
        await uninstallApp(deviceId, packageName);
        message.success('应用卸载成功');
        loadInstalledApps();
      } catch (error) {
        message.error('应用卸载失败');
      }
    },
    [deviceId, loadInstalledApps]
  );

  const handleOpenAppOperation = useCallback((type: 'start' | 'stop' | 'clear-data') => {
    setAppOperationType(type);
    setAppOperationModalVisible(true);
  }, []);

  const handleAppOperationSuccess = useCallback(() => {
    setAppOperationModalVisible(false);
    loadDevice();
  }, [loadDevice]);

  const handleCreateSnapshotSuccess = useCallback(() => {
    setCreateSnapshotModalVisible(false);
    message.success('快照创建成功');
  }, []);

  const handleRestoreSnapshot = useCallback((snapshotId: string, snapshotName: string) => {
    setSelectedSnapshotId(snapshotId);
    setSelectedSnapshotName(snapshotName);
    setRestoreSnapshotModalVisible(true);
  }, []);

  const handleRestoreSnapshotSuccess = useCallback(() => {
    setRestoreSnapshotModalVisible(false);
    setSelectedSnapshotId(undefined);
    setSelectedSnapshotName(undefined);
    message.success('快照恢复成功，设备将重启');
    setTimeout(() => {
      loadDevice();
    }, 3000);
  }, [loadDevice]);

  const handleCancelInstallApp = useCallback(() => {
    setUploadModalVisible(false);
    setFileList([]);
    form.resetFields();
  }, [form]);

  const handleCancelRestoreSnapshot = useCallback(() => {
    setRestoreSnapshotModalVisible(false);
    setSelectedSnapshotId(undefined);
    setSelectedSnapshotName(undefined);
  }, []);

  return {
    device,
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
