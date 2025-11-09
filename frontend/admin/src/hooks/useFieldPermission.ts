import { useState, useCallback } from 'react';
import { Form } from 'antd';
import type { FieldPermission, OperationType } from '@/types';
import {
  useFieldPermissions,
  useAccessLevels,
  useOperationTypes,
  useFieldPermissionStats,
  useCreateFieldPermission,
  useUpdateFieldPermission,
  useDeleteFieldPermission,
  useToggleFieldPermission,
} from './queries/useFieldPermissions';
import { useDebounce } from './useDebounce';

/**
 * 字段权限管理业务逻辑 Hook - 优化版本
 *
 * ✅ 性能优化:
 * 1. 服务端分页 - 不再一次性加载所有数据
 * 2. 懒加载元数据 - 访问级别和操作类型按需加载
 * 3. React Query 缓存 - 自动缓存和重新验证
 * 4. 防抖搜索 - 减少不必要的请求
 *
 * 功能:
 * 1. 数据加载 (权限列表、访问级别、操作类型) - 使用 React Query + 缓存
 * 2. Modal 状态管理
 * 3. 筛选条件管理
 * 4. 分页管理
 */
export const useFieldPermission = () => {
  // ===== 状态管理 =====
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [editingPermission, setEditingPermission] = useState<FieldPermission | null>(null);
  const [detailPermission, setDetailPermission] = useState<FieldPermission | null>(null);
  const [form] = Form.useForm();

  // ===== 筛选条件 =====
  const [filterRoleId, setFilterRoleId] = useState<string>('');
  const [filterResourceType, setFilterResourceType] = useState<string>('');
  const [filterOperation, setFilterOperation] = useState<OperationType | undefined>(undefined);

  // ✅ 防抖筛选条件（500ms延迟，避免频繁请求）
  const debouncedFilterRoleId = useDebounce(filterRoleId, 500);
  const debouncedFilterResourceType = useDebounce(filterResourceType, 500);
  // 操作类型是下拉选择，不需要防抖

  // ===== 分页状态 ✅ =====
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // ===== 数据加载 (使用 React Query) =====

  /**
   * 加载元数据 (访问级别和操作类型)
   * ✅ 懒加载：只在打开创建/编辑弹窗时加载
   */
  const {
    data: accessLevels = [],
    isLoading: accessLevelsLoading,
  } = useAccessLevels(isModalVisible); // ✅ 只在需要时加载

  const {
    data: operationTypes = [],
    isLoading: operationTypesLoading,
  } = useOperationTypes(); // ✅ 操作类型用于筛选，始终加载

  /**
   * 加载权限列表
   * ✅ 服务端分页 + 筛选
   * ✅ 自动缓存 30 秒
   * ✅ 防抖筛选条件，避免频繁请求
   * ✅ 筛选条件或分页变化时自动重新获取
   */
  const {
    data: permissionsData,
    isLoading: permissionsLoading,
    refetch: refetchPermissions,
  } = useFieldPermissions({
    roleId: debouncedFilterRoleId || undefined,
    resourceType: debouncedFilterResourceType || undefined,
    operation: filterOperation,
    page,
    pageSize,
  });

  const permissions = permissionsData?.permissions || [];
  const total = permissionsData?.total || 0;
  const loading = permissionsLoading || operationTypesLoading;

  /**
   * 加载统计数据
   * ✅ 使用服务端聚合查询，避免加载所有数据
   */
  const {
    data: stats,
    isLoading: statsLoading,
  } = useFieldPermissionStats();

  // ===== Mutations =====

  const createMutation = useCreateFieldPermission();
  const updateMutation = useUpdateFieldPermission();
  const deleteMutation = useDeleteFieldPermission();
  const toggleMutation = useToggleFieldPermission();

  // ===== 事件处理 =====

  /**
   * 打开创建模态框
   */
  const handleCreate = useCallback(() => {
    setEditingPermission(null);
    form.resetFields();
    setIsModalVisible(true);
  }, [form]);

  /**
   * 打开编辑模态框
   */
  const handleEdit = useCallback(
    (record: FieldPermission) => {
      setEditingPermission(record);
      form.setFieldsValue({
        roleId: record.roleId,
        resourceType: record.resourceType,
        operation: record.operation,
        hiddenFields: record.hiddenFields?.join(', '),
        readOnlyFields: record.readOnlyFields?.join(', '),
        writableFields: record.writableFields?.join(', '),
        requiredFields: record.requiredFields?.join(', '),
        description: record.description,
        priority: record.priority,
      });
      setIsModalVisible(true);
    },
    [form]
  );

  /**
   * 查看详情
   */
  const handleViewDetail = useCallback((record: FieldPermission) => {
    setDetailPermission(record);
    setIsDetailModalVisible(true);
  }, []);

  /**
   * 创建字段权限
   */
  const handleCreateSubmit = useCallback(
    async (values: any) => {
      await createMutation.mutateAsync(values);
      setIsModalVisible(false);
      form.resetFields();
      // ✅ 创建后回到第一页
      setPage(1);
    },
    [createMutation, form]
  );

  /**
   * 更新字段权限
   */
  const handleUpdateSubmit = useCallback(
    async (values: any) => {
      if (!editingPermission) return;
      await updateMutation.mutateAsync({
        id: editingPermission.id,
        data: values,
      });
      setIsModalVisible(false);
      form.resetFields();
      setEditingPermission(null);
    },
    [updateMutation, editingPermission, form]
  );

  /**
   * 删除字段权限
   */
  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
      // ✅ 如果删除后当前页没有数据，回到上一页
      if (permissions.length === 1 && page > 1) {
        setPage(page - 1);
      }
    },
    [deleteMutation, permissions.length, page]
  );

  /**
   * 启用/禁用字段权限
   */
  const handleToggle = useCallback(
    async (id: string) => {
      await toggleMutation.mutateAsync(id);
    },
    [toggleMutation]
  );

  /**
   * 分页变化处理 ✅
   */
  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  }, []);

  /**
   * 筛选条件变化后重置到第一页 ✅
   */
  const handleFilterChange = useCallback(() => {
    setPage(1);
  }, []);

  return {
    // 数据
    permissions,
    total,
    accessLevels,
    operationTypes,
    loading,

    // ✅ 统计数据（从服务端聚合查询）
    stats,
    statsLoading,

    // 分页 ✅
    page,
    pageSize,
    handlePageChange,

    // Modal 状态
    isModalVisible,
    setIsModalVisible,
    isDetailModalVisible,
    setIsDetailModalVisible,
    editingPermission,
    detailPermission,

    // 筛选条件
    filterRoleId,
    setFilterRoleId: (value: string) => {
      setFilterRoleId(value);
      handleFilterChange();
    },
    filterResourceType,
    setFilterResourceType: (value: string) => {
      setFilterResourceType(value);
      handleFilterChange();
    },
    filterOperation,
    setFilterOperation: (value: OperationType | undefined) => {
      setFilterOperation(value);
      handleFilterChange();
    },

    // Form
    form,

    // 操作方法
    handleCreate,
    handleEdit,
    handleViewDetail,
    handleCreateSubmit,
    handleUpdateSubmit,
    handleDelete,
    handleToggle,
    loadPermissions: refetchPermissions,

    // Mutation 状态（用于显示加载指示器）
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isToggling: toggleMutation.isPending,
  };
};
