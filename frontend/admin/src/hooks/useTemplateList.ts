import { useState, useEffect, useCallback } from 'react';
import { Form, message } from 'antd';
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
import type { DeviceTemplate, CreateTemplateDto, User } from '@/types';

/**
 * 模板列表页面业务逻辑 Hook
 *
 * 功能:
 * 1. 数据加载 (模板、热门模板、统计、用户)
 * 2. CRUD 操作 (创建、编辑、删除模板)
 * 3. 设备创建 (单个/批量)
 * 4. Modal 状态管理
 */
export const useTemplateList = () => {
  // ===== 数据状态 =====
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [popularTemplates, setPopularTemplates] = useState<DeviceTemplate[]>([]);
  const [stats, setStats] = useState<any>();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

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
  const [selectedTemplate, setSelectedTemplate] = useState<DeviceTemplate | null>(null);

  // ===== Form 实例 =====
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [createDeviceForm] = Form.useForm();
  const [batchCreateForm] = Form.useForm();

  // ===== 数据加载 =====
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (searchKeyword) params.search = searchKeyword;
      if (categoryFilter) params.category = categoryFilter;
      if (isPublicFilter !== undefined) params.isPublic = isPublicFilter;

      const res = await getTemplates(params);
      setTemplates(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载模板列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchKeyword, categoryFilter, isPublicFilter]);

  const loadPopularTemplates = useCallback(async () => {
    try {
      const data = await getPopularTemplates();
      setPopularTemplates(data);
    } catch (error) {
      console.error('加载热门模板失败', error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await getTemplateStats();
      setStats(data);
    } catch (error) {
      console.error('加载统计数据失败', error);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await getUsers({ page: 1, pageSize: 1000 });
      setUsers(res.data);
    } catch (error) {
      console.error('加载用户列表失败', error);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    loadPopularTemplates();
    loadStats();
    loadUsers();
  }, []);

  // ===== CRUD 操作 =====
  const handleCreate = useCallback(
    async (values: CreateTemplateDto) => {
      try {
        await createTemplate(values);
        message.success('模板创建成功');
        setCreateModalVisible(false);
        form.resetFields();
        loadTemplates();
        loadStats();
      } catch (error: any) {
        message.error(error.message || '创建模板失败');
      }
    },
    [form, loadTemplates, loadStats]
  );

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

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteTemplate(id);
        message.success('模板删除成功');
        loadTemplates();
        loadStats();
      } catch (error: any) {
        message.error(error.message || '删除模板失败');
      }
    },
    [loadTemplates, loadStats]
  );

  // ===== 设备创建 =====
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
  const openEditModal = useCallback(
    (template: DeviceTemplate) => {
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

  const openCreateDeviceModal = useCallback((template: DeviceTemplate) => {
    setSelectedTemplate(template);
    setCreateDeviceModalVisible(true);
  }, []);

  const openBatchCreateModal = useCallback((template: DeviceTemplate) => {
    setSelectedTemplate(template);
    setBatchCreateModalVisible(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setCreateModalVisible(false);
    form.resetFields();
  }, [form]);

  const closeEditModal = useCallback(() => {
    setEditModalVisible(false);
    editForm.resetFields();
    setSelectedTemplate(null);
  }, [editForm]);

  const closeCreateDeviceModal = useCallback(() => {
    setCreateDeviceModalVisible(false);
    createDeviceForm.resetFields();
    setSelectedTemplate(null);
  }, [createDeviceForm]);

  const closeBatchCreateModal = useCallback(() => {
    setBatchCreateModalVisible(false);
    batchCreateForm.resetFields();
    setSelectedTemplate(null);
  }, [batchCreateForm]);

  return {
    // 数据
    templates,
    popularTemplates,
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
