import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { getDevice, startDevice, stopDevice, rebootDevice } from '@/services/device';
import type { Device } from '@/types';

/**
 * 设备详情页业务逻辑 Hook
 * 封装设备加载、操作等功能
 */
export function useDeviceDetail(id?: string) {
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(false);

  // 加载设备信息
  const loadDevice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getDevice(id);
      setDevice(data);
    } catch (error) {
      message.error('加载设备信息失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // 页面加载时获取设备信息，并每30秒刷新一次
  useEffect(() => {
    loadDevice();
    const interval = setInterval(loadDevice, 30000);
    return () => clearInterval(interval);
  }, [loadDevice]);

  // 启动设备
  const handleStart = useCallback(async () => {
    if (!id) return;
    try {
      await startDevice(id);
      message.success('设备启动成功');
      loadDevice();
    } catch (error) {
      message.error('设备启动失败');
    }
  }, [id, loadDevice]);

  // 停止设备
  const handleStop = useCallback(async () => {
    if (!id) return;
    try {
      await stopDevice(id);
      message.success('设备停止成功');
      loadDevice();
    } catch (error) {
      message.error('设备停止失败');
    }
  }, [id, loadDevice]);

  // 重启设备
  const handleReboot = useCallback(async () => {
    if (!id) return;
    try {
      await rebootDevice(id);
      message.success('设备重启中...');
      setTimeout(() => loadDevice(), 2000);
    } catch (error) {
      message.error('设备重启失败');
    }
  }, [id, loadDevice]);

  // 返回设备列表
  const handleBack = useCallback(() => {
    navigate('/devices');
  }, [navigate]);

  // 跳转到监控页
  const handleMonitor = useCallback(() => {
    navigate(`/devices/${id}/monitor`);
  }, [id, navigate]);

  // 跳转到快照页
  const handleSnapshots = useCallback(() => {
    navigate(`/devices/${id}/snapshots`);
  }, [id, navigate]);

  return {
    device,
    loading,
    handleStart,
    handleStop,
    handleReboot,
    handleBack,
    handleMonitor,
    handleSnapshots,
  };
}
