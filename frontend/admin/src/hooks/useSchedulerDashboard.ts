import { useState, useCallback } from 'react';
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
import { useValidatedQuery } from '@/hooks/utils';
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
 * 1. 数据加载 (节点、统计、策略、任务) - 使用 useValidatedQuery + Zod 验证
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

  // ===== 数据加载 (使用 useValidatedQuery) =====

  /**
   * 加载节点列表
   */
  const {
    data: nodesResponse,
    isLoading: loading,
    refetch: loadNodes,
  } = useValidatedQuery({
    queryKey: ['scheduler-nodes'],
    queryFn: () => getNodes({ page: 1, pageSize: 100 }),
    schema: z.object({
      data: z.array(SchedulerNodeSchema),
      total: z.number(),
    }),
    apiErrorMessage: '加载节点失败',
    fallbackValue: { data: [], total: 0 },
    staleTime: 30 * 1000, // 节点列表30秒缓存
  });

  const nodes = nodesResponse?.data || [];

  /**
   * 加载集群统计
   */
  const { data: clusterStats } = useValidatedQuery({
    queryKey: ['cluster-stats'],
    queryFn: getClusterStats,
    schema: ClusterStatsSchema,
    apiErrorMessage: '加载集群统计失败',
    staleTime: 30 * 1000, // 集群统计30秒缓存
  });

  /**
   * 加载调度策略和激活策略（并发加载）
   */
  const {
    data: strategiesData,
    refetch: loadStrategies,
  } = useValidatedQuery({
    queryKey: ['scheduling-strategies'],
    queryFn: async () => {
      const [strategies, active] = await Promise.all([
        getStrategies(),
        getActiveStrategy(),
      ]);
      return { strategies, active };
    },
    schema: z.object({
      strategies: z.array(SchedulingStrategySchema),
      active: SchedulingStrategySchema.nullable(),
    }),
    apiErrorMessage: '加载调度策略失败',
    fallbackValue: { strategies: [], active: null },
    staleTime: 60 * 1000, // 策略变化较慢，60秒缓存
  });

  const strategies = strategiesData?.strategies || [];
  const activeStrategy = strategiesData?.active || null;

  /**
   * 加载调度任务
   */
  const {
    data: tasksResponse,
    refetch: loadTasks,
  } = useValidatedQuery({
    queryKey: ['scheduling-tasks'],
    queryFn: () => getTasks({ page: 1, pageSize: 20 }),
    schema: z.object({
      data: z.array(SchedulingTaskSchema),
      total: z.number(),
    }),
    apiErrorMessage: '加载调度任务失败',
    fallbackValue: { data: [], total: 0 },
    staleTime: 10 * 1000, // 任务状态变化快，10秒缓存
  });

  const tasks = tasksResponse?.data || [];

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
      loadNodes();
      // clusterStats 会自动重新加载
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || '操作失败');
    }
  }, [editingNode, nodeForm, loadNodes]);

  /**
   * 删除节点
   */
  const handleDeleteNode = useCallback(
    async (id: string) => {
      try {
        await deleteNode(id);
        message.success('节点删除成功');
        loadNodes();
        // clusterStats 会自动重新加载
      } catch (_error) {
        message.error('删除失败');
      }
    },
    [loadNodes]
  );

  /**
   * 切换维护模式
   */
  const handleToggleMaintenance = useCallback(
    async (id: string, enable: boolean) => {
      try {
        await setNodeMaintenance(id, enable);
        message.success(`节点已${enable ? '进入' : '退出'}维护模式`);
        loadNodes();
      } catch (_error) {
        message.error('操作失败');
      }
    },
    [loadNodes]
  );

  /**
   * 排空节点
   */
  const handleDrainNode = useCallback(
    async (id: string) => {
      try {
        await drainNode(id);
        message.success('节点排空任务已提交');
        loadNodes();
      } catch (_error) {
        message.error('操作失败');
      }
    },
    [loadNodes]
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
        loadStrategies();
      } catch (_error) {
        message.error('操作失败');
      }
    },
    [loadStrategies]
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
