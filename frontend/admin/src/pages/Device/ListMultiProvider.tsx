import { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Card,
  Statistic,
  Row,
  Col,
  Select,
  Badge,
  Tooltip,
  Tabs,
  Descriptions,
  Drawer,
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  CloudOutlined,
  MobileOutlined,
  ContainerOutlined,
  SyncOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getDevices,
  createDevice,
  deleteDevice,
  startDevice,
  stopDevice,
  rebootDevice,
  getDeviceStats,
  refreshCloudDevice,
  getDeviceConnectionInfo,
} from '@/services/device';
import { getProviderSpecs } from '@/services/provider';
import {
  DeviceProvider,
  ProviderNames,
  ProviderColors,
  ProviderIcons,
  type DeviceExtended,
  type CreateDeviceDto,
  type DeviceStats,
  type ProviderSpec,
} from '@/types/provider';

const DeviceListMultiProvider = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<DeviceExtended[]>([]);
  const [stats, setStats] = useState<DeviceStats>();
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [connectionDrawerVisible, setConnectionDrawerVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceExtended | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [providerSpecs, setProviderSpecs] = useState<ProviderSpec[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<DeviceProvider>(DeviceProvider.DOCKER);
  const [form] = Form.useForm();

  // 加载设备列表
  const loadDevices = async () => {
    setLoading(true);
    try {
      const res = await getDevices({ page, pageSize });
      setDevices(res.data as any);
      setTotal(res.total);
    } catch (error) {
      message.error('加载设备列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计数据
  const loadStats = async () => {
    try {
      const data = await getDeviceStats();
      setStats(data as any);
    } catch (error) {
      console.error('加载统计数据失败', error);
    }
  };

  // 加载提供商规格
  const loadProviderSpecs = async () => {
    try {
      const res = await getProviderSpecs();
      setProviderSpecs(res.data);
    } catch (error) {
      console.error('加载提供商规格失败', error);
    }
  };

  useEffect(() => {
    loadDevices();
    loadStats();
    loadProviderSpecs();
  }, [page, pageSize]);

  // 创建设备
  const handleCreate = async (values: CreateDeviceDto) => {
    try {
      await createDevice(values);
      message.success('设备创建成功，正在启动...');
      setCreateModalVisible(false);
      form.resetFields();
      loadDevices();
      loadStats();
    } catch (error) {
      message.error('设备创建失败');
    }
  };

  // 启动设备
  const handleStart = async (id: string) => {
    try {
      await startDevice(id);
      message.success('设备启动成功');
      loadDevices();
    } catch (error) {
      message.error('设备启动失败');
    }
  };

  // 停止设备
  const handleStop = async (id: string) => {
    try {
      await stopDevice(id);
      message.success('设备已停止');
      loadDevices();
    } catch (error) {
      message.error('设备停止失败');
    }
  };

  // 重启设备
  const handleReboot = async (id: string) => {
    try {
      await rebootDevice(id);
      message.success('设备重启中...');
      setTimeout(() => loadDevices(), 2000);
    } catch (error) {
      message.error('设备重启失败');
    }
  };

  // 删除设备
  const handleDelete = async (id: string) => {
    try {
      await deleteDevice(id);
      message.success('设备已删除');
      loadDevices();
      loadStats();
    } catch (error) {
      message.error('设备删除失败');
    }
  };

  // 刷新云设备状态
  const handleRefreshCloud = async (id: string) => {
    try {
      await refreshCloudDevice(id);
      message.success('云设备状态已刷新');
      loadDevices();
    } catch (error) {
      message.error('刷新失败');
    }
  };

  // 查看连接信息
  const handleViewConnection = async (device: DeviceExtended) => {
    setSelectedDevice(device);
    try {
      const info = await getDeviceConnectionInfo(device.id);
      setConnectionInfo(info);
      setConnectionDrawerVisible(true);
    } catch (error) {
      message.error('获取连接信息失败');
    }
  };

  // 状态标签
  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      idle: { color: 'default', text: '空闲' },
      running: { color: 'green', text: '运行中' },
      stopped: { color: 'red', text: '已停止' },
      error: { color: 'red', text: '错误' },
      creating: { color: 'blue', text: '创建中' },
      starting: { color: 'blue', text: '启动中' },
      stopping: { color: 'orange', text: '停止中' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 提供商标签
  const getProviderTag = (provider: DeviceProvider) => {
    return (
      <Tag color={ProviderColors[provider]} icon={<span>{ProviderIcons[provider]}</span>}>
        {ProviderNames[provider]}
      </Tag>
    );
  };

  // 表格列定义
  const columns: ColumnsType<DeviceExtended> = [
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '提供商',
      dataIndex: 'provider',
      key: 'provider',
      width: 150,
      render: (provider: DeviceProvider) => getProviderTag(provider),
      filters: Object.values(DeviceProvider).map((p) => ({
        text: ProviderNames[p],
        value: p,
      })),
      onFilter: (value, record) => record.provider === value,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '配置',
      key: 'config',
      width: 180,
      render: (_, record) => (
        <span>
          {record.cpuCores}核 / {(record.memoryMB / 1024).toFixed(1)}G / {record.diskGB}G
        </span>
      ),
    },
    {
      title: 'Android',
      dataIndex: 'androidVersion',
      key: 'androidVersion',
      width: 100,
    },
    {
      title: '实例 ID',
      dataIndex: 'providerInstanceId',
      key: 'providerInstanceId',
      width: 180,
      ellipsis: true,
      render: (id) => id || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'stopped' && (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStart(record.id)}
            >
              启动
            </Button>
          )}
          {record.status === 'running' && (
            <Button
              type="link"
              size="small"
              icon={<StopOutlined />}
              onClick={() => handleStop(record.id)}
            >
              停止
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleReboot(record.id)}
            disabled={record.status !== 'running'}
          >
            重启
          </Button>
          {(record.provider === DeviceProvider.HUAWEI ||
            record.provider === DeviceProvider.ALIYUN) && (
            <Tooltip title="刷新云端状态">
              <Button
                type="link"
                size="small"
                icon={<SyncOutlined />}
                onClick={() => handleRefreshCloud(record.id)}
              />
            </Tooltip>
          )}
          <Button
            type="link"
            size="small"
            icon={<InfoCircleOutlined />}
            onClick={() => handleViewConnection(record)}
          >
            连接
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/device/${record.id}`)}
          >
            详情
          </Button>
          <Popconfirm
            title="确定删除该设备?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 渲染创建表单
  const renderCreateForm = () => {
    const currentSpecs = providerSpecs.filter((s) => s.provider === selectedProvider);

    return (
      <Form form={form} layout="vertical" onFinish={handleCreate}>
        <Form.Item
          name="name"
          label="设备名称"
          rules={[{ required: true, message: '请输入设备名称' }]}
        >
          <Input placeholder="例如: my-device-1" />
        </Form.Item>

        <Form.Item
          name="provider"
          label="提供商"
          rules={[{ required: true, message: '请选择提供商' }]}
          initialValue={DeviceProvider.DOCKER}
        >
          <Select onChange={(value) => setSelectedProvider(value)}>
            {Object.values(DeviceProvider).map((p) => (
              <Select.Option key={p} value={p}>
                {ProviderIcons[p]} {ProviderNames[p]}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Redroid 配置 */}
        {selectedProvider === DeviceProvider.DOCKER && (
          <>
            <Form.Item name="cpuCores" label="CPU 核心" initialValue={2}>
              <InputNumber min={1} max={16} />
            </Form.Item>
            <Form.Item name="memoryMB" label="内存 (MB)" initialValue={4096}>
              <InputNumber min={1024} max={32768} step={1024} />
            </Form.Item>
            <Form.Item name="diskGB" label="磁盘 (GB)" initialValue={10}>
              <InputNumber min={5} max={100} />
            </Form.Item>
            <Form.Item name="androidVersion" label="Android 版本" initialValue="13">
              <Select>
                <Select.Option value="11">Android 11</Select.Option>
                <Select.Option value="12">Android 12</Select.Option>
                <Select.Option value="13">Android 13</Select.Option>
              </Select>
            </Form.Item>
          </>
        )}

        {/* 华为云配置 */}
        {selectedProvider === DeviceProvider.HUAWEI && (
          <>
            <Form.Item
              name="specId"
              label="规格"
              rules={[{ required: true, message: '请选择规格' }]}
            >
              <Select placeholder="选择华为云规格">
                {currentSpecs.map((spec) => (
                  <Select.Option key={spec.id} value={spec.id}>
                    {spec.displayName} - {spec.cpuCores}核/{(spec.memoryMB / 1024).toFixed(1)}G - ¥
                    {spec.price}/小时
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="phoneModel" label="手机型号" initialValue="cloudphone.arm.2xlarge">
              <Input placeholder="例如: cloudphone.arm.2xlarge" />
            </Form.Item>
          </>
        )}

        {/* 阿里云配置 */}
        {selectedProvider === DeviceProvider.ALIYUN && (
          <>
            <Form.Item
              name="instanceType"
              label="实例类型"
              rules={[{ required: true, message: '请选择实例类型' }]}
            >
              <Select placeholder="选择阿里云实例类型">
                {currentSpecs.map((spec) => (
                  <Select.Option key={spec.id} value={spec.id}>
                    {spec.displayName} - {spec.cpuCores}核/{(spec.memoryMB / 1024).toFixed(1)}G - ¥
                    {spec.price}/小时
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </>
        )}

        {/* 物理设备配置 */}
        {selectedProvider === DeviceProvider.PHYSICAL && (
          <Form.Item
            name="serialNumber"
            label="设备序列号"
            rules={[{ required: true, message: '请输入设备序列号' }]}
          >
            <Input placeholder="例如: ABCD1234EFGH" />
          </Form.Item>
        )}
      </Form>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总设备数"
              value={stats?.total || 0}
              prefix={<ContainerOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="运行中"
              value={stats?.running || 0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已停止"
              value={stats?.stopped || 0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<StopOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="错误"
              value={stats?.error || 0}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<DeleteOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 按提供商统计 */}
      {stats?.byProvider && stats.byProvider.length > 0 && (
        <Card title="提供商分布" style={{ marginBottom: '24px' }}>
          <Row gutter={16}>
            {stats.byProvider.map((item) => (
              <Col span={6} key={item.provider}>
                <Statistic
                  title={ProviderNames[item.provider]}
                  value={item.count}
                  prefix={<span style={{ fontSize: '20px' }}>{ProviderIcons[item.provider]}</span>}
                />
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* 设备表格 */}
      <Card
        title="设备列表"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
            创建设备
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={devices}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1500 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 台设备`,
            onChange: (page, pageSize) => {
              setPage(page);
              setPageSize(pageSize);
            },
          }}
        />
      </Card>

      {/* 创建设备对话框 */}
      <Modal
        title="创建设备"
        open={createModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        width={600}
      >
        {renderCreateForm()}
      </Modal>

      {/* 连接信息抽屉 */}
      <Drawer
        title="连接信息"
        placement="right"
        width={600}
        open={connectionDrawerVisible}
        onClose={() => setConnectionDrawerVisible(false)}
      >
        {selectedDevice && (
          <>
            <Descriptions title="基本信息" bordered column={1}>
              <Descriptions.Item label="设备名称">{selectedDevice.name}</Descriptions.Item>
              <Descriptions.Item label="提供商">
                {getProviderTag(selectedDevice.provider)}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(selectedDevice.status)}
              </Descriptions.Item>
            </Descriptions>

            {connectionInfo && (
              <Tabs
                defaultActiveKey="adb"
                style={{ marginTop: '24px' }}
                items={[
                  connectionInfo.adb && {
                    key: 'adb',
                    label: 'ADB',
                    children: (
                      <Descriptions bordered column={1}>
                        <Descriptions.Item label="主机">{connectionInfo.adb.host}</Descriptions.Item>
                        <Descriptions.Item label="端口">{connectionInfo.adb.port}</Descriptions.Item>
                        {connectionInfo.adb.serialNumber && (
                          <Descriptions.Item label="序列号">
                            {connectionInfo.adb.serialNumber}
                          </Descriptions.Item>
                        )}
                        <Descriptions.Item label="连接命令">
                          <code>adb connect {connectionInfo.adb.host}:{connectionInfo.adb.port}</code>
                        </Descriptions.Item>
                      </Descriptions>
                    ),
                  },
                  connectionInfo.scrcpy && {
                    key: 'scrcpy',
                    label: 'Scrcpy',
                    children: (
                      <Descriptions bordered column={1}>
                        <Descriptions.Item label="主机">
                          {connectionInfo.scrcpy.host}
                        </Descriptions.Item>
                        <Descriptions.Item label="端口">
                          {connectionInfo.scrcpy.port}
                        </Descriptions.Item>
                        <Descriptions.Item label="最大码率">
                          {connectionInfo.scrcpy.maxBitrate / 1000000}M
                        </Descriptions.Item>
                        <Descriptions.Item label="编码器">
                          {connectionInfo.scrcpy.codec}
                        </Descriptions.Item>
                      </Descriptions>
                    ),
                  },
                  connectionInfo.webrtc && {
                    key: 'webrtc',
                    label: 'WebRTC',
                    children: (
                      <Descriptions bordered column={1}>
                        <Descriptions.Item label="会话 ID">
                          {connectionInfo.webrtc.sessionId}
                        </Descriptions.Item>
                        {connectionInfo.webrtc.signaling && (
                          <Descriptions.Item label="信令服务器">
                            {connectionInfo.webrtc.signaling}
                          </Descriptions.Item>
                        )}
                        <Descriptions.Item label="STUN 服务器">
                          {connectionInfo.webrtc.stunServers.join(', ')}
                        </Descriptions.Item>
                      </Descriptions>
                    ),
                  },
                ].filter(Boolean) as any}
              />
            )}
          </>
        )}
      </Drawer>
    </div>
  );
};

export default DeviceListMultiProvider;
