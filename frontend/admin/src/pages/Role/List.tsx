import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, message, Row, Col, Statistic, Tag } from 'antd';
import { TeamOutlined, SafetyOutlined, ReloadOutlined } from '@ant-design/icons';
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
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

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
 * 9. ✅ ErrorBoundary 错误边界包裹
 * 10. ✅ LoadingState 统一加载状态
 * 11. ✅ 统计卡片展示
 * 12. ✅ 快捷键支持 (Ctrl+N 新建, Ctrl+R 刷新)
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
  const { data, isLoading, error, refetch } = useRoles(params);
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

  // ✅ 统计数据计算
  const stats = useMemo(() => {
    const systemRoles = roles.filter((r) => r.isSystem).length;
    const customRoles = roles.filter((r) => !r.isSystem).length;
    return { total, systemRoles, customRoles };
  }, [roles, total]);

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

  // ✅ 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleCreate();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch();
        message.info('正在刷新...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCreate, refetch]);

  return (
    <ErrorBoundary boundaryName="RoleList">
      <Card bordered={false}>
        {/* 页面标题 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ marginBottom: 0 }}>
            <TeamOutlined style={{ marginRight: 8 }} />
            角色管理
            <Tag
              icon={<ReloadOutlined spin={isLoading} />}
              color="processing"
              style={{ marginLeft: 12, cursor: 'pointer' }}
              onClick={() => refetch()}
            >
              Ctrl+R 刷新
            </Tag>
          </h2>
          <span style={{ fontSize: 12, color: '#999' }}>Ctrl+N 新建</span>
        </div>

        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card size="small">
              <Statistic title="角色总数" value={stats.total} prefix={<TeamOutlined />} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="系统角色"
                value={stats.systemRoles}
                valueStyle={{ color: '#1890ff' }}
                prefix={<SafetyOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="自定义角色"
                value={stats.customRoles}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        <RoleHeader
          onCreate={handleCreate}
          selectedCount={selectedRowKeys.length}
          onBatchDelete={handleBatchDelete}
          onRefresh={handleRefresh}
          batchDeleteLoading={batchDeleteMutation.isPending}
        />

        {/* 使用 LoadingState 包裹表格 */}
        <LoadingState
          loading={isLoading}
          error={error}
          empty={!isLoading && !error && roles.length === 0}
          onRetry={refetch}
          loadingType="skeleton"
          skeletonRows={5}
          emptyDescription="暂无角色数据"
        >
          <RoleTable
            roles={roles}
            loading={false}
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
        </LoadingState>

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
    </ErrorBoundary>
  );
};

export default RoleList;
