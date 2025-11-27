import { useState, useMemo, useCallback, useRef } from 'react';
import { Form, message } from 'antd';
import {
  usePhysicalDevices,
  useScanNetworkDevices,
  useRegisterPhysicalDevice,
  useDeletePhysicalDevice,
} from './queries/usePhysicalDevices';
import { usePhysicalDeviceTableColumns } from '@/components/PhysicalDevice/PhysicalDeviceTableColumns';
import { scanNetworkDevicesStream } from '@/services/device';

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

/** 扫描统计信息 */
export interface ScanStatistics {
  totalIps: number;
  scannedIps: number;
  hostsAlive?: number;
  portsOpen: number;
  adbConnected: number;
  devicesFound: number;
  errors: number;
  startTime: number;
}

/** 扫描阶段 */
export type ScanPhase = 'alive_check' | 'adb_check';

export interface ScanProgress {
  scannedIps: number;
  totalIps: number;
  foundDevices: number;
  currentIp?: string;
  status?: 'scanning' | 'completed' | 'error';
  /** 扫描阶段 */
  phase?: ScanPhase;
  /** 存活主机数（阶段2使用） */
  aliveHosts?: number;
  /** 已检查主机数（阶段2使用） */
  checkedHosts?: number;
  /** 详细统计信息 */
  statistics?: ScanStatistics;
}

/** 扫描参数 */
export interface ScanParams {
  networkCidr: string;
  concurrency?: number;
  timeoutMs?: number;
}

export const usePhysicalDeviceList = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | undefined>(undefined);
  const [scanForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const eventSourceRef = useRef<EventSource | null>(null);

  // React Query hooks
  const params = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const { data, isLoading } = usePhysicalDevices(params);
  const scanMutation = useScanNetworkDevices();
  const registerMutation = useRegisterPhysicalDevice();
  const deleteMutation = useDeletePhysicalDevice();

  const devices = data?.data || [];
  const total = data?.total || 0;

  /**
   * 扫描网络设备（使用 SSE 实时流）
   *
   * 两阶段扫描：
   * 1) 探测存活主机（TCP 端口探测）
   * 2) 检查 ADB 端口
   *
   * 安全特性：
   * - Token 通过 URL 参数传递（EventSource 不支持自定义头）
   * - 后端验证 Token 有效性
   * - 支持取消扫描
   */
  const handleScan = useCallback(
    (values: ScanParams) => {
      // 清理之前的 EventSource
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      setIsScanning(true);
      setScanResults([]);
      setScanProgress({
        scannedIps: 0,
        totalIps: 0,
        foundDevices: 0,
        status: 'scanning',
        phase: 'alive_check',
      });

      // Token 会自动从 localStorage 获取
      const eventSource = scanNetworkDevicesStream({
        networkCidr: values.networkCidr,
        concurrency: values.concurrency || 50,
        timeoutMs: values.timeoutMs || 5000,
      });

      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          // NestJS SSE 将数据包装在 data 字段中，需要解包
          const data = rawData.data || rawData;

          // 忽略心跳消息（仅用于保持连接）
          if (data.type === 'heartbeat') {
            return;
          }

          // 认证失败处理
          if (data.code === 'UNAUTHORIZED') {
            setIsScanning(false);
            eventSource.close();
            eventSourceRef.current = null;
            message.error(data.error || '认证失败，请重新登录');
            return;
          }

          // 更新进度（包含两阶段信息）
          setScanProgress({
            scannedIps: data.scannedIps || 0,
            totalIps: data.totalIps || 0,
            foundDevices: data.foundDevices || 0,
            currentIp: data.currentIp,
            status: data.status,
            // 两阶段扫描相关字段
            phase: data.phase,
            aliveHosts: data.aliveHosts,
            checkedHosts: data.checkedHosts,
            statistics: data.statistics,
          });

          // 如果发现新设备，添加到结果列表
          if (data.newDevice) {
            const device = data.newDevice;
            const result: ScanResult = {
              serialNumber: device.id || device.properties?.serialNumber || '',
              model: device.properties?.model,
              manufacturer: device.properties?.manufacturer,
              androidVersion: device.properties?.androidVersion,
              ipAddress: device.ipAddress,
              status: 'online',
            };
            setScanResults((prev) => {
              // 避免重复
              if (prev.some((d) => d.serialNumber === result.serialNumber)) {
                return prev;
              }
              return [...prev, result];
            });
          }

          // 扫描完成
          if (data.status === 'completed') {
            setIsScanning(false);
            eventSource.close();
            eventSourceRef.current = null;

            // 如果有最终设备列表，使用它
            if (data.devices && Array.isArray(data.devices)) {
              const finalResults: ScanResult[] = data.devices.map((device: any) => ({
                serialNumber: device.id || device.properties?.serialNumber || '',
                model: device.properties?.model,
                manufacturer: device.properties?.manufacturer,
                androidVersion: device.properties?.androidVersion,
                ipAddress: device.ipAddress,
                status: 'online' as const,
              }));
              setScanResults(finalResults);
            }

            if (data.foundDevices > 0) {
              message.success(`扫描完成，发现 ${data.foundDevices} 个设备`);
            } else {
              message.info('扫描完成，未发现设备');
            }
          }

          // 扫描错误
          if (data.status === 'error') {
            setIsScanning(false);
            eventSource.close();
            eventSourceRef.current = null;
            message.error(`扫描失败: ${data.error || '未知错误'}`);
          }
        } catch (e) {
          console.error('Failed to parse SSE message:', e);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        setIsScanning(false);
        eventSource.close();
        eventSourceRef.current = null;
        // 如果已经有结果，不显示错误（可能是正常关闭）
        if (scanProgress?.status !== 'completed') {
          message.error('扫描连接失败，请检查网络或重新登录');
        }
      };
    },
    [scanProgress?.status]
  );

  /**
   * 取消正在进行的扫描
   */
  const handleCancelScan = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsScanning(false);
    setScanProgress((prev) =>
      prev ? { ...prev, status: 'cancelled' as any } : undefined
    );
    message.info('扫描已取消');
  }, []);

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
    // 关闭 EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setScanModalVisible(false);
    scanForm.resetFields();
    setScanResults([]);
    setScanProgress(undefined);
    setIsScanning(false);
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
    handleCancelScan,
    handleRegister,
    openRegisterModal,
    handleCloseScanModal,
    handleCloseRegisterModal,
    // 加载状态
    isScanning,
    isRegistering: registerMutation.isPending,
    // 扫描进度（SSE 实时更新）
    scanProgress,
  };
};
