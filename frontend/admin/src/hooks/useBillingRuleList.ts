import { useState, useMemo, useCallback } from 'react';
import { Form } from 'antd';
import type { BillingRule, CreateBillingRuleDto, UpdateBillingRuleDto, BillingRuleTestResult } from '@/types';
import {
  useBillingRules,
  useBillingRuleTemplates,
  useCreateBillingRule,
  useUpdateBillingRule,
  useDeleteBillingRule,
  useToggleBillingRule,
  useTestBillingRule,
} from './useBillingRules';
import { useBillingRuleTableColumns } from '@/components/BillingRule/BillingRuleTableColumns';
import dayjs from 'dayjs';

/**
 * 计费规则列表业务逻辑管理
 *
 * 整合规则列表、创建/编辑、测试、详情等功能
 */
export const useBillingRuleList = () => {
  // 分页和筛选
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  // 模态框状态
  const [modalVisible, setModalVisible] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // 选中的规则
  const [editingRule, setEditingRule] = useState<BillingRule | null>(null);
  const [selectedRule, setSelectedRule] = useState<BillingRule | null>(null);
  const [testResult, setTestResult] = useState<BillingRuleTestResult | null>(null);

  // 表单实例
  const [form] = Form.useForm();
  const [testForm] = Form.useForm();

  // React Query hooks
  const params = useMemo(
    () => ({
      page,
      pageSize,
      ...(filterActive !== undefined && { isActive: filterActive }),
    }),
    [page, pageSize, filterActive]
  );

  const { data, isLoading } = useBillingRules(params);
  const { data: templates } = useBillingRuleTemplates();
  const createMutation = useCreateBillingRule();
  const updateMutation = useUpdateBillingRule();
  const deleteMutation = useDeleteBillingRule();
  const toggleMutation = useToggleBillingRule();
  const testMutation = useTestBillingRule();

  const rules = data?.data || [];
  const total = data?.total || 0;

  /**
   * 打开创建/编辑模态框
   */
  const openModal = useCallback(
    (rule?: BillingRule) => {
      if (rule) {
        setEditingRule(rule);
        form.setFieldsValue({
          name: rule.name,
          description: rule.description,
          type: rule.type,
          formula: rule.formula,
          parameters: JSON.stringify(rule.parameters, null, 2),
          priority: rule.priority,
          validRange:
            rule.validFrom && rule.validUntil
              ? [dayjs(rule.validFrom), dayjs(rule.validUntil)]
              : undefined,
        });
      } else {
        setEditingRule(null);
        form.resetFields();
      }
      setModalVisible(true);
    },
    [form]
  );

  /**
   * 提交创建/编辑
   */
  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const parameters = values.parameters ? JSON.parse(values.parameters) : {};

      const data: CreateBillingRuleDto | UpdateBillingRuleDto = {
        name: values.name,
        description: values.description,
        type: values.type,
        formula: values.formula,
        parameters,
        priority: values.priority,
        validFrom: values.validRange?.[0]?.toISOString(),
        validUntil: values.validRange?.[1]?.toISOString(),
      };

      if (editingRule) {
        await updateMutation.mutateAsync({ id: editingRule.id, data });
      } else {
        await createMutation.mutateAsync(data as CreateBillingRuleDto);
      }

      setModalVisible(false);
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
    }
  }, [form, editingRule, createMutation, updateMutation]);

  /**
   * 删除规则
   */
  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  /**
   * 切换激活状态
   */
  const handleToggleActive = useCallback(
    async (id: string, isActive: boolean) => {
      await toggleMutation.mutateAsync({ id, isActive });
    },
    [toggleMutation]
  );

  /**
   * 打开测试模态框
   */
  const openTestModal = useCallback(
    (rule: BillingRule) => {
      setSelectedRule(rule);
      setTestResult(null);
      testForm.resetFields();
      setTestModalVisible(true);
    },
    [testForm]
  );

  /**
   * 执行测试
   */
  const handleTest = useCallback(async () => {
    try {
      const values = await testForm.validateFields();
      const result = await testMutation.mutateAsync({
        id: selectedRule!.id,
        data: values,
      });
      setTestResult(result as BillingRuleTestResult);
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
    }
  }, [testForm, selectedRule, testMutation]);

  /**
   * 打开详情模态框
   */
  const openDetailModal = useCallback((rule: BillingRule) => {
    setSelectedRule(rule);
    setDetailModalVisible(true);
  }, []);

  /**
   * 应用模板
   */
  const applyTemplate = useCallback(
    (template: any) => {
      form.setFieldsValue({
        name: template.name,
        description: template.description,
        type: template.type,
        formula: template.formula,
        parameters: JSON.stringify(template.parameters, null, 2),
        priority: template.priority || 0,
      });
    },
    [form]
  );

  // 表格列配置
  const columns = useBillingRuleTableColumns({
    onDetailClick: openDetailModal,
    onTest: openTestModal,
    onEdit: openModal,
    onDelete: handleDelete,
    onToggleActive: handleToggleActive,
  });

  return {
    // 数据状态
    rules,
    total,
    isLoading,
    page,
    pageSize,
    filterActive,
    templates,

    // 创建/编辑模态框
    modalVisible,
    editingRule,
    form,
    setModalVisible,
    handleSubmit,
    applyTemplate,

    // 测试模态框
    testModalVisible,
    testForm,
    testResult,
    setTestModalVisible,
    handleTest,

    // 详情模态框
    detailModalVisible,
    selectedRule,
    setDetailModalVisible,

    // 表格列
    columns,

    // 状态更新函数
    setPage,
    setPageSize,
    setFilterActive,
    openModal,
  };
};
