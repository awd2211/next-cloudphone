import React from 'react';
import { Card, Table, Alert } from 'antd';
import {
  PhysicalDeviceStatsCards,
  PhysicalDeviceToolbar,
  ScanNetworkDevicesModal,
  RegisterPhysicalDeviceModal,
} from '@/components/PhysicalDevice';
import { usePhysicalDeviceList } from '@/hooks/usePhysicalDeviceList';

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

        <Table
          columns={columns}
          dataSource={devices}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1400 }}
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
          }}
        />
      </Card>

      <ScanNetworkDevicesModal
        visible={scanModalVisible}
        form={scanForm}
        scanResults={scanResults}
        isScanning={isScanning}
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
