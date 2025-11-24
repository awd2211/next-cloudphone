import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, Select, Empty, Alert, Space, Typography, Spin, message, theme } from 'antd';

const { useToken } = theme;
import { MobileOutlined, AppstoreOutlined } from '@ant-design/icons';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useInstalledApps, useUninstallApp, useBatchUninstallApps, useUpdateApp, useMyDevices } from '@/hooks/queries';
import { InstalledAppList } from '@/components/App/InstalledAppList';
import type { Device } from '@/types';
import { getListData } from '@/types';
import type { InstalledAppInfo } from '@/services/app';

const { Title, Text } = Typography;

/**
 * 已安装应用管理页面
 *
 * 功能：
 * 1. 选择设备查看已安装应用
 * 2. 查看应用详细信息
 * 3. 卸载应用
 * 4. 批量卸载应用
 * 5. 更新应用
 */
const InstalledApps: React.FC = () => {
  const { token } = useToken();

  // 本地状态
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedPackageNames, setSelectedPackageNames] = useState<string[]>([]);

  // React Query hooks
  const { data: devicesData } = useMyDevices({ page: 1, pageSize: 100 });
  const { data: installedAppsData, isLoading: loading, refetch } = useInstalledApps(selectedDeviceId!, {
    enabled: !!selectedDeviceId,
  });
  const uninstallAppMutation = useUninstallApp();
  const batchUninstallAppsMutation = useBatchUninstallApps();
  const updateAppMutation = useUpdateApp();

  // 响应格式: PaginatedResponse<Device> -> { items/data: Device[], total, ... }
  const devices: Device[] = getListData(devicesData);
  // useInstalledApps 返回 InstalledAppInfo[]
  const apps: InstalledAppInfo[] = installedAppsData || [];

  // 计算统计信息
  const stats = useMemo(() => ({
    total: apps.length,
    system: apps.filter((app) => app.isSystemApp).length,
    user: apps.filter((app) => !app.isSystemApp).length,
    updatable: apps.filter((app) => app.hasUpdate).length,
  }), [apps]);

  // 筛选运行中的设备
  const runningDevices = devices.filter((d: Device) => d.status === 'running');

  // 设备切换
  const handleDeviceChange = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setSelectedPackageNames([]); // 清空选择
  }, []);

  // 选择应用（使用 packageName 作为标识符）
  const handleSelectApp = useCallback((packageName: string, checked: boolean) => {
    setSelectedPackageNames(prev =>
      checked ? [...prev, packageName] : prev.filter(name => name !== packageName)
    );
  }, []);

  // 全选/取消全选（只选择用户应用）
  const handleSelectAll = useCallback(() => {
    const userApps = apps.filter((app) => !app.isSystemApp);
    setSelectedPackageNames(prev =>
      prev.length === userApps.length ? [] : userApps.map(app => app.packageName)
    );
  }, [apps]);

  // 清空选择
  const handleClearSelection = useCallback(() => {
    setSelectedPackageNames([]);
  }, []);

  // 卸载单个应用
  const handleUninstall = useCallback(async (packageName: string) => {
    if (!selectedDeviceId) return;
    await uninstallAppMutation.mutateAsync({ deviceId: selectedDeviceId, packageName });
    refetch();
  }, [selectedDeviceId, uninstallAppMutation, refetch]);

  // 批量卸载
  const handleBatchUninstall = useCallback(async () => {
    if (!selectedDeviceId || selectedPackageNames.length === 0) return;
    await batchUninstallAppsMutation.mutateAsync({
      deviceId: selectedDeviceId,
      packageNames: selectedPackageNames,
    });
    setSelectedPackageNames([]);
    refetch();
  }, [selectedDeviceId, selectedPackageNames, batchUninstallAppsMutation, refetch]);

  // 更新应用
  const handleUpdate = useCallback(async (packageName: string) => {
    if (!selectedDeviceId) return;
    await updateAppMutation.mutateAsync({ deviceId: selectedDeviceId, packageName });
    refetch();
  }, [selectedDeviceId, updateAppMutation, refetch]);

  // 刷新列表
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // 快捷键支持：Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        if (selectedDeviceId) {
          refetch();
          message.info('正在刷新应用列表...');
        } else {
          message.warning('请先选择设备');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refetch, selectedDeviceId]);

  return (
    <ErrorBoundary>
      <div style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <Space>
            <AppstoreOutlined style={{ fontSize: 24, color: token.colorPrimary }} />
            <Title level={2} style={{ margin: 0 }}>
              已安装应用管理
            </Title>
          </Space>

          <Space>
            <Text type="secondary">选择设备:</Text>
            <Select
              style={{ width: 300 }}
              placeholder="请选择要查看的设备"
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              optionFilterProp="children"
              showSearch
              size="large"
            >
              {runningDevices.map((device) => (
                <Select.Option key={device.id} value={device.id}>
                  <Space>
                    <MobileOutlined />
                    <span>{device.name}</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ({device.androidVersion})
                    </Text>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Space>
        </div>

        {/* 提示信息 */}
        {!selectedDeviceId && (
          <Alert
            message="请选择设备"
            description="请从上方下拉菜单中选择一个运行中的设备，查看该设备上已安装的应用。"
            type="info"
            showIcon
          />
        )}

        {selectedDeviceId && runningDevices.length === 0 && (
          <Alert
            message="暂无运行中的设备"
            description="只有运行中的设备才能查看已安装应用。请先启动至少一个设备。"
            type="warning"
            showIcon
          />
        )}

        {/* 应用列表 */}
        {selectedDeviceId && (
          <Card>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Spin size="large" tip="正在加载已安装应用..." />
              </div>
            ) : apps.length === 0 ? (
              <Empty
                description="该设备暂无已安装应用"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <InstalledAppList
                apps={apps}
                stats={stats}
                selectedAppIds={selectedPackageNames}
                onSelectApp={handleSelectApp}
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
                onUninstall={handleUninstall}
                onBatchUninstall={handleBatchUninstall}
                onUpdate={handleUpdate}
                onRefresh={handleRefresh}
              />
            )}
          </Card>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default InstalledApps;
