import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tabs } from 'antd';
import { WebRTCPlayerLazy, ADBConsoleLazy } from '@/components/LazyComponents';
import { AppOperationModal } from '@/components/DeviceAppOperations';
import {
  CreateSnapshotModal,
  RestoreSnapshotModal,
} from '@/components/DeviceSnapshot';
import {
  DeviceDetailHeader,
  DeviceInfoCard,
  AppsTab,
  AppOperationsTab,
  SnapshotsTab,
  InstallAppModal,
} from '@/components/DeviceDetail';
import { useDeviceDetail } from '@/hooks/useDeviceDetail';

const DeviceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    device,
    loading,
    installedApps,
    uploadModalVisible,
    fileList,
    form,
    appOperationModalVisible,
    // appOperationType, // Removed: not used after operationType prop removal
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
  } = useDeviceDetail(id);

  if (!device) {
    return <div>加载中...</div>;
  }

  const tabItems = [
    {
      key: 'screen',
      label: '设备屏幕',
      children: (
        <Card>
          {device.status === 'running' ? (
            <WebRTCPlayerLazy deviceId={id!} />
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 0', color: '#999' }}>
              设备未运行，无法显示屏幕
            </div>
          )}
        </Card>
      ),
    },
    {
      key: 'console',
      label: 'ADB 控制台',
      children: (
        <Card>
          <ADBConsoleLazy deviceId={id!} />
        </Card>
      ),
    },
    {
      key: 'apps',
      label: '应用管理',
      children: (
        <AppsTab
          installedApps={installedApps}
          onInstallClick={() => setUploadModalVisible(true)}
          onUninstall={handleUninstallApp}
        />
      ),
    },
    {
      key: 'app-operations',
      label: '应用操作',
      children: (
        <AppOperationsTab
          deviceStatus={device.status}
          onStart={() => handleOpenAppOperation('start')}
          onStop={() => handleOpenAppOperation('stop')}
          onClearData={() => handleOpenAppOperation('clear-data')}
        />
      ),
    },
    {
      key: 'snapshots',
      label: '快照管理',
      children: (
        <SnapshotsTab
          deviceId={id!}
          onCreateSnapshot={() => setCreateSnapshotModalVisible(true)}
          onRestore={handleRestoreSnapshot}
        />
      ),
    },
  ];

  return (
    <div>
      <DeviceDetailHeader onBack={() => navigate('/admin/business/devices')} />

      {device && (
        <DeviceInfoCard
          device={device as any}
          loading={loading}
          onStart={handleStart}
          onStop={handleStop}
          onRestart={handleRestart}
          onScreenshot={handleScreenshot}
        />
      )}

      <Card>
        <Tabs items={tabItems} />
      </Card>

      <InstallAppModal
        visible={uploadModalVisible}
        fileList={fileList}
        onOk={handleUploadApp}
        onCancel={handleCancelInstallApp}
        onFileChange={setFileList}
        form={form}
      />

      <AppOperationModal
        visible={appOperationModalVisible}
        deviceId={id!}
        deviceName={device?.name || ''}
        onClose={() => setAppOperationModalVisible(false)}
        onSuccess={handleAppOperationSuccess}
      />

      <CreateSnapshotModal
        visible={createSnapshotModalVisible}
        deviceId={id!}
        deviceName={device?.name || ''}
        onClose={() => setCreateSnapshotModalVisible(false)}
        onSuccess={handleCreateSnapshotSuccess}
      />

      <RestoreSnapshotModal
        visible={restoreSnapshotModalVisible}
        deviceId={id!}
        deviceName={device?.name || ''}
        snapshotId={selectedSnapshotId}
        snapshotName={selectedSnapshotName}
        onClose={handleCancelRestoreSnapshot}
        onSuccess={handleRestoreSnapshotSuccess}
      />
    </div>
  );
};

export default DeviceDetail;
