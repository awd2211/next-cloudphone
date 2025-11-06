import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useSafeApi } from './useSafeApi';
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

  // ===== 数据加载 (使用 useSafeApi) =====

  /**
   * 加载模板列表 (分页)
   */
  const {
    data: templatesResponse,
    loading,
    execute: executeLoadTemplates,
  } = useSafeApi(
    () => {
      const params: any = { page, pageSize };
      if (searchKeyword) params.search = searchKeyword;
      if (categoryFilter) params.category = categoryFilter;
      if (isPublicFilter !== undefined) params.isPublic = isPublicFilter;
      return getTemplates(params);
    },
    PaginatedTemplatesResponseSchema,
    {
      errorMessage: '加载模板列表失败',
      fallbackValue: { data: [], total: 0 },
    }
  );

  const templates = templatesResponse?.data || [];
  const total = templatesResponse?.total || 0;

  /**
   * 加载热门模板
   */
  const { data: popularTemplates } = useSafeApi(
    getPopularTemplates,
    z.array(DeviceTemplateSchema),
    {
      errorMessage: '加载热门模板失败',
      fallbackValue: [],
      showError: false, // 不显示错误消息，只在控制台记录
    }
  );

  /**
   * 加载统计数据
   */
  const { data: stats } = useSafeApi(
    getTemplateStats,
    TemplateStatsSchema,
    {
      errorMessage: '加载统计数据失败',
      showError: false,
    }
  );

  /**
   * 加载用户列表
   */
  const { data: usersResponse } = useSafeApi(
    () => getUsers({ page: 1, pageSize: 1000 }),
    PaginatedUsersResponseSchema,
    {
      errorMessage: '加载用户列表失败',
      fallbackValue: { data: [], total: 0 },
      showError: false,
    }
  );

  const users = usersResponse?.data || [];

  // ===== 自动加载数据 =====

  /**
   * 重新加载模板列表
   */
  const loadTemplates = useCallback(() => {
    executeLoadTemplates();
  }, [executeLoadTemplates]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

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
        // 统计数据会自动重新加载，因为 useSafeApi 会在依赖变化时重新请求
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
