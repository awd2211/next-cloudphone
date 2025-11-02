import React, { useState, useCallback } from 'react';
import { Card, Select, Empty, Alert, Space, Typography, Spin } from 'antd';
import { MobileOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useInstalledApps } from '@/hooks/useInstalledApps';
import { InstalledAppList } from '@/components/App/InstalledAppList';
import { useDeviceList } from '@/hooks/useDeviceList';

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
  const { devices } = useDeviceList();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const {
    apps,
    loading,
    stats,
    selectedAppIds,
    handleSelectApp,
    handleSelectAll,
    handleClearSelection,
    handleUninstall,
    handleBatchUninstall,
    handleUpdate,
    handleRefresh,
  } = useInstalledApps(selectedDeviceId);

  const handleDeviceChange = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
  }, []);

  // 筛选运行中的设备
  const runningDevices = devices.filter((d) => d.status === 'running');

  return (
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
          <AppstoreOutlined style={{ fontSize: 24, color: '#1890ff' }} />
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
              selectedAppIds={selectedAppIds}
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
  );
};

export default InstalledApps;
