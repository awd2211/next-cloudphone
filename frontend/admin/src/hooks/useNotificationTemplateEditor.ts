import { useState, useCallback, useMemo } from 'react';
import { Form, message } from 'antd';
import { z } from 'zod';
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
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  PaginationParams,
} from '@/types';
import { useValidatedQuery } from '@/hooks/utils';
import {
  NotificationTemplateSchema,
  NotificationTemplateVersionSchema,
  PaginatedNotificationTemplatesResponseSchema,
} from '@/schemas/api.schemas';

/**
 * 通知模板编辑器业务逻辑 Hook
 *
 * 功能:
 * 1. 数据加载 (模板列表、版本历史、可用变量) - 使用 useSafeApi + Zod 验证
 * 2. 模板管理 (CRUD、激活/停用)
 * 3. 模板预览和测试发送
 * 4. 版本管理和回滚
 * 5. 分页和筛选
 * 6. Modal 状态管理
 */
export const useNotificationTemplateEditor = () => {
  // ===== 分页和筛选状态 =====
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  // ===== Modal 状态 =====
  const [modalVisible, setModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [testVisible, setTestVisible] = useState(false);
  const [versionDrawerVisible, setVersionDrawerVisible] = useState(false);

  // ===== 选中状态 =====
  const [editingTemplate, setEditingTemplate] = useState<z.infer<typeof NotificationTemplateSchema> | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<z.infer<typeof NotificationTemplateSchema> | null>(null);
  const [previewContent, setPreviewContent] = useState('');

  // ===== Form 实例 =====
  const [form] = Form.useForm();
  const [testForm] = Form.useForm();
  const [previewForm] = Form.useForm();

  // ===== 数据加载 (使用 useValidatedQuery) =====

  /**
   * 加载模板列表
   */
  const {
    data: templatesResponse,
    isLoading: loading,
    refetch: loadTemplates,
  } = useValidatedQuery({
    queryKey: ['notification-templates', page, pageSize, filterType, filterActive],
    queryFn: () => {
      const params: PaginationParams & { type?: string; isActive?: boolean } = {
        page,
        pageSize,
      };
      if (filterType) params.type = filterType;
      if (filterActive !== undefined) params.isActive = filterActive;
      return getNotificationTemplates(params);
    },
    schema: PaginatedNotificationTemplatesResponseSchema,
    apiErrorMessage: '加载模板失败',
    fallbackValue: { data: [], total: 0 },
    staleTime: 30 * 1000,
  });

  const templates = templatesResponse?.data || [];
  const total = templatesResponse?.total || 0;

  /**
   * 加载可用变量
   */
  const {
    data: availableVariables,
    refetch: loadVariables,
  } = useValidatedQuery({
    queryKey: ['notification-variables'],
    queryFn: () => getAvailableVariables(),
    schema: z.array(z.string()),
    apiErrorMessage: '加载变量失败',
    fallbackValue: [],
    staleTime: 60 * 1000, // 变量不常变化，缓存1分钟
  });

  /**
   * 加载版本历史
   */
  const {
    data: versions,
    refetch: executeLoadVersions,
  } = useValidatedQuery({
    queryKey: ['template-versions'],
    queryFn: ({ queryKey }) => {
      const [, templateId] = queryKey as [string, string];
      return getTemplateVersions(templateId);
    },
    schema: z.array(NotificationTemplateVersionSchema),
    apiErrorMessage: '加载版本历史失败',
    fallbackValue: [],
    enabled: false, // 手动触发
  });

  // ===== 模板操作 =====

  /**
   * 打开创建/编辑模态框
   */
  const openModal = useCallback(
    (template?: z.infer<typeof NotificationTemplateSchema>) => {
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
        loadVariables();
      } else {
        setEditingTemplate(null);
        form.resetFields();
        form.setFieldsValue({ contentType: 'plain', language: 'zh-CN', isActive: true });
      }
      setModalVisible(true);
    },
    [form, loadVariables]
  );

  /**
   * 处理创建/更新
   */
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

  /**
   * 删除模板
   */
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

  /**
   * 切换激活状态
   */
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

  /**
   * 打开预览
   */
  const openPreview = useCallback(
    (template: z.infer<typeof NotificationTemplateSchema>) => {
      setSelectedTemplate(template);
      setPreviewVisible(true);
      previewForm.resetFields();
    },
    [previewForm]
  );

  /**
   * 预览渲染
   */
  const handlePreview = useCallback(async () => {
    try {
      const values = previewForm.getFieldsValue();
      const variables: Record<string, any> = {};

      selectedTemplate?.variables.forEach((varName) => {
        if (values[varName]) {
          variables[varName] = values[varName];
        }
      });

      const result = await previewTemplate(selectedTemplate!.id, variables) as any;
      setPreviewContent(result.rendered || result.content);
      message.success('预览生成成功');
    } catch (error) {
      message.error('预览失败');
    }
  }, [previewForm, selectedTemplate]);

  /**
   * 打开测试发送
   */
  const openTest = useCallback(
    (template: z.infer<typeof NotificationTemplateSchema>) => {
      setSelectedTemplate(template);
      setTestVisible(true);
      testForm.resetFields();
    },
    [testForm]
  );

  /**
   * 测试发送
   */
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

  /**
   * 打开版本历史
   */
  const openVersionHistory = useCallback(async (template: z.infer<typeof NotificationTemplateSchema>) => {
    setSelectedTemplate(template);
    setVersionDrawerVisible(true);
    await executeLoadVersions();
  }, [executeLoadVersions]);

  /**
   * 回滚版本
   */
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

  /**
   * 表格列定义
   */
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

  /**
   * 分页处理
   */
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
    versions: versions || [],
    availableVariables: availableVariables || [],
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
