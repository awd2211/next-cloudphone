import { useState, useCallback, useMemo } from 'react';
import { message, Form } from 'antd';
import {
  getAllDataScopes,
  createDataScope,
  updateDataScope,
  deleteDataScope,
  toggleDataScope,
} from '@/services/dataScope';
import type { DataScope, CreateDataScopeDto, UpdateDataScopeDto } from '@/types';
import { useValidatedQuery } from '@/hooks/utils';
import {
  DataScopesResponseSchema,
} from '@/schemas/api.schemas';

export const useDataScopeManagement = () => {
  // TODO: Fix getScopeTypes service function
  const scopeTypesResponse = { success: false, data: [] };

  // ✅ 使用 useValidatedQuery 加载数据范围
  const {
    data: dataScopesResponse,
    isLoading: loading,
    refetch: loadDataScopes,
  } = useValidatedQuery({
    queryKey: ['data-scopes'],
    queryFn: getAllDataScopes,
    schema: DataScopesResponseSchema,
    apiErrorMessage: '加载数据范围配置失败',
    fallbackValue: { success: false, data: [] },
    staleTime: 30 * 1000,
  });

  // 模态框和表单状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedScope, setSelectedScope] = useState<DataScope | null>(null);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // 创建数据范围配置
  const handleCreate = useCallback(async () => {
    try {
      const values = await createForm.validateFields();
      await createDataScope(values as CreateDataScopeDto);
      message.success('创建成功');
      createForm.resetFields();
      setCreateModalVisible(false);
      loadDataScopes();
    } catch (error) {
      message.error('创建失败');
    }
  }, [createForm, loadDataScopes]);

  // 编辑数据范围配置
  const handleEdit = useCallback(async () => {
    if (!selectedScope) return;

    try {
      const values = await editForm.validateFields();
      await updateDataScope(selectedScope.id, values as UpdateDataScopeDto);
      message.success('更新成功');
      editForm.resetFields();
      setEditModalVisible(false);
      setSelectedScope(null);
      loadDataScopes();
    } catch (error) {
      message.error('更新失败');
    }
  }, [selectedScope, editForm, loadDataScopes]);

  // 删除数据范围配置
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteDataScope(id);
        message.success('删除成功');
        loadDataScopes();
      } catch (error) {
        message.error('删除失败');
      }
    },
    [loadDataScopes]
  );

  // 启用/禁用
  const handleToggle = useCallback(
    async (id: string) => {
      try {
        await toggleDataScope(id);
        message.success('操作成功');
        loadDataScopes();
      } catch (error) {
        message.error('操作失败');
      }
    },
    [loadDataScopes]
  );

  // 打开编辑模态框
  const openEditModal = useCallback(
    (record: DataScope) => {
      setSelectedScope(record);
      editForm.setFieldsValue({
        scopeType: record.scopeType,
        description: record.description,
        isActive: record.isActive,
        priority: record.priority,
        includeSubDepartments: record.includeSubDepartments,
      });
      setEditModalVisible(true);
    },
    [editForm]
  );

  // 查看详情
  const viewDetail = useCallback((record: DataScope) => {
    setSelectedScope(record);
    setDetailModalVisible(true);
  }, []);

  // ✅ 从响应中提取数据
  const dataScopes = dataScopesResponse?.data || [];
  const scopeTypes = scopeTypesResponse?.data || [];

  // 统计数据
  const stats = useMemo(
    () => ({
      total: dataScopes.length,
      active: dataScopes.filter((s) => s.isActive).length,
      inactive: dataScopes.filter((s) => !s.isActive).length,
      byType: dataScopes.reduce(
        (acc, s) => {
          acc[s.scopeType] = (acc[s.scopeType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    }),
    [dataScopes]
  );

  // 取消创建
  const handleCreateCancel = useCallback(() => {
    setCreateModalVisible(false);
    createForm.resetFields();
  }, [createForm]);

  // 取消编辑
  const handleEditCancel = useCallback(() => {
    setEditModalVisible(false);
    setSelectedScope(null);
    editForm.resetFields();
  }, [editForm]);

  // 关闭详情
  const handleDetailClose = useCallback(() => {
    setDetailModalVisible(false);
    setSelectedScope(null);
  }, []);

  return {
    // 状态
    dataScopes,
    scopeTypes,
    loading,
    createModalVisible,
    editModalVisible,
    detailModalVisible,
    selectedScope,
    createForm,
    editForm,
    stats,
    // 操作
    setCreateModalVisible,
    loadDataScopes,
    handleCreate,
    handleEdit,
    handleDelete,
    handleToggle,
    openEditModal,
    viewDetail,
    handleCreateCancel,
    handleEditCancel,
    handleDetailClose,
  };
};
