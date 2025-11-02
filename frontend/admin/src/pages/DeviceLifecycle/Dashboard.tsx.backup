import { useState, useEffect } from 'react';
import { Card, Space, message, Modal, Form, Tabs } from 'antd';
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
import {
  StatisticsRow,
  QuickTemplatesCard,
  RuleFilterBar,
  RuleFormModal,
  HistoryDetailModal,
  RuleTableCard,
  HistoryTableCard,
} from '@/components/DeviceLifecycle';

const { TabPane } = Tabs;

/**
 * 设备生命周期管理仪表板
 * 用于管理生命周期规则及查看执行历史
 */
const LifecycleDashboard = () => {
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

  const [form] = Form.useForm();
  const [configForm] = Form.useForm();

  // 加载规则列表
  const loadRules = async () => {
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
  };

  // 加载执行历史
  const loadHistory = async () => {
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
  };

  // 加载统计信息
  const loadStats = async () => {
    try {
      const statsData = await getLifecycleStats();
      setStats(statsData);
    } catch (error) {
      message.error('加载统计失败');
    }
  };

  // 加载模板
  const loadTemplates = async () => {
    try {
      const templatesData = await getLifecycleRuleTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error('加载模板失败', error);
    }
  };

  useEffect(() => {
    loadRules();
    loadStats();
    loadTemplates();
  }, [page, pageSize, filterType, filterEnabled]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, historyPage, historyPageSize]);

  // 打开创建/编辑模态框
  const openModal = (rule?: LifecycleRule) => {
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
  };

  // 处理创建/更新
  const handleSubmit = async () => {
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
  };

  // 删除规则
  const handleDelete = async (id: string) => {
    try {
      await deleteLifecycleRule(id);
      message.success('规则删除成功');
      loadRules();
      loadStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 切换启用状态
  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await toggleLifecycleRule(id, enabled);
      message.success(`规则已${enabled ? '启用' : '禁用'}`);
      loadRules();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 手动执行规则
  const handleExecute = async (id: string, ruleName: string) => {
    try {
      const execution = await executeLifecycleRule(id);
      message.success(`规则 "${ruleName}" 已开始执行`);
      if (activeTab === 'history') {
        loadHistory();
      }
    } catch (error) {
      message.error('执行失败');
    }
  };

  // 测试规则
  const handleTest = async (id: string, ruleName: string) => {
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
  };

  // 从模板创建
  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      const rule = await createRuleFromTemplate(templateId);
      message.success('规则创建成功');
      openModal(rule);
    } catch (error) {
      message.error('创建失败');
    }
  };

  // 查看历史详情
  const viewHistoryDetail = (history: LifecycleExecutionHistory) => {
    setSelectedHistory(history);
    setHistoryDetailVisible(true);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 统计卡片 */}
        <StatisticsRow stats={stats} />

        {/* 快速模板 */}
        <QuickTemplatesCard templates={templates} onCreateFromTemplate={handleCreateFromTemplate} />

        {/* 主内容 */}
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="规则管理" key="rules">
              <RuleFilterBar
                filterType={filterType}
                filterEnabled={filterEnabled}
                onFilterTypeChange={setFilterType}
                onFilterEnabledChange={setFilterEnabled}
                onCreateRule={() => openModal()}
              />

              <RuleTableCard
                rules={rules}
                loading={loading}
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={(newPage, newPageSize) => {
                  setPage(newPage);
                  setPageSize(newPageSize || 10);
                }}
                onToggle={handleToggle}
                onExecute={handleExecute}
                onTest={handleTest}
                onEdit={openModal}
                onDelete={handleDelete}
              />
            </TabPane>

            <TabPane tab="执行历史" key="history">
              <HistoryTableCard
                history={history}
                loading={historyLoading}
                page={historyPage}
                pageSize={historyPageSize}
                total={historyTotal}
                onPageChange={(newPage, newPageSize) => {
                  setHistoryPage(newPage);
                  setHistoryPageSize(newPageSize || 10);
                }}
                onViewDetail={viewHistoryDetail}
              />
            </TabPane>
          </Tabs>
        </Card>
      </Space>

      {/* 创建/编辑模态框 */}
      <RuleFormModal
        visible={modalVisible}
        editingRule={editingRule}
        form={form}
        configForm={configForm}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
      />

      {/* 历史详情模态框 */}
      <HistoryDetailModal
        visible={historyDetailVisible}
        selectedHistory={selectedHistory}
        onClose={() => setHistoryDetailVisible(false)}
      />
    </div>
  );
};

export default LifecycleDashboard;
