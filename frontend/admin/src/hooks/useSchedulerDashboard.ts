import { useState, useEffect, useCallback } from 'react';
import { Form, message } from 'antd';
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

/**
 * 调度器仪表盘业务逻辑 Hook
 *
 * 功能:
 * 1. 数据加载 (节点、统计、策略、任务)
 * 2. 节点管理 (CRUD、维护模式、排空)
 * 3. 策略管理 (激活策略)
 * 4. Modal 状态管理
 */
export const useSchedulerDashboard = () => {
  // ===== 数据状态 =====
  const [nodes, setNodes] = useState<SchedulerNode[]>([]);
  const [clusterStats, setClusterStats] = useState<ClusterStats | null>(null);
  const [strategies, setStrategies] = useState<SchedulingStrategy[]>([]);
  const [activeStrategyState, setActiveStrategyState] = useState<SchedulingStrategy | null>(null);
  const [tasks, setTasks] = useState<SchedulingTask[]>([]);
  const [loading, setLoading] = useState(false);

  // ===== Modal 状态 =====
  const [nodeModalVisible, setNodeModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingNode, setEditingNode] = useState<SchedulerNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<SchedulerNode | null>(null);
  const [activeTab, setActiveTab] = useState('nodes');

  // ===== Form =====
  const [nodeForm] = Form.useForm();

  // ===== 数据加载 =====
  const loadNodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNodes({ page: 1, pageSize: 100 });
      setNodes(res.data);
    } catch (error) {
      message.error('加载节点失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClusterStats = useCallback(async () => {
    try {
      const stats = await getClusterStats();
      setClusterStats(stats);
    } catch (error) {
      message.error('加载集群统计失败');
    }
  }, []);

  const loadStrategies = useCallback(async () => {
    try {
      const strategies = await getStrategies();
      setStrategies(strategies);
      const active = await getActiveStrategy();
      setActiveStrategyState(active);
    } catch (error) {
      message.error('加载调度策略失败');
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const res = await getTasks({ page: 1, pageSize: 20 });
      setTasks(res.data);
    } catch (error) {
      message.error('加载调度任务失败');
    }
  }, []);

  useEffect(() => {
    loadNodes();
    loadClusterStats();
    loadStrategies();
    loadTasks();
  }, []);

  // ===== 节点操作 =====
  const openNodeModal = useCallback(
    (node?: SchedulerNode) => {
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
    },
    [nodeForm]
  );

  const handleNodeSubmit = useCallback(async () => {
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
  }, [editingNode, nodeForm, loadNodes, loadClusterStats]);

  const handleDeleteNode = useCallback(
    async (id: string) => {
      try {
        await deleteNode(id);
        message.success('节点删除成功');
        loadNodes();
        loadClusterStats();
      } catch (error) {
        message.error('删除失败');
      }
    },
    [loadNodes, loadClusterStats]
  );

  const handleToggleMaintenance = useCallback(
    async (id: string, enable: boolean) => {
      try {
        await setNodeMaintenance(id, enable);
        message.success(`节点已${enable ? '进入' : '退出'}维护模式`);
        loadNodes();
      } catch (error) {
        message.error('操作失败');
      }
    },
    [loadNodes]
  );

  const handleDrainNode = useCallback(
    async (id: string) => {
      try {
        await drainNode(id);
        message.success('节点排空任务已提交');
        loadNodes();
      } catch (error) {
        message.error('操作失败');
      }
    },
    [loadNodes]
  );

  const openNodeDetail = useCallback((node: SchedulerNode) => {
    setSelectedNode(node);
    setDetailModalVisible(true);
  }, []);

  // ===== 策略操作 =====
  const handleActivateStrategy = useCallback(
    async (id: string) => {
      try {
        await setActiveStrategy(id);
        message.success('调度策略已激活');
        loadStrategies();
      } catch (error) {
        message.error('操作失败');
      }
    },
    [loadStrategies]
  );

  return {
    // 数据
    nodes,
    clusterStats,
    strategies,
    activeStrategy: activeStrategyState,
    tasks,
    loading,

    // Modal 状态
    nodeModalVisible,
    setNodeModalVisible,
    detailModalVisible,
    setDetailModalVisible,
    editingNode,
    selectedNode,
    activeTab,
    setActiveTab,

    // Form
    nodeForm,

    // 操作
    loadNodes,
    loadTasks,
    openNodeModal,
    handleNodeSubmit,
    handleDeleteNode,
    handleToggleMaintenance,
    handleDrainNode,
    openNodeDetail,
    handleActivateStrategy,
  };
};
