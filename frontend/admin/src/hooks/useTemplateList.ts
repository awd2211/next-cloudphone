import { useState, useCallback } from 'react';
import { Form, message } from 'antd';
import { z } from 'zod';
import {
  getTemplates,
  getPopularTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createDeviceFromTemplate,
  batchCreateDevicesFromTemplate,
  getTemplateStats,
} from '@/services/template';
import { getUsers } from '@/services/user';
import type { CreateTemplateDto } from '@/types';
import { useValidatedQuery } from '@/hooks/utils';
import {
  DeviceTemplateSchema,
  PaginatedTemplatesResponseSchema,
  TemplateStatsSchema,
  PaginatedUsersResponseSchema,
} from '@/schemas/api.schemas';

/**
 * 模板列表页面业务逻辑 Hook
 *
 * 功能:
 * 1. 数据加载 (模板、热门模板、统计、用户) - 使用 useSafeApi + Zod 验证
 * 2. CRUD 操作 (创建、编辑、删除模板)
 * 3. 设备创建 (单个/批量)
 * 4. Modal 状态管理
 */
export const useTemplateList = () => {
  // ===== 分页和筛选 =====
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [isPublicFilter, setIsPublicFilter] = useState<boolean | undefined>();

  // ===== Modal 状态 =====
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [createDeviceModalVisible, setCreateDeviceModalVisible] = useState(false);
  const [batchCreateModalVisible, setBatchCreateModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<z.infer<typeof DeviceTemplateSchema> | null>(null);

  // ===== Form 实例 =====
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [createDeviceForm] = Form.useForm();
  const [batchCreateForm] = Form.useForm();

  // ===== 数据加载 (使用 useValidatedQuery) =====

  /**
   * 加载模板列表 (分页)
   */
  const {
    data: templatesResponse,
    isLoading: loading,
    refetch: loadTemplates,
  } = useValidatedQuery({
    queryKey: ['templates', page, pageSize, searchKeyword, categoryFilter, isPublicFilter],
    queryFn: () => {
      const params: any = { page, pageSize };
      if (searchKeyword) params.search = searchKeyword;
      if (categoryFilter) params.category = categoryFilter;
      if (isPublicFilter !== undefined) params.isPublic = isPublicFilter;
      return getTemplates(params);
    },
    schema: PaginatedTemplatesResponseSchema,
    apiErrorMessage: '加载模板列表失败',
    fallbackValue: { data: [], total: 0 },
    staleTime: 30 * 1000,
  });

  const templates = templatesResponse?.data || [];
  const total = templatesResponse?.total || 0;

  /**
   * 加载热门模板
   */
  const { data: popularTemplates } = useValidatedQuery({
    queryKey: ['popular-templates'],
    queryFn: getPopularTemplates,
    schema: z.array(DeviceTemplateSchema),
    apiErrorMessage: '加载热门模板失败',
    fallbackValue: [],
    staleTime: 5 * 60 * 1000, // 热门模板变化较慢，5分钟缓存
  });

  /**
   * 加载统计数据
   */
  const { data: stats } = useValidatedQuery({
    queryKey: ['template-stats'],
    queryFn: getTemplateStats,
    schema: TemplateStatsSchema,
    apiErrorMessage: '加载统计数据失败',
    staleTime: 60 * 1000, // 统计数据1分钟缓存
  });

  /**
   * 加载用户列表
   */
  const { data: usersResponse } = useValidatedQuery({
    queryKey: ['users-for-template'],
    queryFn: () => getUsers({ page: 1, pageSize: 1000 }),
    schema: PaginatedUsersResponseSchema,
    apiErrorMessage: '加载用户列表失败',
    fallbackValue: { data: [], total: 0 },
    staleTime: 2 * 60 * 1000, // 用户列表2分钟缓存
  });

  const users = usersResponse?.data || [];

  // ===== CRUD 操作 =====

  /**
   * 创建模板
   */
  const handleCreate = useCallback(
    async (values: CreateTemplateDto) => {
      try {
        await createTemplate(values);
        message.success('模板创建成功');
        setCreateModalVisible(false);
        form.resetFields();
        loadTemplates();
      } catch (error: any) {
        message.error(error.message || '创建模板失败');
      }
    },
    [form, loadTemplates]
  );

  /**
   * 编辑模板
   */
  const handleEdit = useCallback(
    async (values: any) => {
      if (!selectedTemplate) return;
      try {
        await updateTemplate(selectedTemplate.id, values);
        message.success('模板更新成功');
        setEditModalVisible(false);
        editForm.resetFields();
        setSelectedTemplate(null);
        loadTemplates();
      } catch (error: any) {
        message.error(error.message || '更新模板失败');
      }
    },
    [selectedTemplate, editForm, loadTemplates]
  );

  /**
   * 删除模板
   */
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteTemplate(id);
        message.success('模板删除成功');
        loadTemplates();
      } catch (error: any) {
        message.error(error.message || '删除模板失败');
      }
    },
    [loadTemplates]
  );

  // ===== 设备创建 =====

  /**
   * 从模板创建单个设备
   */
  const handleCreateDevice = useCallback(
    async (values: any) => {
      if (!selectedTemplate) return;
      try {
        await createDeviceFromTemplate(selectedTemplate.id, values);
        message.success('设备创建成功');
        setCreateDeviceModalVisible(false);
        createDeviceForm.resetFields();
        setSelectedTemplate(null);
      } catch (error: any) {
        message.error(error.message || '创建设备失败');
      }
    },
    [selectedTemplate, createDeviceForm]
  );

  /**
   * 批量创建设备
   */
  const handleBatchCreate = useCallback(
    async (values: any) => {
      if (!selectedTemplate) return;
      try {
        const devices = await batchCreateDevicesFromTemplate(selectedTemplate.id, values);
        message.success(`成功创建 ${devices.length} 个设备`);
        setBatchCreateModalVisible(false);
        batchCreateForm.resetFields();
        setSelectedTemplate(null);
      } catch (error: any) {
        message.error(error.message || '批量创建设备失败');
      }
    },
    [selectedTemplate, batchCreateForm]
  );

  // ===== Modal 操作 =====

  /**
   * 打开编辑模态框
   */
  const openEditModal = useCallback(
    (template: z.infer<typeof DeviceTemplateSchema>) => {
      setSelectedTemplate(template);
      editForm.setFieldsValue({
        name: template.name,
        description: template.description,
        category: template.category,
        isPublic: template.isPublic,
        tags: template.tags,
      });
      setEditModalVisible(true);
    },
    [editForm]
  );

  /**
   * 打开创建设备模态框
   */
  const openCreateDeviceModal = useCallback((template: z.infer<typeof DeviceTemplateSchema>) => {
    setSelectedTemplate(template);
    setCreateDeviceModalVisible(true);
  }, []);

  /**
   * 打开批量创建模态框
   */
  const openBatchCreateModal = useCallback((template: z.infer<typeof DeviceTemplateSchema>) => {
    setSelectedTemplate(template);
    setBatchCreateModalVisible(true);
  }, []);

  /**
   * 关闭创建模态框
   */
  const closeCreateModal = useCallback(() => {
    setCreateModalVisible(false);
    form.resetFields();
  }, [form]);

  /**
   * 关闭编辑模态框
   */
  const closeEditModal = useCallback(() => {
    setEditModalVisible(false);
    editForm.resetFields();
    setSelectedTemplate(null);
  }, [editForm]);

  /**
   * 关闭创建设备模态框
   */
  const closeCreateDeviceModal = useCallback(() => {
    setCreateDeviceModalVisible(false);
    createDeviceForm.resetFields();
    setSelectedTemplate(null);
  }, [createDeviceForm]);

  /**
   * 关闭批量创建模态框
   */
  const closeBatchCreateModal = useCallback(() => {
    setBatchCreateModalVisible(false);
    batchCreateForm.resetFields();
    setSelectedTemplate(null);
  }, [batchCreateForm]);

  return {
    // 数据
    templates,
    popularTemplates: popularTemplates || [],
    stats,
    users,
    loading,
    total,
    refetch: loadTemplates,

    // 分页筛选
    page,
    pageSize,
    setPage,
    setPageSize,
    setSearchKeyword,
    setCategoryFilter,
    setIsPublicFilter,

    // Modal 状态
    createModalVisible,
    setCreateModalVisible,
    editModalVisible,
    createDeviceModalVisible,
    batchCreateModalVisible,
    selectedTemplate,

    // Form
    form,
    editForm,
    createDeviceForm,
    batchCreateForm,

    // 操作
    handleCreate,
    handleEdit,
    handleDelete,
    handleCreateDevice,
    handleBatchCreate,
    openEditModal,
    openCreateDeviceModal,
    openBatchCreateModal,
    closeCreateModal,
    closeEditModal,
    closeCreateDeviceModal,
    closeBatchCreateModal,
  };
};
