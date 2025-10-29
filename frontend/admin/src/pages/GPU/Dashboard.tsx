import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Select,
  message,
  Tag,
  Progress,
  Tooltip,
  Descriptions,
  Alert,
  Tabs,
} from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DashboardOutlined,
  FireOutlined,
  AreaChartOutlined,
  LinkOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getGPUDevices,
  getGPUStats,
  allocateGPU,
  deallocateGPU,
  getGPUAllocations,
  type GPUDevice,
  type GPUStats,
  type GPUAllocation,
} from '@/services/gpu';
import dayjs from 'dayjs';

const { Option } = Select;
const { TabPane } = Tabs;

const GPUDashboard = () => {
  const [gpus, setGpus] = useState<GPUDevice[]>([]);
  const [allocations, setAllocations] = useState<GPUAllocation[]>([]);
  const [stats, setStats] = useState<GPUStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [allocateVisible, setAllocateVisible] = useState(false);
  const [selectedGPU, setSelectedGPU] = useState<GPUDevice | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('devices');

  const [form] = Form.useForm();

  const loadGPUs = async () => {
    setLoading(true);
    try {
      const res = await getGPUDevices({ page: 1, pageSize: 100 });
      setGpus(res.data);
    } catch (error) {
      message.error('加载 GPU 列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getGPUStats();
      setStats(statsData);
    } catch (error) {
      message.error('加载统计失败');
    }
  };

  const loadAllocations = async () => {
    try {
      const res = await getGPUAllocations({ page: 1, pageSize: 50, status: 'active' });
      setAllocations(res.data);
    } catch (error) {
      message.error('加载分配记录失败');
    }
  };

  useEffect(() => {
    loadGPUs();
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'allocations') {
      loadAllocations();
    }
  }, [activeTab]);

  const openAllocateModal = (gpu: GPUDevice) => {
    if (gpu.allocatedTo) {
      message.warning('该 GPU 已被分配');
      return;
    }
    setSelectedGPU(gpu);
    setAllocateVisible(true);
    form.resetFields();
  };

  const handleAllocate = async () => {
    try {
      const values = await form.validateFields();
      await allocateGPU(selectedGPU!.id, values.deviceId, values.mode);
      message.success('GPU 分配成功');
      setAllocateVisible(false);
      loadGPUs();
      loadStats();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('分配失败');
    }
  };

  const handleDeallocate = async (gpuId: string, deviceId?: string) => {
    try {
      await deallocateGPU(gpuId, deviceId);
      message.success('GPU 已释放');
      loadGPUs();
      loadStats();
      loadAllocations();
    } catch (error) {
      message.error('释放失败');
    }
  };

  const viewDetail = (gpu: GPUDevice) => {
    setSelectedGPU(gpu);
    setDetailVisible(true);
  };

  const getStatusTag = (status: string) => {
    const map: Record<string, { color: string; icon: JSX.Element }> = {
      online: { color: 'success', icon: <CheckCircleOutlined /> },
      offline: { color: 'error', icon: <CloseCircleOutlined /> },
      error: { color: 'error', icon: <CloseCircleOutlined /> },
    };
    const config = map[status] || map.offline;
    return (
      <Tag color={config.color} icon={config.icon}>
        {status}
      </Tag>
    );
  };

  const getAllocationModeTag = (mode: string) => {
    const map: Record<string, { color: string; text: string }> = {
      exclusive: { color: 'red', text: '独占' },
      shared: { color: 'blue', text: '共享' },
      available: { color: 'green', text: '可用' },
    };
    const config = map[mode] || map.available;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const gpuColumns: ColumnsType<GPUDevice> = [
    {
      title: 'GPU 名称',
      key: 'name',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <a onClick={() => viewDetail(record)}>{record.name}</a>
          <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.model}</span>
        </Space>
      ),
    },
    {
      title: '节点',
      dataIndex: 'nodeName',
      key: 'nodeName',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'GPU 使用率',
      key: 'utilization',
      width: 150,
      render: (_, record) => (
        <Tooltip title={`${record.utilizationRate}%`}>
          <Progress
            percent={record.utilizationRate}
            size="small"
            status={record.utilizationRate > 80 ? 'exception' : 'normal'}
          />
        </Tooltip>
      ),
    },
    {
      title: '显存',
      key: 'memory',
      width: 150,
      render: (_, record) => {
        const percent = (record.memoryUsed / record.totalMemoryMB) * 100;
        return (
          <Tooltip title={`${record.memoryUsed}MB / ${record.totalMemoryMB}MB`}>
            <Progress percent={Math.round(percent)} size="small" status={percent > 80 ? 'exception' : 'normal'} />
          </Tooltip>
        );
      },
    },
    {
      title: '温度',
      dataIndex: 'temperature',
      key: 'temperature',
      width: 100,
      render: (temp) =>
        temp ? (
          <span style={{ color: temp > 80 ? '#ff4d4f' : temp > 70 ? '#faad14' : '#52c41a' }}>
            <FireOutlined /> {temp}°C
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: '分配模式',
      dataIndex: 'allocationMode',
      key: 'allocationMode',
      width: 100,
      render: (mode) => getAllocationModeTag(mode),
    },
    {
      title: '分配到',
      dataIndex: 'allocatedTo',
      key: 'allocatedTo',
      width: 120,
      render: (deviceId) => (deviceId ? <Tag color="blue">{deviceId.substring(0, 8)}</Tag> : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {!record.allocatedTo ? (
            <Button
              type="link"
              size="small"
              icon={<LinkOutlined />}
              onClick={() => openAllocateModal(record)}
              disabled={record.status !== 'online'}
            >
              分配
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              danger
              icon={<DisconnectOutlined />}
              onClick={() => handleDeallocate(record.id, record.allocatedTo)}
            >
              释放
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const allocationColumns: ColumnsType<GPUAllocation> = [
    {
      title: 'GPU ID',
      dataIndex: 'gpuId',
      key: 'gpuId',
      width: 120,
      render: (id) => id.substring(0, 12),
    },
    {
      title: '设备 ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      width: 120,
      render: (id) => id.substring(0, 12),
    },
    {
      title: '用户 ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
      render: (id) => id.substring(0, 12),
    },
    {
      title: '分配时间',
      dataIndex: 'allocatedAt',
      key: 'allocatedAt',
      width: 160,
      render: (time) => dayjs(time).format('MM-DD HH:mm'),
    },
    {
      title: '平均使用率',
      key: 'avgUtilization',
      width: 120,
      render: (_, record) => (record.usageStats ? `${record.usageStats.avgUtilization}%` : '-'),
    },
    {
      title: '峰值使用率',
      key: 'peakUtilization',
      width: 120,
      render: (_, record) => (record.usageStats ? `${record.usageStats.peakUtilization}%` : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          danger
          onClick={() => handleDeallocate(record.gpuId, record.deviceId)}
        >
          释放
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="GPU 总数"
                value={stats?.totalGPUs || 0}
                prefix={<ThunderboltOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="在线 GPU"
                value={stats?.onlineGPUs || 0}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均使用率"
                value={stats?.avgUtilization || 0}
                precision={1}
                suffix="%"
                valueStyle={{ color: (stats?.avgUtilization || 0) > 80 ? '#ff4d4f' : '#52c41a' }}
                prefix={<DashboardOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均温度"
                value={stats?.avgTemperature || 0}
                precision={1}
                suffix="°C"
                valueStyle={{ color: (stats?.avgTemperature || 0) > 75 ? '#ff4d4f' : '#52c41a' }}
                prefix={<FireOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="GPU 设备" key="devices">
              <Table
                columns={gpuColumns}
                dataSource={gpus}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1400 }}
              />
            </TabPane>

            <TabPane tab="分配记录" key="allocations">
              <Table
                columns={allocationColumns}
                dataSource={allocations}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1000 }}
              />
            </TabPane>
          </Tabs>
        </Card>
      </Space>

      <Modal
        title="分配 GPU"
        open={allocateVisible}
        onCancel={() => setAllocateVisible(false)}
        onOk={handleAllocate}
      >
        <Alert
          message={`将分配 GPU: ${selectedGPU?.name} (${selectedGPU?.model})`}
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <Form form={form} layout="vertical">
          <Form.Item
            label="目标设备 ID"
            name="deviceId"
            rules={[{ required: true, message: '请输入设备 ID' }]}
          >
            <Select showSearch placeholder="选择或输入设备 ID">
              {/* 实际应用中，这里应该从设备列表 API 获取 */}
            </Select>
          </Form.Item>
          <Form.Item label="分配模式" name="mode" initialValue="exclusive">
            <Select>
              <Option value="exclusive">独占模式</Option>
              <Option value="shared">共享模式</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="GPU 详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {selectedGPU && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="名称" span={2}>
              {selectedGPU.name}
            </Descriptions.Item>
            <Descriptions.Item label="型号">{selectedGPU.model}</Descriptions.Item>
            <Descriptions.Item label="厂商">{selectedGPU.vendor}</Descriptions.Item>
            <Descriptions.Item label="驱动版本">{selectedGPU.driverVersion}</Descriptions.Item>
            <Descriptions.Item label="CUDA 版本">{selectedGPU.cudaVersion || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">{getStatusTag(selectedGPU.status)}</Descriptions.Item>
            <Descriptions.Item label="节点">{selectedGPU.nodeName}</Descriptions.Item>
            <Descriptions.Item label="显存容量">{selectedGPU.totalMemoryMB} MB</Descriptions.Item>
            <Descriptions.Item label="已用显存">{selectedGPU.memoryUsed} MB</Descriptions.Item>
            <Descriptions.Item label="使用率">{selectedGPU.utilizationRate}%</Descriptions.Item>
            <Descriptions.Item label="温度">{selectedGPU.temperature}°C</Descriptions.Item>
            <Descriptions.Item label="功耗">
              {selectedGPU.powerUsage}W / {selectedGPU.powerLimit}W
            </Descriptions.Item>
            <Descriptions.Item label="风扇转速">{selectedGPU.fanSpeed}%</Descriptions.Item>
            <Descriptions.Item label="分配模式">
              {getAllocationModeTag(selectedGPU.allocationMode)}
            </Descriptions.Item>
            <Descriptions.Item label="分配到">
              {selectedGPU.allocatedTo || '未分配'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default GPUDashboard;
