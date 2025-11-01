import { useState, useMemo, useCallback } from 'react';
import { Card, Table, Tag, Button, Space, Form, Alert, Badge } from 'antd';
import { WifiOutlined, UsbOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  usePhysicalDevices,
  useScanNetworkDevices,
  useRegisterPhysicalDevice,
  useDeletePhysicalDevice,
} from '@/hooks/usePhysicalDevices';
import type { PhysicalDevice } from '@/types';
import {
  PhysicalDeviceStatsCards,
  PhysicalDeviceToolbar,
  ScanNetworkDevicesModal,
  RegisterPhysicalDeviceModal,
  statusConfig,
} from '@/components/PhysicalDevice';
import dayjs from 'dayjs';

interface ScanResult {
  serialNumber: string;
  model?: string;
  manufacturer?: string;
  androidVersion?: string;
  ipAddress: string;
  status: 'online' | 'offline';
}

const PhysicalDeviceList = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<ScanResult | null>(null);
  const [scanForm] = Form.useForm();
  const [registerForm] = Form.useForm();

  // React Query hooks
  const params = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const { data, isLoading } = usePhysicalDevices(params);
  const scanMutation = useScanNetworkDevices();
  const registerMutation = useRegisterPhysicalDevice();
  const deleteMutation = useDeletePhysicalDevice();

  const devices = data?.data || [];
  const total = data?.total || 0;

  // Event handlers
  const handleScan = useCallback(
    async (values: { subnet: string }) => {
      const results = await scanMutation.mutateAsync(values);
      setScanResults(results as ScanResult[]);
    },
    [scanMutation]
  );

  const handleRegister = useCallback(
    async (values: any) => {
      await registerMutation.mutateAsync(values);
      setRegisterModalVisible(false);
      registerForm.resetFields();
      setSelectedDevice(null);
    },
    [registerMutation, registerForm]
  );

  const openRegisterModal = useCallback(
    (device?: ScanResult) => {
      if (device) {
        setSelectedDevice(device);
        registerForm.setFieldsValue({
          serialNumber: device.serialNumber,
          connectionType: 'network',
          ipAddress: device.ipAddress,
          adbPort: 5555,
          name: `${device.manufacturer || ''} ${device.model || ''}`.trim() || device.serialNumber,
        });
      } else {
        setSelectedDevice(null);
        registerForm.resetFields();
      }
      setRegisterModalVisible(true);
    },
    [registerForm]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const renderStatus = useCallback(
    (status: string) => {
      const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
      return (
        <Tag icon={config.icon} color={config.color}>
          {config.text}
        </Tag>
      );
    },
    [statusConfig]
  );

  const columns: ColumnsType<PhysicalDevice> = useMemo(
    () => [
      {
        title: '设备名称',
        dataIndex: 'name',
        key: 'name',
        width: 200,
        render: (text, record) => (
          <Space>
            <Badge status={record.status === 'online' ? 'success' : 'default'} />
            <span style={{ fontWeight: 500 }}>{text}</span>
          </Space>
        ),
      },
      {
        title: '序列号',
        dataIndex: 'serialNumber',
        key: 'serialNumber',
        width: 180,
        render: (text) => <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{text}</span>,
      },
      {
        title: '设备信息',
        key: 'deviceInfo',
        width: 200,
        render: (_, record) => (
          <Space direction="vertical" size={0}>
            {record.manufacturer && <span>{record.manufacturer}</span>}
            {record.model && (
              <span style={{ fontSize: '12px', color: '#999' }}>{record.model}</span>
            )}
            {record.androidVersion && (
              <Tag size="small" color="blue">
                Android {record.androidVersion}
              </Tag>
            )}
          </Space>
        ),
      },
      {
        title: '连接方式',
        dataIndex: 'connectionType',
        key: 'connectionType',
        width: 120,
        align: 'center',
        render: (type) =>
          type === 'network' ? (
            <Tag icon={<WifiOutlined />} color="blue">
              网络
            </Tag>
          ) : (
            <Tag icon={<UsbOutlined />} color="green">
              USB
            </Tag>
          ),
      },
      {
        title: 'IP 地址',
        dataIndex: 'ipAddress',
        key: 'ipAddress',
        width: 150,
        render: (ip, record) => (ip && record.connectionType === 'network' ? ip : '-'),
      },
      {
        title: 'ADB 端口',
        dataIndex: 'adbPort',
        key: 'adbPort',
        width: 100,
        align: 'center',
        render: (port) => port || '-',
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        align: 'center',
        filters: [
          { text: '在线', value: 'online' },
          { text: '离线', value: 'offline' },
          { text: '未注册', value: 'unregistered' },
        ],
        render: renderStatus,
      },
      {
        title: '最后在线',
        dataIndex: 'lastSeenAt',
        key: 'lastSeenAt',
        width: 180,
        render: (text) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'),
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            <Button type="link" size="small" danger onClick={() => handleDelete(record.id)}>
              移除
            </Button>
          </Space>
        ),
      },
    ],
    [renderStatus, handleDelete]
  );

  // Statistics
  const stats = useMemo(
    () => ({
      total: devices.length,
      online: devices.filter((d) => d.status === 'online').length,
      offline: devices.filter((d) => d.status === 'offline').length,
      networkDevices: devices.filter((d) => d.connectionType === 'network').length,
    }),
    [devices]
  );

  const onlineRate = useMemo(
    () => (stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0),
    [stats.total, stats.online]
  );

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
        isScanning={scanMutation.isPending}
        onCancel={() => {
          setScanModalVisible(false);
          scanForm.resetFields();
          setScanResults([]);
        }}
        onScan={handleScan}
        onRegister={openRegisterModal}
      />

      <RegisterPhysicalDeviceModal
        visible={registerModalVisible}
        form={registerForm}
        selectedDevice={selectedDevice}
        isRegistering={registerMutation.isPending}
        onCancel={() => {
          setRegisterModalVisible(false);
          registerForm.resetFields();
          setSelectedDevice(null);
        }}
        onFinish={handleRegister}
      />
    </div>
  );
};

export default PhysicalDeviceList;
