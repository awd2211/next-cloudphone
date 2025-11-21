import { useState, useCallback } from 'react';
import { Form, message, Modal } from 'antd';
import { z } from 'zod';
import {
  getLifecycleRules,
  createLifecycleRule,
  updateLifecycleRule,
  deleteLifecycleRule,
  toggleLifecycleRule,
  executeLifecycleRule,
  testLifecycleRule,
  getLifecycleHistory,
  getLifecycleStats,
  getLifecycleRuleTemplates,
  createRuleFromTemplate,
} from '@/services/lifecycle';
import type {
  CreateLifecycleRuleDto,
  UpdateLifecycleRuleDto,
  PaginationParams,
} from '@/types';
import { useValidatedQuery } from '@/hooks/utils';
import {
  LifecycleRuleSchema,
  LifecycleExecutionHistorySchema,
  LifecycleStatsSchema,
  LifecycleRuleTemplateSchema,
  PaginatedLifecycleRulesResponseSchema,
  PaginatedLifecycleHistoryResponseSchema,
} from '@/schemas/api.schemas';

/**
 * 生命周期管理仪表盘业务逻辑 Hook
 *
 * 功能:
 * 1. 数据加载 (规则、执行历史、统计、模板) - 使用 useValidatedQuery + Zod 验证
 * 2. 规则管理 (CRUD、启用/禁用、执行、测试)
 * 3. 模板管理
 * 4. 分页和筛选
 * 5. Modal 状态管理
 */
export const useLifecycleDashboard = () => {
  // ===== 分页和筛选状态 =====
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterEnabled, setFilterEnabled] = useState<boolean | undefined>(undefined);

  // ===== Modal 状态 =====
  const [modalVisible, setModalVisible] = useState(false);
  const [historyDetailVisible, setHistoryDetailVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<z.infer<typeof LifecycleRuleSchema> | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<z.infer<typeof LifecycleExecutionHistorySchema> | null>(null);
  const [activeTab, setActiveTab] = useState('rules');

  // ===== Form 实例 =====
  const [form] = Form.useForm();
  const [configForm] = Form.useForm();

  // ===== 数据加载 (使用 useValidatedQuery) =====

  /**
   * 加载规则列表（带分页和筛选）
   */
  const {
    data: rulesResponse,
    isLoading: loading,
    refetch: loadRules,
  } = useValidatedQuery({
    queryKey: ['lifecycle-rules', page, pageSize, filterType, filterEnabled],
    queryFn: () => {
      const params: PaginationParams & { type?: string; enabled?: boolean } = {
        page,
        pageSize,
      };
      if (filterType) params.type = filterType;
      if (filterEnabled !== undefined) params.enabled = filterEnabled;
      return getLifecycleRules(params);
    },
    schema: PaginatedLifecycleRulesResponseSchema,
    apiErrorMessage: '加载规则失败',
    fallbackValue: { data: [], total: 0 },
    staleTime: 30 * 1000, // 规则列表30秒缓存
  });

  const rules = rulesResponse?.data || [];
  const total = rulesResponse?.total || 0;

  /**
   * 加载执行历史（仅当 activeTab === 'history' 时加载）
   */
  const {
    data: historyResponse,
    isLoading: historyLoading,
    refetch: loadHistory,
  } = useValidatedQuery({
    queryKey: ['lifecycle-history', historyPage, historyPageSize],
    queryFn: () =>
      getLifecycleHistory({
        page: historyPage,
        pageSize: historyPageSize,
      }),
    schema: PaginatedLifecycleHistoryResponseSchema,
    apiErrorMessage: '加载历史失败',
    fallbackValue: { data: [], total: 0 },
    enabled: activeTab === 'history', // 仅在 history tab 时加载
    staleTime: 30 * 1000,
  });

  const history = historyResponse?.data || [];
  const historyTotal = historyResponse?.total || 0;

  /**
   * 加载统计信息
   */
  const { data: stats } = useValidatedQuery({
    queryKey: ['lifecycle-stats'],
    queryFn: getLifecycleStats,
    schema: LifecycleStatsSchema,
    apiErrorMessage: '加载统计失败',
    staleTime: 60 * 1000, // 统计数据1分钟缓存
  });

  /**
   * 加载模板列表
   */
  const { data: templates } = useValidatedQuery({
    queryKey: ['lifecycle-templates'],
    queryFn: getLifecycleRuleTemplates,
    schema: z.array(LifecycleRuleTemplateSchema),
    apiErrorMessage: '加载模板失败',
    fallbackValue: [],
    staleTime: 5 * 60 * 1000, // 模板很少变化，5分钟缓存
  });

  // ===== 规则操作 =====

  /**
   * 打开创建/编辑模态框
   */
  const openModal = useCallback(
    (rule?: z.infer<typeof LifecycleRuleSchema>) => {
      if (rule) {
        setEditingRule(rule);
        form.setFieldsValue({
          name: rule.name,
          description: rule.description,
          type: rule.type,
          enabled: rule.enabled,
          priority: rule.priority,
          schedule: rule.schedule,
        });
        // 配置需要单独处理
        configForm.setFieldsValue(rule.config);
      } else {
        setEditingRule(null);
        form.resetFields();
        configForm.resetFields();
      }
      setModalVisible(true);
    },
    [form, configForm]
  );

  /**
   * 处理创建/更新
   */
  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const config = configForm.getFieldsValue();

      const data: CreateLifecycleRuleDto | UpdateLifecycleRuleDto = {
        name: values.name,
        description: values.description,
        type: values.type,
        enabled: values.enabled,
        priority: values.priority,
        schedule: values.schedule,
        config,
      };

      if (editingRule) {
        await updateLifecycleRule(editingRule.id, data);
        message.success('规则更新成功');
      } else {
        await createLifecycleRule(data as CreateLifecycleRuleDto);
        message.success('规则创建成功');
      }

      setModalVisible(false);
      loadRules();
      // stats 会自动重新加载
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || '操作失败');
    }
  }, [form, configForm, editingRule, loadRules]);

  /**
   * 删除规则
   */
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteLifecycleRule(id);
        message.success('规则删除成功');
        loadRules();
        // stats 会自动重新加载
      } catch (_error) {
        message.error('删除失败');
      }
    },
    [loadRules]
  );

  /**
   * 切换启用状态
   */
  const handleToggle = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        await toggleLifecycleRule(id, enabled);
        message.success(`规则已${enabled ? '启用' : '禁用'}`);
        loadRules();
      } catch (_error) {
        message.error('操作失败');
      }
    },
    [loadRules]
  );

  /**
   * 手动执行规则
   */
  const handleExecute = useCallback(
    async (id: string, ruleName: string) => {
      try {
        await executeLifecycleRule(id);
        message.success(`规则 "${ruleName}" 已开始执行`);
        if (activeTab === 'history') {
          loadHistory();
        }
      } catch (_error) {
        message.error('执行失败');
      }
    },
    [activeTab, loadHistory]
  );

  /**
   * 测试规则
   */
  const handleTest = useCallback(async (id: string, ruleName: string) => {
    try {
      const result = await testLifecycleRule(id, true);
      Modal.info({
        title: `规则测试: ${ruleName}`,
        content: (
          <div>
            <p>测试结果 (模拟执行):</p>
            <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ),
        width: 600,
      });
    } catch (_error) {
      message.error('测试失败');
    }
  }, []);

  /**
   * 从模板创建
   */
  const handleCreateFromTemplate = useCallback(
    async (templateId: string) => {
      try {
        const rule = await createRuleFromTemplate(templateId);
        message.success('规则创建成功');
        openModal(rule);
      } catch (_error) {
        message.error('创建失败');
      }
    },
    [openModal]
  );

  /**
   * 查看历史详情
   */
  const viewHistoryDetail = useCallback((historyItem: z.infer<typeof LifecycleExecutionHistorySchema>) => {
    setSelectedHistory(historyItem);
    setHistoryDetailVisible(true);
  }, []);

  /**
   * 分页处理
   */
  const handlePageChange = useCallback((newPage: number, newPageSize?: number) => {
    setPage(newPage);
    setPageSize(newPageSize || 10);
  }, []);

  const handleHistoryPageChange = useCallback((newPage: number, newPageSize?: number) => {
    setHistoryPage(newPage);
    setHistoryPageSize(newPageSize || 10);
  }, []);

  return {
    // 数据状态
    rules,
    history,
    stats: stats || null,
    templates: templates || [],
    loading,
    historyLoading,
    total,
    historyTotal,
    page,
    pageSize,
    historyPage,
    historyPageSize,
    // 模态框状态
    modalVisible,
    historyDetailVisible,
    // 选中状态
    editingRule,
    selectedHistory,
    activeTab,
    // 筛选状态
    filterType,
    filterEnabled,
    // Form 实例
    form,
    configForm,
    // 处理函数
    openModal,
    handleSubmit,
    handleDelete,
    handleToggle,
    handleExecute,
    handleTest,
    handleCreateFromTemplate,
    viewHistoryDetail,
    handlePageChange,
    handleHistoryPageChange,
    // 状态设置
    setModalVisible,
    setHistoryDetailVisible,
    setActiveTab,
    setFilterType,
    setFilterEnabled,
  };
};
