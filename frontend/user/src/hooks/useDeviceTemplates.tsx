import { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, message } from 'antd';
import {
  type DeviceTemplate,
  type TemplateTableHandlers,
  calculateStats,
  mockTemplates,
  generateDefaultPrefix,
} from '@/utils/templateConfig';

/**
 * 设备模板管理 Hook
 *
 * 优化点:
 * 1. ✅ 提取所有业务逻辑到自定义 hook
 * 2. ✅ 使用 useCallback 优化所有处理函数
 * 3. ✅ 使用 useMemo 优化派生状态计算
 * 4. ✅ 统一错误处理和消息提示
 * 5. ✅ 集中管理所有状态
 */
export function useDeviceTemplates() {
  // ===== Form 实例 =====
  const [form] = Form.useForm();
  const [useTemplateForm] = Form.useForm();

  // ===== 状态管理 =====
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [useTemplateModalVisible, setUseTemplateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DeviceTemplate | null>(null);

  // ===== 计算属性 =====
  /**
   * 统计数据（使用 useMemo 优化）
   */
  const stats = useMemo(() => calculateStats(templates), [templates]);

  /**
   * 是否在编辑模式
   */
  const isEditing = useMemo(() => selectedTemplate !== null, [selectedTemplate]);

  // ===== 数据加载 =====
  /**
   * 加载模板列表
   */
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: 实际应该调用 API - 目前使用模拟数据
      await new Promise((resolve) => setTimeout(resolve, 300));
      setTemplates(mockTemplates);
    } catch (error: any) {
      message.error(error.message || '加载模板列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== 查看详情 =====
  /**
   * 查看模板详情
   */
  const handleViewDetail = useCallback((template: DeviceTemplate) => {
    setSelectedTemplate(template);
    setDetailModalVisible(true);
  }, []);

  // ===== 切换收藏 =====
  /**
   * 切换收藏状态
   */
  const handleToggleFavorite = useCallback((id: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t))
    );
    message.success('操作成功');
  }, []);

  // ===== 创建模板 =====
  /**
   * 显示创建模板弹窗
   */
  const handleCreate = useCallback(() => {
    form.resetFields();
    setSelectedTemplate(null);
    setCreateModalVisible(true);
  }, [form]);

  // ===== 编辑模板 =====
  /**
   * 显示编辑模板弹窗
   */
  const handleEdit = useCallback(
    (template: DeviceTemplate) => {
      setSelectedTemplate(template);
      form.setFieldsValue(template);
      setCreateModalVisible(true);
    },
    [form]
  );

  // ===== 提交创建/编辑 =====
  /**
   * 提交创建/编辑模板
   */
  const handleSubmitCreate = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (selectedTemplate) {
        // 编辑模式
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === selectedTemplate.id ? { ...t, ...values } : t
          )
        );
        message.success('模板更新成功');
      } else {
        // 创建模式
        const newTemplate: DeviceTemplate = {
          id: `custom-${Date.now()}`,
          ...values,
          isSystem: false,
          isFavorite: false,
          usageCount: 0,
          createdAt: new Date().toISOString(),
          createdBy: 'user@example.com',
        };
        setTemplates((prev) => [...prev, newTemplate]);
        message.success('模板创建成功');
      }

      setCreateModalVisible(false);
      setLoading(false);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  }, [form, selectedTemplate]);

  // ===== 删除模板 =====
  /**
   * 删除模板
   */
  const handleDelete = useCallback(async (id: string) => {
    setLoading(true);
    try {
      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 500));

      setTemplates((prev) => prev.filter((t) => t.id !== id));
      message.success('模板删除成功');
    } catch (error: any) {
      message.error(error.message || '删除失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== 使用模板 =====
  /**
   * 显示使用模板弹窗
   */
  const handleUseTemplate = useCallback(
    (template: DeviceTemplate) => {
      setSelectedTemplate(template);
      useTemplateForm.resetFields();
      useTemplateForm.setFieldsValue({
        count: 1,
        namePrefix: generateDefaultPrefix(),
      });
      setUseTemplateModalVisible(true);
    },
    [useTemplateForm]
  );

  // ===== 提交批量创建 =====
  /**
   * 提交批量创建设备
   */
  const handleSubmitUseTemplate = useCallback(async () => {
    try {
      const values = await useTemplateForm.validateFields();
      setLoading(true);

      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 更新使用次数
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === selectedTemplate?.id
            ? { ...t, usageCount: t.usageCount + values.count }
            : t
        )
      );

      message.success(`成功创建 ${values.count} 台设备`);
      setUseTemplateModalVisible(false);
      setLoading(false);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  }, [useTemplateForm, selectedTemplate]);

  // ===== Modal 控制 =====
  /**
   * 隐藏创建模板弹窗
   */
  const hideCreateModal = useCallback(() => {
    setCreateModalVisible(false);
    setSelectedTemplate(null);
  }, []);

  /**
   * 隐藏使用模板弹窗
   */
  const hideUseTemplateModal = useCallback(() => {
    setUseTemplateModalVisible(false);
  }, []);

  /**
   * 隐藏详情弹窗
   */
  const hideDetailModal = useCallback(() => {
    setDetailModalVisible(false);
  }, []);

  // ===== 表格操作处理器 =====
  /**
   * 表格操作处理器（用于 TemplateTable 组件）
   */
  const tableHandlers: TemplateTableHandlers = useMemo(
    () => ({
      onViewDetail: handleViewDetail,
      onToggleFavorite: handleToggleFavorite,
      onUseTemplate: handleUseTemplate,
      onEdit: handleEdit,
      onDelete: handleDelete,
    }),
    [handleViewDetail, handleToggleFavorite, handleUseTemplate, handleEdit, handleDelete]
  );

  // ===== 副作用 =====
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // ===== 返回所有状态和方法 =====
  return {
    // 状态
    loading,
    templates,
    stats,
    isEditing,
    selectedTemplate,
    createModalVisible,
    useTemplateModalVisible,
    detailModalVisible,

    // Form 实例
    form,
    useTemplateForm,

    // 操作
    handleCreate,
    handleSubmitCreate,
    handleSubmitUseTemplate,

    // Modal 控制
    hideCreateModal,
    hideUseTemplateModal,
    hideDetailModal,

    // 表格操作处理器
    tableHandlers,

    // 刷新数据
    refetch: loadTemplates,
  };
}
