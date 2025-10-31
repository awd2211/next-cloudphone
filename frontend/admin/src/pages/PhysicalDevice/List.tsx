import { useState, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Descriptions,
  Alert,
  Spin,
  Badge,
  Tooltip,
  Row,
  Col,
  Statistic,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  ScanOutlined,
  WifiOutlined,
  UsbOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  usePhysicalDevices,
  useScanNetworkDevices,
  useRegisterPhysicalDevice,
  useDeletePhysicalDevice,
} from '@/hooks/usePhysicalDevices';
import type { PhysicalDevice } from '@/types';
import dayjs from 'dayjs';

const { Option } = Select;

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

  // Optimized status config
  const statusConfig = useMemo(
    () => ({
      online: {
        color: 'success' as const,
        icon: <CheckCircleOutlined />,
        text: '在线',
      },
      offline: {
        color: 'default' as const,
        icon: <CloseCircleOutlined />,
        text: '离线',
      },
      unregistered: {
        color: 'warning' as const,
        icon: <QuestionCircleOutlined />,
        text: '未注册',
      },
    }),
    []
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

  // Scan results columns
  const scanColumns: ColumnsType<ScanResult> = useMemo(
    () => [
      {
        title: '序列号',
        dataIndex: 'serialNumber',
        key: 'serialNumber',
        render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>,
      },
      {
        title: '设备信息',
        key: 'deviceInfo',
        render: (_, record) => (
          <Space direction="vertical" size={0}>
            <span>{record.manufacturer || '-'}</span>
            <span style={{ fontSize: '12px', color: '#999' }}>{record.model || '-'}</span>
          </Space>
        ),
      },
      {
        title: 'IP 地址',
        dataIndex: 'ipAddress',
        key: 'ipAddress',
      },
      {
        title: 'Android 版本',
        dataIndex: 'androidVersion',
        key: 'androidVersion',
        render: (version) => (version ? <Tag color="blue">Android {version}</Tag> : '-'),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: renderStatus,
      },
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <Button type="primary" size="small" onClick={() => openRegisterModal(record)}>
            注册
          </Button>
        ),
      },
    ],
    [renderStatus, openRegisterModal]
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

      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="总设备数" value={stats.total} prefix={<WifiOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic
              title="在线设备"
              value={stats.online}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="离线设备"
              value={stats.offline}
              valueStyle={{ color: '#999' }}
              prefix={<CloseCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <div>
              <div style={{ marginBottom: '8px', fontSize: '14px', color: 'rgba(0, 0, 0, 0.45)' }}>
                在线率
              </div>
              <Progress
                percent={onlineRate}
                status={onlineRate > 80 ? 'success' : onlineRate > 50 ? 'normal' : 'exception'}
              />
            </div>
          </Col>
        </Row>
      </Card>

      <Card>
        <Space style={{ marginBottom: '16px' }}>
          <Button type="primary" icon={<ScanOutlined />} onClick={() => setScanModalVisible(true)}>
            扫描网络设备
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => openRegisterModal()}>
            手动注册
          </Button>
        </Space>

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

      {/* 扫描网络设备模态框 */}
      <Modal
        title="扫描网络设备"
        open={scanModalVisible}
        onCancel={() => {
          setScanModalVisible(false);
          scanForm.resetFields();
          setScanResults([]);
        }}
        footer={null}
        width={900}
      >
        <Alert
          message="扫描提示"
          description="请输入要扫描的子网段，例如 192.168.1.0/24。扫描将查找该网段内所有开启了 ADB over TCP/IP (端口 5555) 的 Android 设备。"
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        <Form
          form={scanForm}
          onFinish={handleScan}
          layout="inline"
          style={{ marginBottom: '16px' }}
        >
          <Form.Item
            name="subnet"
            rules={[{ required: true, message: '请输入子网段' }]}
            initialValue="192.168.1.0/24"
            style={{ flex: 1 }}
          >
            <Input placeholder="例如: 192.168.1.0/24" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<ScanOutlined />}
              loading={scanMutation.isPending}
            >
              开始扫描
            </Button>
          </Form.Item>
        </Form>

        {scanMutation.isPending && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" tip="正在扫描网络设备，请稍候..." />
          </div>
        )}

        {!scanMutation.isPending && scanResults.length > 0 && (
          <Table
            columns={scanColumns}
            dataSource={scanResults}
            rowKey="serialNumber"
            size="small"
            pagination={false}
          />
        )}

        {!scanMutation.isPending && scanResults.length === 0 && scanForm.isFieldsTouched() && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <QuestionCircleOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div>未发现任何设备</div>
          </div>
        )}
      </Modal>

      {/* 注册设备模态框 */}
      <Modal
        title={selectedDevice ? '注册发现的设备' : '手动注册设备'}
        open={registerModalVisible}
        onCancel={() => {
          setRegisterModalVisible(false);
          registerForm.resetFields();
          setSelectedDevice(null);
        }}
        onOk={() => registerForm.submit()}
        confirmLoading={registerMutation.isPending}
        width={600}
      >
        {selectedDevice && (
          <Descriptions column={2} size="small" bordered style={{ marginBottom: '16px' }}>
            <Descriptions.Item label="序列号" span={2}>
              {selectedDevice.serialNumber}
            </Descriptions.Item>
            <Descriptions.Item label="厂商">{selectedDevice.manufacturer || '-'}</Descriptions.Item>
            <Descriptions.Item label="型号">{selectedDevice.model || '-'}</Descriptions.Item>
            <Descriptions.Item label="Android 版本">
              {selectedDevice.androidVersion || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="IP 地址">{selectedDevice.ipAddress}</Descriptions.Item>
          </Descriptions>
        )}

        <Form form={registerForm} onFinish={handleRegister} layout="vertical">
          <Form.Item
            label="设备序列号"
            name="serialNumber"
            rules={[{ required: true, message: '请输入设备序列号' }]}
          >
            <Input placeholder="运行 adb devices 获取序列号" disabled={!!selectedDevice} />
          </Form.Item>

          <Form.Item label="设备名称" name="name">
            <Input placeholder="为设备起一个易识别的名称" />
          </Form.Item>

          <Form.Item
            label="连接方式"
            name="connectionType"
            rules={[{ required: true, message: '请选择连接方式' }]}
            initialValue="network"
          >
            <Select disabled={!!selectedDevice}>
              <Option value="usb">USB 直连</Option>
              <Option value="network">网络 ADB</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.connectionType !== curr.connectionType}
          >
            {({ getFieldValue }) =>
              getFieldValue('connectionType') === 'network' ? (
                <>
                  <Form.Item
                    label="IP 地址"
                    name="ipAddress"
                    rules={[{ required: true, message: '请输入 IP 地址' }]}
                  >
                    <Input placeholder="设备的 IP 地址" disabled={!!selectedDevice} />
                  </Form.Item>
                  <Form.Item
                    label="ADB 端口"
                    name="adbPort"
                    rules={[{ required: true, message: '请输入 ADB 端口' }]}
                    initialValue={5555}
                  >
                    <Input type="number" placeholder="默认为 5555" disabled={!!selectedDevice} />
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>
        </Form>

        {!selectedDevice && (
          <Alert
            message="网络 ADB 设置方法"
            description={
              <div>
                <p>1. 在设备上开启 ADB over TCP/IP:</p>
                <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                  adb tcpip 5555
                </pre>
                <p>2. 查看设备 IP 地址（设置 → 关于手机 → 状态信息）</p>
                <p>3. 在此页面注册设备</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}
      </Modal>
    </div>
  );
};

export default PhysicalDeviceList;
