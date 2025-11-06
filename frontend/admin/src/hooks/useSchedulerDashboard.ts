import { useState, useEffect, useCallback } from 'react';
import { Form, message } from 'antd';
import { z } from 'zod';
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
  type CreateNodeDto,
  type UpdateNodeDto,
} from '@/services/scheduler';
import { useSafeApi } from './useSafeApi';
import {
  SchedulerNodeSchema,
  ClusterStatsSchema,
  SchedulingStrategySchema,
  SchedulingTaskSchema,
} from '@/schemas/api.schemas';

/**
 * 调度器仪表盘业务逻辑 Hook
 *
 * 功能:
 * 1. 数据加载 (节点、统计、策略、任务) - 使用 useSafeApi + Zod 验证
 * 2. 节点管理 (CRUD、维护模式、排空)
 * 3. 策略管理 (激活策略)
 * 4. Modal 状态管理
 */
export const useSchedulerDashboard = () => {
  // ===== Modal 状态 =====
  const [nodeModalVisible, setNodeModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingNode, setEditingNode] = useState<z.infer<typeof SchedulerNodeSchema> | null>(null);
  const [selectedNode, setSelectedNode] = useState<z.infer<typeof SchedulerNodeSchema> | null>(null);
  const [activeTab, setActiveTab] = useState('nodes');

  // ===== Form =====
  const [nodeForm] = Form.useForm();

  // ===== 数据加载 (使用 useSafeApi) =====

  /**
   * 加载节点列表
   */
  const {
    data: nodesResponse,
    loading,
    execute: executeLoadNodes,
  } = useSafeApi(
    () => getNodes({ page: 1, pageSize: 100 }),
    z.object({
      data: z.array(SchedulerNodeSchema),
      total: z.number(),
    }),
    {
      errorMessage: '加载节点失败',
      fallbackValue: { data: [], total: 0 },
    }
  );

  const nodes = nodesResponse?.data || [];

  /**
   * 加载集群统计
   */
  const { data: clusterStats } = useSafeApi(
    getClusterStats,
    ClusterStatsSchema,
    {
      errorMessage: '加载集群统计失败',
      showError: false,
    }
  );

  /**
   * 加载调度策略和激活策略
   */
  const { data: strategiesData, execute: executeLoadStrategies } = useSafeApi(
    async () => {
      const [strategies, active] = await Promise.all([
        getStrategies(),
        getActiveStrategy(),
      ]);
      return { strategies, active };
    },
    z.object({
      strategies: z.array(SchedulingStrategySchema),
      active: SchedulingStrategySchema.nullable(),
    }),
    {
      errorMessage: '加载调度策略失败',
      fallbackValue: { strategies: [], active: null },
    }
  );

  const strategies = strategiesData?.strategies || [];
  const activeStrategy = strategiesData?.active || null;

  /**
   * 加载调度任务
   */
  const { data: tasksResponse, execute: executeLoadTasks } = useSafeApi(
    () => getTasks({ page: 1, pageSize: 20 }),
    z.object({
      data: z.array(SchedulingTaskSchema),
      total: z.number(),
    }),
    {
      errorMessage: '加载调度任务失败',
      fallbackValue: { data: [], total: 0 },
    }
  );

  const tasks = tasksResponse?.data || [];

  /**
   * 初始化加载
   */
  useEffect(() => {
    executeLoadNodes();
    executeLoadStrategies();
    executeLoadTasks();
  }, [executeLoadNodes, executeLoadStrategies, executeLoadTasks]);

  // ===== 节点操作 =====

  /**
   * 打开节点模态框（创建或编辑）
   */
  const openNodeModal = useCallback(
    (node?: z.infer<typeof SchedulerNodeSchema>) => {
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

  /**
   * 提交节点表单（创建或更新）
   */
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
      executeLoadNodes();
      // clusterStats 会自动重新加载
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || '操作失败');
    }
  }, [editingNode, nodeForm, executeLoadNodes]);

  /**
   * 删除节点
   */
  const handleDeleteNode = useCallback(
    async (id: string) => {
      try {
        await deleteNode(id);
        message.success('节点删除成功');
        executeLoadNodes();
        // clusterStats 会自动重新加载
      } catch (error) {
        message.error('删除失败');
      }
    },
    [executeLoadNodes]
  );

  /**
   * 切换维护模式
   */
  const handleToggleMaintenance = useCallback(
    async (id: string, enable: boolean) => {
      try {
        await setNodeMaintenance(id, enable);
        message.success(`节点已${enable ? '进入' : '退出'}维护模式`);
        executeLoadNodes();
      } catch (error) {
        message.error('操作失败');
      }
    },
    [executeLoadNodes]
  );

  /**
   * 排空节点
   */
  const handleDrainNode = useCallback(
    async (id: string) => {
      try {
        await drainNode(id);
        message.success('节点排空任务已提交');
        executeLoadNodes();
      } catch (error) {
        message.error('操作失败');
      }
    },
    [executeLoadNodes]
  );

  /**
   * 打开节点详情模态框
   */
  const openNodeDetail = useCallback((node: z.infer<typeof SchedulerNodeSchema>) => {
    setSelectedNode(node);
    setDetailModalVisible(true);
  }, []);

  // ===== 策略操作 =====

  /**
   * 激活调度策略
   */
  const handleActivateStrategy = useCallback(
    async (id: string) => {
      try {
        await setActiveStrategy(id);
        message.success('调度策略已激活');
        executeLoadStrategies();
      } catch (error) {
        message.error('操作失败');
      }
    },
    [executeLoadStrategies]
  );

  return {
    // 数据
    nodes,
    clusterStats: clusterStats || null,
    strategies,
    activeStrategy,
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
    loadNodes: executeLoadNodes,
    loadTasks: executeLoadTasks,
    openNodeModal,
    handleNodeSubmit,
    handleDeleteNode,
    handleToggleMaintenance,
    handleDrainNode,
    openNodeDetail,
    handleActivateStrategy,
  };
};
