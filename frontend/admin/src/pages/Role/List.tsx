import { useState, useMemo, useCallback } from 'react';
import { Card, message } from 'antd';
import type { Role } from '@/types';
import {
  useRoles,
  usePermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useAssignPermissions,
  useBatchDeleteRoles,
} from '@/hooks/queries';
import { RoleHeader, RoleTable, RoleFormModal, PermissionAssignModal } from '@/components/Role';

/**
 * 角色列表页面（优化版 - 使用 React Query + 组件化 + 多选）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 组件化拆分，提高可维护性
 * 5. ✅ 权限列表独立缓存（5分钟）
 * 6. ✅ 多选功能支持
 * 7. ✅ 批量删除功能
 * 8. ✅ 系统角色保护（不可删除）
 */
const RoleList = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<Role[]>([]);

  // ✅ 使用 React Query hooks
  const params = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const { data, isLoading, refetch } = useRoles(params);
  // ✅ 修复：获取所有权限用于权限分配（不分页）
  const { data: permissionsData } = usePermissions({ limit: 1000 });
  const permissions = permissionsData?.permissions || [];

  // Mutations
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const deleteMutation = useDeleteRole();
  const assignPermissionsMutation = useAssignPermissions();
  const batchDeleteMutation = useBatchDeleteRoles();

  const roles = data?.data || [];
  const total = data?.total || 0;

  // ✅ 事件处理函数
  const handleCreate = useCallback(() => {
    setEditingRole(null);
    setModalVisible(true);
  }, []);

  const handleEdit = useCallback((role: Role) => {
    setEditingRole(role);
    setModalVisible(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const handleModalCancel = useCallback(() => {
    setModalVisible(false);
    setEditingRole(null);
  }, []);

  const handleSubmit = useCallback(
    async (values: { name: string; description?: string }) => {
      if (editingRole) {
        await updateMutation.mutateAsync({ id: editingRole.id, data: values });
      } else {
        await createMutation.mutateAsync({ ...values, permissionIds: [] });
      }
      setModalVisible(false);
      setEditingRole(null);
    },
    [editingRole, createMutation, updateMutation]
  );

  const handleManagePermissions = useCallback((role: Role) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions?.map((p) => p.id) || []);
    setPermissionModalVisible(true);
  }, []);

  const handlePermissionModalCancel = useCallback(() => {
    setPermissionModalVisible(false);
  }, []);

  const handleAssignPermissions = useCallback(async () => {
    if (!selectedRole) return;
    await assignPermissionsMutation.mutateAsync({
      roleId: selectedRole.id,
      permissionIds: selectedPermissions,
    });
    setPermissionModalVisible(false);
  }, [selectedRole, selectedPermissions, assignPermissionsMutation]);

  const handlePageChange = useCallback((page: number, pageSize: number) => {
    setPage(page);
    setPageSize(pageSize);
    // 翻页时清空选择
    setSelectedRowKeys([]);
    setSelectedRows([]);
  }, []);

  // ✅ 多选处理
  const handleSelectionChange = useCallback((keys: React.Key[], rows: Role[]) => {
    setSelectedRowKeys(keys);
    setSelectedRows(rows);
  }, []);

  // ✅ 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的角色');
      return;
    }
    // 过滤掉系统角色
    const deletableIds = selectedRows
      .filter((role) => !role.isSystem)
      .map((role) => role.id);

    if (deletableIds.length === 0) {
      message.warning('选中的角色都是系统角色，不可删除');
      return;
    }

    await batchDeleteMutation.mutateAsync(deletableIds);
    // 清空选择
    setSelectedRowKeys([]);
    setSelectedRows([]);
  }, [selectedRowKeys, selectedRows, batchDeleteMutation]);

  // ✅ 刷新
  const handleRefresh = useCallback(() => {
    refetch();
    message.success('刷新成功');
  }, [refetch]);

  return (
    <Card bordered={false}>
      <RoleHeader
        onCreate={handleCreate}
        selectedCount={selectedRowKeys.length}
        onBatchDelete={handleBatchDelete}
        onRefresh={handleRefresh}
        batchDeleteLoading={batchDeleteMutation.isPending}
      />

      <RoleTable
        roles={roles}
        loading={isLoading}
        page={page}
        pageSize={pageSize}
        total={total}
        selectedRowKeys={selectedRowKeys}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onManagePermissions={handleManagePermissions}
        onPageChange={handlePageChange}
        onSelectionChange={handleSelectionChange}
      />

      <RoleFormModal
        visible={modalVisible}
        editingRole={editingRole}
        loading={createMutation.isPending || updateMutation.isPending}
        onCancel={handleModalCancel}
        onSubmit={handleSubmit}
      />

      <PermissionAssignModal
        visible={permissionModalVisible}
        role={selectedRole}
        permissions={permissions}
        selectedPermissions={selectedPermissions}
        loading={assignPermissionsMutation.isPending}
        onCancel={handlePermissionModalCancel}
        onSubmit={handleAssignPermissions}
        onPermissionChange={setSelectedPermissions}
      />
    </Card>
  );
};

export default RoleList;
