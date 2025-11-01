import { useState, useMemo, useCallback } from 'react';
import type { Role } from '@/types';
import {
  useRoles,
  usePermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useAssignPermissions,
} from '@/hooks/useRoles';
import { RoleHeader, RoleTable, RoleFormModal, PermissionAssignModal } from '@/components/Role';

/**
 * 角色列表页面（优化版 - 使用 React Query + 组件化）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 组件化拆分，提高可维护性
 * 5. ✅ 权限列表独立缓存（5分钟）
 */
const RoleList = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // ✅ 使用 React Query hooks
  const params = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const { data, isLoading } = useRoles(params);
  const { data: permissions = [] } = usePermissions();

  // Mutations
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const deleteMutation = useDeleteRole();
  const assignPermissionsMutation = useAssignPermissions();

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
  }, []);

  return (
    <div>
      <RoleHeader onCreate={handleCreate} />

      <RoleTable
        roles={roles}
        loading={isLoading}
        page={page}
        pageSize={pageSize}
        total={total}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onManagePermissions={handleManagePermissions}
        onPageChange={handlePageChange}
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
    </div>
  );
};

export default RoleList;
