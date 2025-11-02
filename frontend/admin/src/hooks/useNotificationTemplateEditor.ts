import { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, message } from 'antd';
import {
  getNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  toggleNotificationTemplate,
  testNotificationTemplate,
  getTemplateVersions,
  revertTemplateVersion,
  getAvailableVariables,
  previewTemplate,
} from '@/services/notificationTemplate';
import {
  createTemplateColumns,
} from '@/components/NotificationTemplate';
import type {
  NotificationTemplate,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  NotificationTemplateVersion,
  PaginationParams,
} from '@/types';

export const useNotificationTemplateEditor = () => {
  // 状态管理
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [testVisible, setTestVisible] = useState(false);
  const [versionDrawerVisible, setVersionDrawerVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [versions, setVersions] = useState<NotificationTemplateVersion[]>([]);
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);
  const [previewContent, setPreviewContent] = useState('');
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  // Form 实例
  const [form] = Form.useForm();
  const [testForm] = Form.useForm();
  const [previewForm] = Form.useForm();

  // 加载模板列表
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params: PaginationParams & { type?: string; isActive?: boolean } = {
        page,
        pageSize,
      };
      if (filterType) params.type = filterType;
      if (filterActive !== undefined) params.isActive = filterActive;

      const res = await getNotificationTemplates(params);
      setTemplates(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载模板失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterType, filterActive]);

  // 加载可用变量
  const loadVariables = useCallback(async (type?: string) => {
    try {
      const vars = await getAvailableVariables(type);
      setAvailableVariables(vars);
    } catch (error) {
      console.error('加载变量失败', error);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    loadVariables();
  }, [loadVariables]);

  // 打开创建/编辑模态框
  const openModal = useCallback(
    (template?: NotificationTemplate) => {
      if (template) {
        setEditingTemplate(template);
        form.setFieldsValue({
          name: template.name,
          description: template.description,
          type: template.type,
          subject: template.subject,
          content: template.content,
          contentType: template.contentType,
          isActive: template.isActive,
          language: template.language,
          category: template.category,
        });
        loadVariables(template.type);
      } else {
        setEditingTemplate(null);
        form.resetFields();
        form.setFieldsValue({ contentType: 'plain', language: 'zh-CN', isActive: true });
      }
      setModalVisible(true);
    },
    [form, loadVariables]
  );

  // 处理创建/更新
  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      if (editingTemplate) {
        const data: UpdateNotificationTemplateDto = {
          name: values.name,
          description: values.description,
          subject: values.subject,
          content: values.content,
          contentType: values.contentType,
          isActive: values.isActive,
          category: values.category,
        };
        await updateNotificationTemplate(editingTemplate.id, data);
        message.success('模板更新成功');
      } else {
        const data: CreateNotificationTemplateDto = {
          name: values.name,
          description: values.description,
          type: values.type,
          subject: values.subject,
          content: values.content,
          contentType: values.contentType,
          isActive: values.isActive,
          language: values.language,
          category: values.category,
        };
        await createNotificationTemplate(data);
        message.success('模板创建成功');
      }

      setModalVisible(false);
      loadTemplates();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || '操作失败');
    }
  }, [form, editingTemplate, loadTemplates]);

  // 删除模板
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteNotificationTemplate(id);
        message.success('模板删除成功');
        loadTemplates();
      } catch (error) {
        message.error('删除失败');
      }
    },
    [loadTemplates]
  );

  // 切换激活状态
  const handleToggle = useCallback(
    async (id: string, isActive: boolean) => {
      try {
        await toggleNotificationTemplate(id, isActive);
        message.success(`模板已${isActive ? '激活' : '停用'}`);
        loadTemplates();
      } catch (error) {
        message.error('操作失败');
      }
    },
    [loadTemplates]
  );

  // 打开预览
  const openPreview = useCallback(
    (template: NotificationTemplate) => {
      setSelectedTemplate(template);
      setPreviewVisible(true);
      previewForm.resetFields();
    },
    [previewForm]
  );

  // 预览渲染
  const handlePreview = useCallback(async () => {
    try {
      const values = previewForm.getFieldsValue();
      const variables: Record<string, any> = {};

      selectedTemplate?.variables.forEach((varName) => {
        if (values[varName]) {
          variables[varName] = values[varName];
        }
      });

      const result = await previewTemplate(selectedTemplate!.id, variables);
      setPreviewContent(result.rendered || result.content);
      message.success('预览生成成功');
    } catch (error) {
      message.error('预览失败');
    }
  }, [previewForm, selectedTemplate]);

  // 打开测试发送
  const openTest = useCallback(
    (template: NotificationTemplate) => {
      setSelectedTemplate(template);
      setTestVisible(true);
      testForm.resetFields();
    },
    [testForm]
  );

  // 测试发送
  const handleTest = useCallback(async () => {
    try {
      const values = await testForm.validateFields();
      const variables: Record<string, any> = {};

      selectedTemplate?.variables.forEach((varName) => {
        if (values[varName]) {
          variables[varName] = values[varName];
        }
      });

      await testNotificationTemplate({
        templateId: selectedTemplate!.id,
        recipient: values.recipient,
        variables,
      });
      message.success('测试消息已发送');
      setTestVisible(false);
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('发送失败');
    }
  }, [testForm, selectedTemplate]);

  // 打开版本历史
  const openVersionHistory = useCallback(async (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setVersionDrawerVisible(true);
    try {
      const versionList = await getTemplateVersions(template.id);
      setVersions(versionList);
    } catch (error) {
      message.error('加载版本历史失败');
    }
  }, []);

  // 回滚版本
  const handleRevert = useCallback(
    async (versionId: string) => {
      try {
        await revertTemplateVersion(selectedTemplate!.id, versionId);
        message.success('版本回滚成功');
        setVersionDrawerVisible(false);
        loadTemplates();
      } catch (error) {
        message.error('回滚失败');
      }
    },
    [selectedTemplate, loadTemplates]
  );

  // 表格列定义
  const columns = useMemo(
    () =>
      createTemplateColumns({
        onPreview: openPreview,
        onTest: openTest,
        onHistory: openVersionHistory,
        onEdit: openModal,
        onDelete: handleDelete,
        onToggle: handleToggle,
      }),
    [openPreview, openTest, openVersionHistory, openModal, handleDelete, handleToggle]
  );

  // 分页处理
  const handlePageChange = useCallback((newPage: number, newPageSize?: number) => {
    setPage(newPage);
    setPageSize(newPageSize || 10);
  }, []);

  return {
    // 数据状态
    templates,
    loading,
    total,
    page,
    pageSize,
    // 模态框状态
    modalVisible,
    previewVisible,
    testVisible,
    versionDrawerVisible,
    // 选中状态
    editingTemplate,
    selectedTemplate,
    versions,
    availableVariables,
    previewContent,
    // 筛选状态
    filterType,
    filterActive,
    // Form 实例
    form,
    testForm,
    previewForm,
    // 表格列
    columns,
    // 处理函数
    openModal,
    handleSubmit,
    handleDelete,
    handleToggle,
    openPreview,
    handlePreview,
    openTest,
    handleTest,
    openVersionHistory,
    handleRevert,
    loadVariables,
    handlePageChange,
    // 状态设置
    setModalVisible,
    setPreviewVisible,
    setTestVisible,
    setVersionDrawerVisible,
    setFilterType,
    setFilterActive,
  };
};
