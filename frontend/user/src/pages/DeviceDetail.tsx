import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import {
  DeviceHeaderActions,
  DeviceStatsRow,
  DeviceInfoCard,
  DeviceControlButtons,
  DevicePlayerCard,
} from '@/components/Device';
import {
  useDevice,
  useStartDevice,
  useStopDevice,
  useRebootDevice,
} from '@/hooks/queries';

/**
 * 设备详情页
 *
 * 功能：
 * 1. 显示设备详细信息
 * 2. 自动轮询刷新设备状态（30秒）
 * 3. 设备操作：启动、停止、重启
 * 4. 导航：返回列表、跳转监控、跳转快照
 */
const DeviceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // React Query hooks
  const { data: device, isLoading } = useDevice(id!, {
    enabled: !!id,
    refetchInterval: 30000, // 每30秒自动刷新
  });
  const startDevice = useStartDevice();
  const stopDevice = useStopDevice();
  const rebootDevice = useRebootDevice();

  // 设备操作
  const handleStart = useCallback(async () => {
    if (!id) return;
    await startDevice.mutateAsync(id);
  }, [id, startDevice]);

  const handleStop = useCallback(async () => {
    if (!id) return;
    await stopDevice.mutateAsync(id);
  }, [id, stopDevice]);

  const handleReboot = useCallback(async () => {
    if (!id) return;
    await rebootDevice.mutateAsync(id);
  }, [id, rebootDevice]);

  // 导航操作
  const handleBack = useCallback(() => {
    navigate('/devices');
  }, [navigate]);

  const handleMonitor = useCallback(() => {
    navigate(`/devices/${id}/monitor`);
  }, [id, navigate]);

  const handleSnapshots = useCallback(() => {
    navigate(`/devices/${id}/snapshots`);
  }, [id, navigate]);

  if (isLoading || !device) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载设备信息中..." />
      </div>
    );
  }

  return (
    <div>
      <DeviceHeaderActions
        onBack={handleBack}
        onMonitor={handleMonitor}
        onSnapshots={handleSnapshots}
      />

      <DeviceStatsRow device={device} />

      <DeviceInfoCard device={device} loading={isLoading} />

      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <DeviceControlButtons
          status={device.status}
          onStart={handleStart}
          onStop={handleStop}
          onReboot={handleReboot}
        />
      </div>

      <DevicePlayerCard
        deviceId={device.id}
        isRunning={device.status === 'running'}
      />
    </div>
  );
};

export default DeviceDetail;
