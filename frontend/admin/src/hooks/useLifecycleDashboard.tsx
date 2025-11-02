import { useState, useEffect, useCallback } from 'react';
import { Form, message, Modal } from 'antd';
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
  LifecycleRule,
  CreateLifecycleRuleDto,
  UpdateLifecycleRuleDto,
  LifecycleExecutionHistory,
  LifecycleStats,
  PaginationParams,
} from '@/types';

export const useLifecycleDashboard = () => {
  // 状态管理
  const [rules, setRules] = useState<LifecycleRule[]>([]);
  const [history, setHistory] = useState<LifecycleExecutionHistory[]>([]);
  const [stats, setStats] = useState<LifecycleStats | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [historyDetailVisible, setHistoryDetailVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<LifecycleRule | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<LifecycleExecutionHistory | null>(null);
  const [activeTab, setActiveTab] = useState('rules');
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterEnabled, setFilterEnabled] = useState<boolean | undefined>(undefined);

  // Form 实例
  const [form] = Form.useForm();
  const [configForm] = Form.useForm();

  // 加载规则列表
  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const params: PaginationParams & { type?: string; enabled?: boolean } = {
        page,
        pageSize,
      };
      if (filterType) params.type = filterType;
      if (filterEnabled !== undefined) params.enabled = filterEnabled;

      const res = await getLifecycleRules(params);
      setRules(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载规则失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterType, filterEnabled]);

  // 加载执行历史
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await getLifecycleHistory({
        page: historyPage,
        pageSize: historyPageSize,
      });
      setHistory(res.data);
      setHistoryTotal(res.total);
    } catch (error) {
      message.error('加载历史失败');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historyPageSize]);

  // 加载统计信息
  const loadStats = useCallback(async () => {
    try {
      const statsData = await getLifecycleStats();
      setStats(statsData);
    } catch (error) {
      message.error('加载统计失败');
    }
  }, []);

  // 加载模板
  const loadTemplates = useCallback(async () => {
    try {
      const templatesData = await getLifecycleRuleTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error('加载模板失败', error);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadRules();
    loadStats();
    loadTemplates();
  }, [loadRules, loadStats, loadTemplates]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  // 打开创建/编辑模态框
  const openModal = useCallback(
    (rule?: LifecycleRule) => {
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

  // 处理创建/更新
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
      loadStats();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || '操作失败');
    }
  }, [form, configForm, editingRule, loadRules, loadStats]);

  // 删除规则
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteLifecycleRule(id);
        message.success('规则删除成功');
        loadRules();
        loadStats();
      } catch (error) {
        message.error('删除失败');
      }
    },
    [loadRules, loadStats]
  );

  // 切换启用状态
  const handleToggle = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        await toggleLifecycleRule(id, enabled);
        message.success(`规则已${enabled ? '启用' : '禁用'}`);
        loadRules();
      } catch (error) {
        message.error('操作失败');
      }
    },
    [loadRules]
  );

  // 手动执行规则
  const handleExecute = useCallback(
    async (id: string, ruleName: string) => {
      try {
        const execution = await executeLifecycleRule(id);
        message.success(`规则 "${ruleName}" 已开始执行`);
        if (activeTab === 'history') {
          loadHistory();
        }
      } catch (error) {
        message.error('执行失败');
      }
    },
    [activeTab, loadHistory]
  );

  // 测试规则
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
    } catch (error) {
      message.error('测试失败');
    }
  }, []);

  // 从模板创建
  const handleCreateFromTemplate = useCallback(
    async (templateId: string) => {
      try {
        const rule = await createRuleFromTemplate(templateId);
        message.success('规则创建成功');
        openModal(rule);
      } catch (error) {
        message.error('创建失败');
      }
    },
    [openModal]
  );

  // 查看历史详情
  const viewHistoryDetail = useCallback((history: LifecycleExecutionHistory) => {
    setSelectedHistory(history);
    setHistoryDetailVisible(true);
  }, []);

  // 分页处理
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
    stats,
    templates,
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
