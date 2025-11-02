import { useState, useEffect, useCallback } from 'react';
import { Form, message } from 'antd';
import { useDataScope, type DataScope, type CreateDataScopeDto } from './useDataScope';
import { getRoles } from '@/services/role';
import type { Role } from '@/types';
import { useDataScopeTableColumns } from '@/components/PermissionDataScope/DataScopeTableColumns';

export const useDataScopeConfig = () => {
  const {
    dataScopes,
    scopeTypes,
    loading: hookLoading,
    fetchDataScopes,
    createDataScope,
    updateDataScope,
    deleteDataScope,
    toggleDataScope,
    getScopeDescription,
  } = useDataScope();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingScope, setEditingScope] = useState<DataScope | null>(null);
  const [viewingScope, setViewingScope] = useState<DataScope | null>(null);
  const [form] = Form.useForm();

  // 筛选参数
  const [filterRoleId, setFilterRoleId] = useState<string | undefined>();
  const [filterResourceType, setFilterResourceType] = useState<string | undefined>();

  /**
   * 加载数据范围配置
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await fetchDataScopes({
        roleId: filterRoleId,
        resourceType: filterResourceType,
        isActive: true,
      });
    } catch (error) {
      message.error('加载数据范围配置失败');
    } finally {
      setLoading(false);
    }
  }, [fetchDataScopes, filterRoleId, filterResourceType]);

  /**
   * 加载角色列表
   */
  const loadRoles = useCallback(async () => {
    try {
      const res = await getRoles({ page: 1, pageSize: 100 });
      setRoles(res.data);
    } catch (error) {
      message.error('加载角色列表失败');
    }
  }, []);

  useEffect(() => {
    loadData();
    loadRoles();
  }, [loadData, loadRoles]);

  /**
   * 提交表单（创建或编辑）
   */
  const handleSubmit = useCallback(
    async (values: any) => {
      try {
        if (editingScope) {
          await updateDataScope(editingScope.id, values);
          message.success('更新数据范围配置成功');
        } else {
          await createDataScope(values as CreateDataScopeDto);
          message.success('创建数据范围配置成功');
        }
        setModalVisible(false);
        setEditingScope(null);
        form.resetFields();
        loadData();
      } catch (error: any) {
        message.error(error.message || (editingScope ? '更新失败' : '创建失败'));
      }
    },
    [editingScope, updateDataScope, createDataScope, form, loadData]
  );

  /**
   * 打开编辑模态框
   */
  const handleEdit = useCallback(
    (scope: DataScope) => {
      setEditingScope(scope);
      form.setFieldsValue({
        ...scope,
        departmentIds: scope.departmentIds || [],
        includeSubDepartments: scope.includeSubDepartments ?? true,
        priority: scope.priority ?? 100,
      });
      setModalVisible(true);
    },
    [form]
  );

  /**
   * 删除配置
   */
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteDataScope(id);
        message.success('删除数据范围配置成功');
        loadData();
      } catch (error) {
        message.error('删除数据范围配置失败');
      }
    },
    [deleteDataScope, loadData]
  );

  /**
   * 切换启用状态
   */
  const handleToggle = useCallback(
    async (id: string) => {
      try {
        await toggleDataScope(id);
        message.success('切换状态成功');
        loadData();
      } catch (error) {
        message.error('切换状态失败');
      }
    },
    [toggleDataScope, loadData]
  );

  /**
   * 查看详情
   */
  const handleView = useCallback((scope: DataScope) => {
    setViewingScope(scope);
    setDetailModalVisible(true);
  }, []);

  /**
   * 打开创建模态框
   */
  const handleCreate = useCallback(() => {
    setEditingScope(null);
    form.resetFields();
    setModalVisible(true);
  }, [form]);

  /**
   * 关闭创建/编辑模态框
   */
  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setEditingScope(null);
    form.resetFields();
  }, [form]);

  /**
   * 关闭详情模态框
   */
  const handleCloseDetailModal = useCallback(() => {
    setDetailModalVisible(false);
  }, []);

  // 表格列定义
  const columns = useDataScopeTableColumns({
    roles,
    scopeTypes,
    getScopeDescription,
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onToggle: handleToggle,
  });

  return {
    // 数据状态
    dataScopes,
    scopeTypes,
    roles,
    loading: loading || hookLoading,
    // 模态框状态
    modalVisible,
    detailModalVisible,
    editingScope,
    viewingScope,
    form,
    // 筛选状态
    filterRoleId,
    filterResourceType,
    setFilterRoleId,
    setFilterResourceType,
    // 表格列
    columns,
    // 操作函数
    handleCreate,
    handleSubmit,
    handleCloseModal,
    handleCloseDetailModal,
    // 工具函数
    getScopeDescription,
  };
};
