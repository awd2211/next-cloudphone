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
  const [statisticsModalVisible, setStatisticsModalVisible] = useState(false);
  const [editingScope, setEditingScope] = useState<DataScope | null>(null);
  const [viewingScope, setViewingScope] = useState<DataScope | null>(null);
  const [form] = Form.useForm();

  // 筛选参数
  const [filterRoleId, setFilterRoleId] = useState<string | undefined>();
  const [filterResourceType, setFilterResourceType] = useState<string | undefined>();

  // ✅ 分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  /**
   * 加载数据范围配置（支持分页）
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchDataScopes({
        roleId: filterRoleId,
        resourceType: filterResourceType,
        isActive: true,
        page,
        pageSize,
      });
      // ✅ 更新总数
      if (result && 'total' in result) {
        setTotal(result.total);
      }
    } catch (_error) {
      message.error('加载数据范围配置失败');
    } finally {
      setLoading(false);
    }
  }, [fetchDataScopes, filterRoleId, filterResourceType, page, pageSize]);

  /**
   * 加载角色列表
   */
  const loadRoles = useCallback(async () => {
    try {
      const res = await getRoles({ page: 1, pageSize: 100 });
      setRoles(res.data);
    } catch (_error) {
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
      } catch (_error) {
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
      } catch (_error) {
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

  /**
   * 显示统计概览
   */
  const handleShowStatistics = useCallback(() => {
    setStatisticsModalVisible(true);
  }, []);

  /**
   * 关闭统计概览模态框
   */
  const handleCloseStatisticsModal = useCallback(() => {
    setStatisticsModalVisible(false);
  }, []);

  /**
   * 导出数据范围配置
   */
  const handleExport = useCallback(() => {
    try {
      // 准备导出数据
      const exportData = dataScopes.map((scope) => {
        const role = roles.find((r) => r.id === scope.roleId);
        return {
          角色: role?.name || scope.roleId,
          资源类型: scope.resourceType,
          范围类型: scope.scopeType,
          优先级: scope.priority,
          状态: scope.isActive ? '启用' : '禁用',
          描述: scope.description || '',
          创建时间: scope.createdAt,
        };
      });

      // 转换为 CSV
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map((row) =>
          headers.map((header) => `"${row[header as keyof typeof row] || ''}"`).join(',')
        ),
      ].join('\n');

      // 下载文件
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `数据范围配置_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success('导出成功');
    } catch (_error) {
      message.error('导出失败');
    }
  }, [dataScopes, roles]);

  /**
   * ✅ 分页变化处理
   */
  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  }, []);

  /**
   * ✅ 筛选条件变化后重置到第一页
   */
  const handleFilterChange = useCallback(() => {
    setPage(1);
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
    // ✅ 分页状态
    page,
    pageSize,
    total,
    handlePageChange,
    // 模态框状态
    modalVisible,
    detailModalVisible,
    statisticsModalVisible,
    editingScope,
    viewingScope,
    form,
    // 筛选状态
    filterRoleId,
    filterResourceType,
    setFilterRoleId: (value: string | undefined) => {
      setFilterRoleId(value);
      handleFilterChange();
    },
    setFilterResourceType: (value: string | undefined) => {
      setFilterResourceType(value);
      handleFilterChange();
    },
    // 表格列
    columns,
    // 操作函数
    handleCreate,
    handleSubmit,
    handleCloseModal,
    handleCloseDetailModal,
    handleShowStatistics,
    handleCloseStatisticsModal,
    handleExport,
    // 工具函数
    getScopeDescription,
  };
};
