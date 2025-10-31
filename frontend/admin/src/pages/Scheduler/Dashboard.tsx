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
  Input,
  Select,
  InputNumber,
  message,
  Tag,
  Progress,
  Tabs,
  Descriptions,
  Tooltip,
  Alert,
  Popconfirm,
} from 'antd';
import {
  CloudServerOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ToolOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  WarningOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getNodes,
  getClusterStats,
  createNode,
  updateNode,
  deleteNode,
  setNodeMaintenance,
  drainNode,
  getStrategies,
  getActiveStrategy,
  setActiveStrategy,
  getTasks,
  scheduleDevice,
  type SchedulerNode,
  type ClusterStats,
  type SchedulingStrategy,
  type SchedulingTask,
  type CreateNodeDto,
  type UpdateNodeDto,
} from '@/services/scheduler';
import dayjs from 'dayjs';

const { Option } = Select;
const { TabPane } = Tabs;

const SchedulerDashboard = () => {
  const [nodes, setNodes] = useState<SchedulerNode[]>([]);
  const [clusterStats, setClusterStats] = useState<ClusterStats | null>(null);
  const [strategies, setStrategies] = useState<SchedulingStrategy[]>([]);
  const [activeStrategy, setActiveStrategyState] = useState<SchedulingStrategy | null>(null);
  const [tasks, setTasks] = useState<SchedulingTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [nodeModalVisible, setNodeModalVisible] = useState(false);
  const [strategyModalVisible, setStrategyModalVisible] = useState(false);
  const [editingNode, setEditingNode] = useState<SchedulerNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<SchedulerNode | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('nodes');

  const [nodeForm] = Form.useForm();
  const [strategyForm] = Form.useForm();

  // 加载节点列表
  const loadNodes = async () => {
    setLoading(true);
    try {
      const res = await getNodes({ page: 1, pageSize: 100 });
      setNodes(res.data);
    } catch (error) {
      message.error('加载节点失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载集群统计
  const loadClusterStats = async () => {
    try {
      const stats = await getClusterStats();
      setClusterStats(stats);
    } catch (error) {
      message.error('加载集群统计失败');
    }
  };

  // 加载调度策略
  const loadStrategies = async () => {
    try {
      const strategies = await getStrategies();
      setStrategies(strategies);
      const active = await getActiveStrategy();
      setActiveStrategyState(active);
    } catch (error) {
      message.error('加载调度策略失败');
    }
  };

  // 加载调度任务
  const loadTasks = async () => {
    try {
      const res = await getTasks({ page: 1, pageSize: 20 });
      setTasks(res.data);
    } catch (error) {
      message.error('加载调度任务失败');
    }
  };

  useEffect(() => {
    loadNodes();
    loadClusterStats();
    loadStrategies();
    loadTasks();
  }, []);

  // 打开节点模态框
  const openNodeModal = (node?: SchedulerNode) => {
    if (node) {
      setEditingNode(node);
      nodeForm.setFieldsValue({
        name: node.name,
        host: node.host,
        port: node.port,
        region: node.region,
        zone: node.zone,
        cpuCapacity: node.capacity.cpu,
        memoryCapacity: node.capacity.memory,
        storageCapacity: node.capacity.storage,
        maxDevices: node.capacity.maxDevices,
      });
    } else {
      setEditingNode(null);
      nodeForm.resetFields();
    }
    setNodeModalVisible(true);
  };

  // 处理节点创建/更新
  const handleNodeSubmit = async () => {
    try {
      const values = await nodeForm.validateFields();

      if (editingNode) {
        const updateData: UpdateNodeDto = {
          name: values.name,
        };
        await updateNode(editingNode.id, updateData);
        message.success('节点更新成功');
      } else {
        const createData: CreateNodeDto = {
          name: values.name,
          host: values.host,
          port: values.port,
          region: values.region,
          zone: values.zone,
          capacity: {
            cpu: values.cpuCapacity,
            memory: values.memoryCapacity,
            storage: values.storageCapacity,
            maxDevices: values.maxDevices,
          },
        };
        await createNode(createData);
        message.success('节点创建成功');
      }

      setNodeModalVisible(false);
      loadNodes();
      loadClusterStats();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || '操作失败');
    }
  };

  // 删除节点
  const handleDeleteNode = async (id: string) => {
    try {
      await deleteNode(id);
      message.success('节点删除成功');
      loadNodes();
      loadClusterStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 切换维护模式
  const handleToggleMaintenance = async (id: string, enable: boolean) => {
    try {
      await setNodeMaintenance(id, enable);
      message.success(`节点已${enable ? '进入' : '退出'}维护模式`);
      loadNodes();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 排空节点
  const handleDrainNode = async (id: string) => {
    try {
      await drainNode(id);
      message.success('节点排空任务已提交');
      loadNodes();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 激活策略
  const handleActivateStrategy = async (id: string) => {
    try {
      await setActiveStrategy(id);
      message.success('调度策略已激活');
      loadStrategies();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 查看节点详情
  const openNodeDetail = (node: SchedulerNode) => {
    setSelectedNode(node);
    setDetailModalVisible(true);
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; icon: JSX.Element }> = {
      online: { color: 'success', icon: <CheckCircleOutlined /> },
      offline: { color: 'error', icon: <CloseCircleOutlined /> },
      maintenance: { color: 'warning', icon: <ToolOutlined /> },
      draining: { color: 'processing', icon: <WarningOutlined /> },
    };
    const config = statusMap[status] || statusMap.offline;
    return (
      <Tag color={config.color} icon={config.icon}>
        {status}
      </Tag>
    );
  };

  const nodeColumns: ColumnsType<SchedulerNode> = [
    {
      title: '节点名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name, record) => <a onClick={() => openNodeDetail(record)}>{name}</a>,
    },
    {
      title: '地址',
      key: 'address',
      width: 200,
      render: (_, record) => `${record.host}:${record.port}`,
    },
    {
      title: '区域',
      key: 'location',
      width: 150,
      render: (_, record) => {
        if (!record.region && !record.zone) return '-';
        return `${record.region || ''}/${record.zone || ''}`;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'CPU使用率',
      key: 'cpuUsage',
      width: 150,
      render: (_, record) => {
        const percent = (record.usage.cpu / record.capacity.cpu) * 100;
        return (
          <Tooltip title={`${record.usage.cpu}/${record.capacity.cpu} 核`}>
            <Progress
              percent={Math.round(percent)}
              size="small"
              status={percent > 80 ? 'exception' : percent > 60 ? 'normal' : 'success'}
            />
          </Tooltip>
        );
      },
    },
    {
      title: '内存使用率',
      key: 'memoryUsage',
      width: 150,
      render: (_, record) => {
        const percent = (record.usage.memory / record.capacity.memory) * 100;
        return (
          <Tooltip
            title={`${(record.usage.memory / 1024).toFixed(1)}/${(record.capacity.memory / 1024).toFixed(1)} GB`}
          >
            <Progress
              percent={Math.round(percent)}
              size="small"
              status={percent > 80 ? 'exception' : percent > 60 ? 'normal' : 'success'}
            />
          </Tooltip>
        );
      },
    },
    {
      title: '设备数',
      key: 'deviceCount',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <span>
          {record.usage.deviceCount}/{record.capacity.maxDevices}
        </span>
      ),
    },
    {
      title: '最后心跳',
      dataIndex: 'lastHeartbeat',
      key: 'lastHeartbeat',
      width: 160,
      render: (time) => (time ? dayjs(time).format('MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openNodeModal(record)}
          >
            编辑
          </Button>
          {record.status === 'online' && (
            <Button
              type="link"
              size="small"
              icon={<ToolOutlined />}
              onClick={() => handleToggleMaintenance(record.id, true)}
            >
              维护
            </Button>
          )}
          {record.status === 'maintenance' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleToggleMaintenance(record.id, false)}
            >
              恢复
            </Button>
          )}
          <Popconfirm
            title="排空节点将迁移所有设备，确定继续？"
            onConfirm={() => handleDrainNode(record.id)}
          >
            <Button type="link" size="small" danger icon={<WarningOutlined />}>
              排空
            </Button>
          </Popconfirm>
          <Popconfirm title="确定删除此节点？" onConfirm={() => handleDeleteNode(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const taskColumns: ColumnsType<SchedulingTask> = [
    {
      title: '任务ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id) => id.substring(0, 8),
    },
    {
      title: '设备ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      width: 100,
      render: (id) => id.substring(0, 8),
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 100,
      render: (id) => id.substring(0, 8),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const colorMap: Record<string, string> = {
          pending: 'default',
          scheduled: 'processing',
          running: 'success',
          completed: 'success',
          failed: 'error',
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: '节点ID',
      dataIndex: 'nodeId',
      key: 'nodeId',
      width: 100,
      render: (id) => (id ? id.substring(0, 8) : '-'),
    },
    {
      title: '资源需求',
      key: 'requirements',
      width: 200,
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          <div>CPU: {record.requirements.cpuCores}核</div>
          <div>内存: {(record.requirements.memoryMB / 1024).toFixed(1)}GB</div>
        </div>
      ),
    },
    {
      title: '请求时间',
      dataIndex: 'requestedAt',
      key: 'requestedAt',
      width: 160,
      render: (time) => dayjs(time).format('MM-DD HH:mm:ss'),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 集群统计 */}
        <Card
          title={
            <span>
              <DashboardOutlined /> 集群概览
            </span>
          }
        >
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="总节点数"
                value={clusterStats?.totalNodes || 0}
                prefix={<CloudServerOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="在线节点"
                value={clusterStats?.onlineNodes || 0}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="离线节点"
                value={clusterStats?.offlineNodes || 0}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="维护中"
                value={clusterStats?.maintenanceNodes || 0}
                valueStyle={{ color: '#faad14' }}
                prefix={<ToolOutlined />}
              />
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: '24px' }}>
            <Col span={8}>
              <Card size="small" title="CPU 使用率">
                <Progress
                  percent={Math.round(clusterStats?.utilizationRate.cpu || 0)}
                  status={
                    (clusterStats?.utilizationRate.cpu || 0) > 80
                      ? 'exception'
                      : (clusterStats?.utilizationRate.cpu || 0) > 60
                        ? 'normal'
                        : 'success'
                  }
                />
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
                  {clusterStats?.totalUsage.cpu || 0} / {clusterStats?.totalCapacity.cpu || 0} 核
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title="内存使用率">
                <Progress
                  percent={Math.round(clusterStats?.utilizationRate.memory || 0)}
                  status={
                    (clusterStats?.utilizationRate.memory || 0) > 80
                      ? 'exception'
                      : (clusterStats?.utilizationRate.memory || 0) > 60
                        ? 'normal'
                        : 'success'
                  }
                />
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
                  {((clusterStats?.totalUsage.memory || 0) / 1024).toFixed(1)} /{' '}
                  {((clusterStats?.totalCapacity.memory || 0) / 1024).toFixed(1)} GB
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title="设备使用率">
                <Progress
                  percent={Math.round(clusterStats?.utilizationRate.devices || 0)}
                  status={
                    (clusterStats?.utilizationRate.devices || 0) > 80
                      ? 'exception'
                      : (clusterStats?.utilizationRate.devices || 0) > 60
                        ? 'normal'
                        : 'success'
                  }
                />
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
                  {clusterStats?.totalUsage.deviceCount || 0} /{' '}
                  {clusterStats?.totalCapacity.maxDevices || 0} 台
                </div>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* 调度策略 */}
        <Card title="调度策略">
          <Alert
            message={`当前激活策略: ${activeStrategy?.name || '未设置'}`}
            description={activeStrategy?.description}
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          <Space wrap>
            {strategies.map((strategy) => (
              <Button
                key={strategy.id}
                type={strategy.id === activeStrategy?.id ? 'primary' : 'default'}
                onClick={() => handleActivateStrategy(strategy.id)}
              >
                {strategy.name}
              </Button>
            ))}
          </Space>
        </Card>

        {/* 节点和任务列表 */}
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="节点列表" key="nodes">
              <div
                style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}
              >
                <Space>
                  <Button icon={<ReloadOutlined />} onClick={loadNodes}>
                    刷新
                  </Button>
                </Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openNodeModal()}>
                  添加节点
                </Button>
              </div>
              <Table
                columns={nodeColumns}
                dataSource={nodes}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1600 }}
              />
            </TabPane>

            <TabPane tab="调度任务" key="tasks">
              <div style={{ marginBottom: '16px' }}>
                <Button icon={<ReloadOutlined />} onClick={loadTasks}>
                  刷新
                </Button>
              </div>
              <Table
                columns={taskColumns}
                dataSource={tasks}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
          </Tabs>
        </Card>
      </Space>

      {/* 节点创建/编辑模态框 */}
      <Modal
        title={editingNode ? '编辑节点' : '添加节点'}
        open={nodeModalVisible}
        onCancel={() => setNodeModalVisible(false)}
        onOk={handleNodeSubmit}
        width={700}
      >
        <Form form={nodeForm} layout="vertical">
          <Form.Item
            label="节点名称"
            name="name"
            rules={[{ required: true, message: '请输入节点名称' }]}
          >
            <Input placeholder="例如: node-01" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                label="主机地址"
                name="host"
                rules={[{ required: !editingNode, message: '请输入主机地址' }]}
              >
                <Input placeholder="192.168.1.100" disabled={!!editingNode} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="端口"
                name="port"
                rules={[{ required: !editingNode, message: '请输入端口' }]}
              >
                <InputNumber
                  min={1}
                  max={65535}
                  style={{ width: '100%' }}
                  disabled={!!editingNode}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="区域" name="region">
                <Input placeholder="例如: cn-east" disabled={!!editingNode} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="可用区" name="zone">
                <Input placeholder="例如: zone-a" disabled={!!editingNode} />
              </Form.Item>
            </Col>
          </Row>

          {!editingNode && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="CPU 容量 (核)"
                    name="cpuCapacity"
                    rules={[{ required: true, message: '请输入CPU容量' }]}
                  >
                    <InputNumber min={1} max={128} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="内存容量 (MB)"
                    name="memoryCapacity"
                    rules={[{ required: true, message: '请输入内存容量' }]}
                  >
                    <InputNumber min={1024} step={1024} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="存储容量 (MB)"
                    name="storageCapacity"
                    rules={[{ required: true, message: '请输入存储容量' }]}
                  >
                    <InputNumber min={10240} step={10240} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="最大设备数"
                    name="maxDevices"
                    rules={[{ required: true, message: '请输入最大设备数' }]}
                  >
                    <InputNumber min={1} max={1000} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
        </Form>
      </Modal>

      {/* 节点详情模态框 */}
      <Modal
        title="节点详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedNode && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="节点名称" span={2}>
              {selectedNode.name}
            </Descriptions.Item>
            <Descriptions.Item label="地址" span={2}>
              {selectedNode.host}:{selectedNode.port}
            </Descriptions.Item>
            <Descriptions.Item label="区域">{selectedNode.region || '-'}</Descriptions.Item>
            <Descriptions.Item label="可用区">{selectedNode.zone || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态" span={2}>
              {getStatusTag(selectedNode.status)}
            </Descriptions.Item>
            <Descriptions.Item label="CPU 容量">{selectedNode.capacity.cpu} 核</Descriptions.Item>
            <Descriptions.Item label="CPU 使用">
              {selectedNode.usage.cpu} 核 (
              {((selectedNode.usage.cpu / selectedNode.capacity.cpu) * 100).toFixed(1)}%)
            </Descriptions.Item>
            <Descriptions.Item label="内存容量">
              {(selectedNode.capacity.memory / 1024).toFixed(1)} GB
            </Descriptions.Item>
            <Descriptions.Item label="内存使用">
              {(selectedNode.usage.memory / 1024).toFixed(1)} GB (
              {((selectedNode.usage.memory / selectedNode.capacity.memory) * 100).toFixed(1)}%)
            </Descriptions.Item>
            <Descriptions.Item label="存储容量">
              {(selectedNode.capacity.storage / 1024).toFixed(1)} GB
            </Descriptions.Item>
            <Descriptions.Item label="存储使用">
              {(selectedNode.usage.storage / 1024).toFixed(1)} GB (
              {((selectedNode.usage.storage / selectedNode.capacity.storage) * 100).toFixed(1)}%)
            </Descriptions.Item>
            <Descriptions.Item label="设备容量">
              {selectedNode.capacity.maxDevices}
            </Descriptions.Item>
            <Descriptions.Item label="设备数量">
              {selectedNode.usage.deviceCount} (
              {((selectedNode.usage.deviceCount / selectedNode.capacity.maxDevices) * 100).toFixed(
                1
              )}
              %)
            </Descriptions.Item>
            <Descriptions.Item label="最后心跳" span={2}>
              {selectedNode.lastHeartbeat
                ? dayjs(selectedNode.lastHeartbeat).format('YYYY-MM-DD HH:mm:ss')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {dayjs(selectedNode.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default SchedulerDashboard;
