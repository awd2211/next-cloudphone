import { useState, useMemo, useCallback } from 'react';
import { Form } from 'antd';
import {
  usePhysicalDevices,
  useScanNetworkDevices,
  useRegisterPhysicalDevice,
  useDeletePhysicalDevice,
} from './queries/usePhysicalDevices';
import { usePhysicalDeviceTableColumns } from '@/components/PhysicalDevice/PhysicalDeviceTableColumns';

interface PhysicalDevice {
  id: string;
  status: 'online' | 'offline';
  connectionType: 'network' | 'usb';
  [key: string]: any;
}

export interface ScanResult {
  serialNumber: string;
  model?: string;
  manufacturer?: string;
  androidVersion?: string;
  ipAddress: string;
  status: 'online' | 'offline';
}

export const usePhysicalDeviceList = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<ScanResult | null>(null);
  const [scanForm] = Form.useForm();
  const [registerForm] = Form.useForm();

  // React Query hooks
  const params = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const { data, isLoading } = usePhysicalDevices(params);
  const scanMutation = useScanNetworkDevices();
  const registerMutation = useRegisterPhysicalDevice();
  const deleteMutation = useDeletePhysicalDevice();

  const devices = data?.data || [];
  const total = data?.total || 0;

  /**
   * 扫描网络设备
   */
  const handleScan = useCallback(
    async (values: { networkCidr: string }) => {
      const results = await scanMutation.mutateAsync(values);
      setScanResults(results as ScanResult[]);
    },
    [scanMutation]
  );

  /**
   * 注册物理设备
   */
  const handleRegister = useCallback(
    async (values: any) => {
      await registerMutation.mutateAsync(values);
      setRegisterModalVisible(false);
      registerForm.resetFields();
      setSelectedDevice(null);
    },
    [registerMutation, registerForm]
  );

  /**
   * 打开注册模态框
   */
  const openRegisterModal = useCallback(
    (device?: ScanResult) => {
      if (device) {
        setSelectedDevice(device);
        registerForm.setFieldsValue({
          serialNumber: device.serialNumber,
          connectionType: 'network',
          ipAddress: device.ipAddress,
          adbPort: 5555,
          name: `${device.manufacturer || ''} ${device.model || ''}`.trim() || device.serialNumber,
        });
      } else {
        setSelectedDevice(null);
        registerForm.resetFields();
      }
      setRegisterModalVisible(true);
    },
    [registerForm]
  );

  /**
   * 删除设备
   */
  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  /**
   * 关闭扫描模态框
   */
  const handleCloseScanModal = useCallback(() => {
    setScanModalVisible(false);
    scanForm.resetFields();
    setScanResults([]);
  }, [scanForm]);

  /**
   * 关闭注册模态框
   */
  const handleCloseRegisterModal = useCallback(() => {
    setRegisterModalVisible(false);
    registerForm.resetFields();
    setSelectedDevice(null);
  }, [registerForm]);

  // 表格列定义
  const columns = usePhysicalDeviceTableColumns({
    onDelete: handleDelete,
  });

  // 统计数据
  const stats = useMemo(
    () => ({
      total: devices.length,
      online: (devices as PhysicalDevice[]).filter(d => d.status === 'online').length,
      offline: (devices as PhysicalDevice[]).filter(d => d.status === 'offline').length,
      networkDevices: (devices as PhysicalDevice[]).filter(d => d.connectionType === 'network').length,
    }),
    [devices]
  );

  const onlineRate = useMemo(
    () => (stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0),
    [stats.total, stats.online]
  );

  return {
    // 数据状态
    devices,
    total,
    isLoading,
    page,
    pageSize,
    stats,
    onlineRate,
    // 模态框状态
    scanModalVisible,
    registerModalVisible,
    scanResults,
    selectedDevice,
    scanForm,
    registerForm,
    // 表格列
    columns,
    // 状态更新函数
    setPage,
    setPageSize,
    setScanModalVisible,
    // 操作函数
    handleScan,
    handleRegister,
    openRegisterModal,
    handleCloseScanModal,
    handleCloseRegisterModal,
    // 加载状态
    isScanning: scanMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
};
