import { useState, useEffect, useMemo } from 'react';
import { Form, message, Card } from 'antd';
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
import {
  TemplateStatsCard,
  PopularTemplatesCard,
  TemplateFilterBar,
  TemplateTable,
  CreateTemplateModal,
  EditTemplateModal,
  CreateDeviceModal,
  BatchCreateDeviceModal,
  createTemplateColumns,
} from '@/components/Template';

const TemplateList = () => {
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [popularTemplates, setPopularTemplates] = useState<DeviceTemplate[]>([]);
  const [stats, setStats] = useState<any>();
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [createDeviceModalVisible, setCreateDeviceModalVisible] = useState(false);
  const [batchCreateModalVisible, setBatchCreateModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DeviceTemplate | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [isPublicFilter, setIsPublicFilter] = useState<boolean | undefined>();
  const [users, setUsers] = useState<User[]>([]);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [createDeviceForm] = Form.useForm();
  const [batchCreateForm] = Form.useForm();

  // 加载模板列表
  const loadTemplates = async () => {
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
  };

  // 加载热门模板
  const loadPopularTemplates = async () => {
    try {
      const data = await getPopularTemplates();
      setPopularTemplates(data);
    } catch (error) {
      console.error('加载热门模板失败', error);
    }
  };

  // 加载统计数据
  const loadStats = async () => {
    try {
      const data = await getTemplateStats();
      setStats(data);
    } catch (error) {
      console.error('加载统计数据失败', error);
    }
  };

  // 加载用户列表
  const loadUsers = async () => {
    try {
      const res = await getUsers({ page: 1, pageSize: 1000 });
      setUsers(res.data);
    } catch (error) {
      console.error('加载用户列表失败', error);
    }
  };

  useEffect(() => {
    loadTemplates();
    loadPopularTemplates();
    loadStats();
    loadUsers();
  }, [page, pageSize, searchKeyword, categoryFilter, isPublicFilter]);

  // 创建模板
  const handleCreate = async (values: CreateTemplateDto) => {
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
  };

  // 更新模板
  const handleEdit = async (values: any) => {
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
  };

  // 删除模板
  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id);
      message.success('模板删除成功');
      loadTemplates();
      loadStats();
    } catch (error: any) {
      message.error(error.message || '删除模板失败');
    }
  };

  // 从模板创建设备
  const handleCreateDevice = async (values: any) => {
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
  };

  // 批量创建设备
  const handleBatchCreate = async (values: any) => {
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
  };

  // 打开编辑模态框
  const openEditModal = (template: DeviceTemplate) => {
    setSelectedTemplate(template);
    editForm.setFieldsValue({
      name: template.name,
      description: template.description,
      category: template.category,
      isPublic: template.isPublic,
      tags: template.tags,
    });
    setEditModalVisible(true);
  };

  // 打开创建设备模态框
  const openCreateDeviceModal = (template: DeviceTemplate) => {
    setSelectedTemplate(template);
    setCreateDeviceModalVisible(true);
  };

  // 打开批量创建模态框
  const openBatchCreateModal = (template: DeviceTemplate) => {
    setSelectedTemplate(template);
    setBatchCreateModalVisible(true);
  };

  // 使用 useMemo 优化表格列定义
  const columns = useMemo(
    () =>
      createTemplateColumns({
        onCreateDevice: openCreateDeviceModal,
        onBatchCreate: openBatchCreateModal,
        onEdit: openEditModal,
        onDelete: handleDelete,
      }),
    []
  );

  return (
    <div style={{ padding: '24px' }}>
      <TemplateStatsCard stats={stats} />

      <PopularTemplatesCard templates={popularTemplates} onTemplateClick={openCreateDeviceModal} />

      <Card>
        <TemplateFilterBar
          onCreateClick={() => setCreateModalVisible(true)}
          onSearch={setSearchKeyword}
          onCategoryChange={setCategoryFilter}
          onVisibilityChange={setIsPublicFilter}
        />

        <TemplateTable
          columns={columns}
          dataSource={templates}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
          }}
        />
      </Card>

      <CreateTemplateModal
        visible={createModalVisible}
        form={form}
        onOk={() => form.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
      />

      <EditTemplateModal
        visible={editModalVisible}
        form={editForm}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setSelectedTemplate(null);
        }}
      />

      <CreateDeviceModal
        visible={createDeviceModalVisible}
        templateName={selectedTemplate?.name || ''}
        form={createDeviceForm}
        users={users}
        onOk={() => createDeviceForm.submit()}
        onCancel={() => {
          setCreateDeviceModalVisible(false);
          createDeviceForm.resetFields();
          setSelectedTemplate(null);
        }}
      />

      <BatchCreateDeviceModal
        visible={batchCreateModalVisible}
        templateName={selectedTemplate?.name || ''}
        form={batchCreateForm}
        users={users}
        onOk={() => batchCreateForm.submit()}
        onCancel={() => {
          setBatchCreateModalVisible(false);
          batchCreateForm.resetFields();
          setSelectedTemplate(null);
        }}
      />
    </div>
  );
};

export default TemplateList;
