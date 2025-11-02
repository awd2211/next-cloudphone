import { useParams } from 'react-router-dom';
import {
  DeviceHeaderActions,
  DeviceStatsRow,
  DeviceInfoCard,
  DeviceControlButtons,
  DevicePlayerCard,
} from '@/components/Device';
import { useDeviceDetail } from '@/hooks/useDeviceDetail';

const DeviceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const {
    device,
    loading,
    handleStart,
    handleStop,
    handleReboot,
    handleBack,
    handleMonitor,
    handleSnapshots,
  } = useDeviceDetail(id);

  if (!device) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <DeviceHeaderActions
        onBack={handleBack}
        onMonitor={handleMonitor}
        onSnapshots={handleSnapshots}
      />

      <DeviceStatsRow device={device} />

      <DeviceInfoCard device={device} loading={loading} />

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
