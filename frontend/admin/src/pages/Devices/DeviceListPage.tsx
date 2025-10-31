import React, { useState } from 'react';
import { Layout, Card, Space, Select, Input, Button, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import VirtualizedDeviceList from '@/components/DeviceList/VirtualizedDeviceList';
import { useDeviceList } from '@/hooks/useDeviceList';
import {
  ProviderDisplayNamesCN,
  DeviceProviderType,
  StatusDisplayNamesCN,
  DeviceStatus,
} from '@/types/device';

const { Content } = Layout;
const { Search } = Input;

const DeviceListPage: React.FC = () => {
  const [filters, setFilters] = useState<{
    status?: string;
    providerType?: string;
    search?: string;
  }>({});

  const {
    devices,
    totalCount,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useDeviceList({ filters });

  const handleDeviceClick = (device: any) => {
    // 跳转到设备详情页
    console.log('Device clicked:', device);
    message.info(`打开设备: ${device.name}`);
  };

  const handleCreateDevice = () => {
    console.log('Create new device');
    message.info('创建设备功能开发中...');
  };

  const handleRefresh = () => {
    refetch();
    message.success('刷新成功');
  };

  return (
    <Layout style={{ height: '100vh', backgroundColor: '#f0f2f5' }}>
      <Content style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
        {/* 页面标题 */}
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>设备管理</h1>
          <div style={{ color: '#666', marginTop: '4px' }}>管理和监控所有云手机设备</div>
        </div>

        {/* 顶部操作栏 */}
        <Card style={{ marginBottom: '16px' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space wrap>
              <Search
                placeholder="搜索设备名称"
                style={{ width: 300 }}
                onSearch={(value) => setFilters({ ...filters, search: value || undefined })}
                allowClear
              />
              <Select
                placeholder="设备状态"
                style={{ width: 120 }}
                allowClear
                onChange={(value) => setFilters({ ...filters, status: value })}
              >
                {Object.entries(StatusDisplayNamesCN).map(([key, name]) => (
                  <Select.Option key={key} value={key.toLowerCase()}>
                    {name}
                  </Select.Option>
                ))}
              </Select>
              <Select
                placeholder="Provider 类型"
                style={{ width: 150 }}
                allowClear
                onChange={(value) => setFilters({ ...filters, providerType: value })}
              >
                {Object.entries(ProviderDisplayNamesCN).map(([key, name]) => (
                  <Select.Option key={key} value={key}>
                    {name}
                  </Select.Option>
                ))}
              </Select>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                刷新
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateDevice}>
                创建设备
              </Button>
            </Space>
          </Space>
          <div style={{ marginTop: '12px', color: '#666', fontSize: '14px' }}>
            {isLoading ? (
              '加载中...'
            ) : (
              <>
                共 <strong>{totalCount}</strong> 台设备
                {filters.status &&
                  ` · 状态: ${StatusDisplayNamesCN[filters.status.toUpperCase() as DeviceStatus]}`}
                {filters.providerType &&
                  ` · 类型: ${ProviderDisplayNamesCN[filters.providerType as DeviceProviderType]}`}
                {filters.search && ` · 搜索: ${filters.search}`}
              </>
            )}
          </div>
        </Card>

        {/* 虚拟滚动设备列表 */}
        <Card
          style={{ flex: 1, padding: 0 }}
          bodyStyle={{ height: '100%', padding: 0 }}
          loading={isLoading}
        >
          {!isLoading && devices.length === 0 ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: '#999',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>暂无设备</div>
              <div style={{ fontSize: '14px' }}>点击右上角"创建设备"按钮开始</div>
            </div>
          ) : (
            <VirtualizedDeviceList
              devices={devices}
              totalCount={totalCount}
              hasNextPage={hasNextPage}
              isNextPageLoading={isFetchingNextPage}
              loadNextPage={() => fetchNextPage().then(() => {})}
              onDeviceClick={handleDeviceClick}
            />
          )}
        </Card>
      </Content>
    </Layout>
  );
};

export default DeviceListPage;
