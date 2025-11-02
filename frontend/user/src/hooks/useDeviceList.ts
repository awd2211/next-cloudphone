import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import {
  getMyDevices,
  startDevice,
  stopDevice,
  rebootDevice,
  getMyDeviceStats,
} from '@/services/device';
import type { Device } from '@/types';

interface DeviceStats {
  total: number;
  running: number;
  stopped: number;
}

export function useDeviceList() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyDevices({ page, pageSize });
      setDevices(res.data.data);
      setTotal(res.data.total);
    } catch (error) {
      message.error('加载设备列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  const loadStats = useCallback(async () => {
    try {
      const data = await getMyDeviceStats();
      setStats(data);
    } catch (error) {
      console.error('加载统计失败', error);
    }
  }, []);

  useEffect(() => {
    loadDevices();
    loadStats();
  }, [loadDevices, loadStats]);

  const handleStart = useCallback(
    async (id: string) => {
      try {
        await startDevice(id);
        message.success('设备启动成功');
        loadDevices();
        loadStats();
      } catch (error) {
        message.error('设备启动失败');
      }
    },
    [loadDevices, loadStats]
  );

  const handleStop = useCallback(
    async (id: string) => {
      try {
        await stopDevice(id);
        message.success('设备停止成功');
        loadDevices();
        loadStats();
      } catch (error) {
        message.error('设备停止失败');
      }
    },
    [loadDevices, loadStats]
  );

  const handleReboot = useCallback(
    async (id: string) => {
      try {
        await rebootDevice(id);
        message.success('设备重启中...');
        setTimeout(() => loadDevices(), 2000);
      } catch (error) {
        message.error('设备重启失败');
      }
    },
    [loadDevices]
  );

  const handleCreateSuccess = useCallback(
    (device: Device) => {
      message.success(`设备 "${device.name}" 创建成功！`);
      loadDevices();
      loadStats();
    },
    [loadDevices, loadStats]
  );

  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  }, []);

  const handleRefresh = useCallback(() => {
    loadDevices();
    loadStats();
  }, [loadDevices, loadStats]);

  return {
    devices,
    stats,
    loading,
    pagination: {
      current: page,
      pageSize,
      total,
      showSizeChanger: true,
      showTotal: (total: number) => `共 ${total} 条`,
      onChange: handlePageChange,
    },
    actions: {
      handleStart,
      handleStop,
      handleReboot,
      handleCreateSuccess,
      handleRefresh,
    },
  };
}
