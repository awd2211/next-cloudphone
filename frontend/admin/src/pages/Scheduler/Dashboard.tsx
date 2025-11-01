import { useState, useEffect, useMemo } from 'react';
import { Card, Space, message, Tabs } from 'antd';
import { Form } from 'antd';
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
  type SchedulerNode,
  type ClusterStats,
  type SchedulingStrategy,
  type SchedulingTask,
  type CreateNodeDto,
  type UpdateNodeDto,
} from '@/services/scheduler';
import {
  ClusterStatsCard,
  StrategyCard,
  NodeListTab,
  TaskListTab,
  NodeFormModal,
  NodeDetailModal,
  createNodeColumns,
  createTaskColumns,
} from '@/components/Scheduler';

const { TabPane } = Tabs;

const SchedulerDashboard = () => {
  const [nodes, setNodes] = useState<SchedulerNode[]>([]);
  const [clusterStats, setClusterStats] = useState<ClusterStats | null>(null);
  const [strategies, setStrategies] = useState<SchedulingStrategy[]>([]);
  const [activeStrategy, setActiveStrategyState] = useState<SchedulingStrategy | null>(null);
  const [tasks, setTasks] = useState<SchedulingTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [nodeModalVisible, setNodeModalVisible] = useState(false);
  const [editingNode, setEditingNode] = useState<SchedulerNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<SchedulerNode | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('nodes');

  const [nodeForm] = Form.useForm();

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

  // 表格列定义 - 使用 useMemo 优化
  const nodeColumns = useMemo(
    () =>
      createNodeColumns({
        onEdit: openNodeModal,
        onToggleMaintenance: handleToggleMaintenance,
        onDrain: handleDrainNode,
        onDelete: handleDeleteNode,
        onViewDetail: openNodeDetail,
      }),
    []
  );

  const taskColumns = useMemo(() => createTaskColumns(), []);

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 集群统计 */}
        <ClusterStatsCard clusterStats={clusterStats} />

        {/* 调度策略 */}
        <StrategyCard
          strategies={strategies}
          activeStrategy={activeStrategy}
          onActivateStrategy={handleActivateStrategy}
        />

        {/* 节点和任务列表 */}
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="节点列表" key="nodes">
              <NodeListTab
                nodes={nodes}
                loading={loading}
                nodeColumns={nodeColumns}
                onRefresh={loadNodes}
                onAdd={() => openNodeModal()}
              />
            </TabPane>

            <TabPane tab="调度任务" key="tasks">
              <TaskListTab tasks={tasks} taskColumns={taskColumns} onRefresh={loadTasks} />
            </TabPane>
          </Tabs>
        </Card>
      </Space>

      {/* 节点创建/编辑模态框 */}
      <NodeFormModal
        visible={nodeModalVisible}
        editingNode={editingNode}
        form={nodeForm}
        onOk={handleNodeSubmit}
        onCancel={() => setNodeModalVisible(false)}
      />

      {/* 节点详情模态框 */}
      <NodeDetailModal
        visible={detailModalVisible}
        selectedNode={selectedNode}
        onClose={() => setDetailModalVisible(false)}
      />
    </div>
  );
};

export default SchedulerDashboard;
