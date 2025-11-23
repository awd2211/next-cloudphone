import { useEffect, useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tabs, message } from 'antd';
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
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

/**
 * 设备详情页面 (优化版 v2)
 *
 * 优化策略:
 * 1. ✅ ErrorBoundary - 页面级 + 组件级错误边界
 * 2. ✅ LoadingState - 统一加载/错误/空状态处理
 * 3. ✅ useMemo - 缓存 tabItems 配置
 * 4. ✅ useCallback - 缓存导航回调和操作回调
 * 5. ✅ 快捷键支持 - Ctrl+R 刷新、Ctrl+1~5 切换 Tab、Escape 返回
 * 6. ✅ 分层错误边界 - WebRTC/ADB 组件独立错误边界
 */
const DeviceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTabKey, setActiveTabKey] = useState('screen');

  const {
    device,
    loading,
    error,
    installedApps,
    uploadModalVisible,
    fileList,
    form,
    appOperationModalVisible,
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
    refetch,
  } = useDeviceDetail(id);

  // ===== 导航回调 =====
  const handleBack = useCallback(() => {
    navigate('/admin/business/devices');
  }, [navigate]);

  // ===== 刷新回调 =====
  const handleRefresh = useCallback(async () => {
    message.loading({ content: '正在刷新...', key: 'refresh' });
    try {
      await refetch?.();
      message.success({ content: '刷新成功', key: 'refresh' });
    } catch {
      message.error({ content: '刷新失败', key: 'refresh' });
    }
  }, [refetch]);

  // ===== 快捷键支持 =====
  useEffect(() => {
    const tabKeys = ['screen', 'console', 'apps', 'app-operations', 'snapshots'];

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape 返回列表
      if (e.key === 'Escape') {
        e.preventDefault();
        handleBack();
        return;
      }

      // Ctrl+R 刷新数据
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
        return;
      }

      // Ctrl+1~5 切换 Tab
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (index < tabKeys.length) {
          setActiveTabKey(tabKeys[index]);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBack, handleRefresh]);

  // ===== Tab 配置 (使用 useMemo 缓存) =====
  const tabItems = useMemo(() => [
    {
      key: 'screen',
      label: '设备屏幕 (Ctrl+1)',
      children: (
        <Card>
          {device?.status === 'running' ? (
            <ErrorBoundary boundaryName="WebRTCPlayer">
              <WebRTCPlayerLazy deviceId={id!} />
            </ErrorBoundary>
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
      label: 'ADB 控制台 (Ctrl+2)',
      children: (
        <Card>
          <ErrorBoundary boundaryName="ADBConsole">
            <ADBConsoleLazy deviceId={id!} />
          </ErrorBoundary>
        </Card>
      ),
    },
    {
      key: 'apps',
      label: '应用管理 (Ctrl+3)',
      children: (
        <ErrorBoundary boundaryName="AppsTab">
          <AppsTab
            installedApps={installedApps}
            onInstallClick={() => setUploadModalVisible(true)}
            onUninstall={handleUninstallApp}
          />
        </ErrorBoundary>
      ),
    },
    {
      key: 'app-operations',
      label: '应用操作 (Ctrl+4)',
      children: (
        <ErrorBoundary boundaryName="AppOperationsTab">
          <AppOperationsTab
            deviceStatus={device?.status || 'stopped'}
            onStart={() => handleOpenAppOperation('start')}
            onStop={() => handleOpenAppOperation('stop')}
            onClearData={() => handleOpenAppOperation('clear-data')}
          />
        </ErrorBoundary>
      ),
    },
    {
      key: 'snapshots',
      label: '快照管理 (Ctrl+5)',
      children: (
        <ErrorBoundary boundaryName="SnapshotsTab">
          <SnapshotsTab
            deviceId={id!}
            onCreateSnapshot={() => setCreateSnapshotModalVisible(true)}
            onRestore={handleRestoreSnapshot}
          />
        </ErrorBoundary>
      ),
    },
  ], [
    id,
    device?.status,
    installedApps,
    setUploadModalVisible,
    handleUninstallApp,
    handleOpenAppOperation,
    setCreateSnapshotModalVisible,
    handleRestoreSnapshot,
  ]);

  // ===== Tab 切换回调 =====
  const handleTabChange = useCallback((key: string) => {
    setActiveTabKey(key);
  }, []);

  return (
    <ErrorBoundary boundaryName="DeviceDetail">
      <LoadingState
        loading={loading}
        error={error}
        empty={!device && !loading && !error}
        onRetry={refetch}
        loadingType="skeleton"
        skeletonRows={8}
        emptyDescription="设备不存在或已被删除"
      >
        <div>
          <DeviceDetailHeader
            onBack={handleBack}
            onRefresh={handleRefresh}
          />

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
            <Tabs
              items={tabItems}
              activeKey={activeTabKey}
              onChange={handleTabChange}
            />
          </Card>

          {/* Modals */}
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
      </LoadingState>
    </ErrorBoundary>
  );
};

export default DeviceDetail;
