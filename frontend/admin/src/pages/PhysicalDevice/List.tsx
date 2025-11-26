import React from 'react';
import { Card, Alert } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import {
  PhysicalDeviceStatsCards,
  PhysicalDeviceToolbar,
  ScanNetworkDevicesModal,
  RegisterPhysicalDeviceModal,
} from '@/components/PhysicalDevice';
import { usePhysicalDeviceList } from '@/hooks/usePhysicalDeviceList';
import type { PhysicalDevice } from '@/types';

const PhysicalDeviceList: React.FC = () => {
  const {
    devices,
    total,
    isLoading,
    page,
    pageSize,
    stats,
    onlineRate,
    scanModalVisible,
    registerModalVisible,
    scanResults,
    selectedDevice,
    scanForm,
    registerForm,
    columns,
    setPage,
    setPageSize,
    setScanModalVisible,
    handleScan,
    handleRegister,
    openRegisterModal,
    handleCloseScanModal,
    handleCloseRegisterModal,
    isScanning,
    isRegistering,
    scanProgress,
  } = usePhysicalDeviceList();

  return (
    <div style={{ padding: '24px' }}>
      <Alert
        message="物理设备管理说明"
        description="物理设备管理允许您将真实的 Android 设备接入系统。支持 USB 直连和网络 ADB 两种连接方式。网络设备需要确保设备与服务器在同一网络且开启了 ADB over TCP/IP。"
        type="info"
        showIcon
        closable
        style={{ marginBottom: '16px' }}
      />

      <PhysicalDeviceStatsCards
        total={stats.total}
        online={stats.online}
        offline={stats.offline}
        onlineRate={onlineRate}
      />

      <Card>
        <PhysicalDeviceToolbar
          onScanNetwork={() => setScanModalVisible(true)}
          onManualRegister={() => openRegisterModal()}
        />

        <AccessibleTable<PhysicalDevice>
          ariaLabel="物理设备列表"
          loadingText="正在加载物理设备列表"
          emptyText="暂无物理设备数据，点击上方扫描网络或手动注册"
          columns={columns}
          dataSource={devices}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1400, y: 600 }}
          virtual
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPage(page);
              setPageSize(pageSize);
            },
            pageSizeOptions: ['10', '20', '50', '100', '200'],
          }}
        />
      </Card>

      <ScanNetworkDevicesModal
        visible={scanModalVisible}
        form={scanForm}
        scanResults={scanResults}
        isScanning={isScanning}
        scanProgress={scanProgress}
        onCancel={handleCloseScanModal}
        onScan={handleScan}
        onRegister={openRegisterModal}
      />

      <RegisterPhysicalDeviceModal
        visible={registerModalVisible}
        form={registerForm}
        selectedDevice={selectedDevice}
        isRegistering={isRegistering}
        onCancel={handleCloseRegisterModal}
        onFinish={handleRegister}
      />
    </div>
  );
};

export default PhysicalDeviceList;
