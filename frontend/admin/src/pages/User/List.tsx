import { useUsers } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import { useUserListState } from '@/hooks/useUserListState';
import {
  UserTable,
  UserFilterPanel,
  UserToolbar,
  CreateUserModal,
  EditUserModal,
  BalanceModal,
  ResetPasswordModal,
  useUserOperations,
} from '@/components/User';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

/**
 * 用户列表页面（优化版 v3）
 *
 * 优化策略:
 * 1. ✅ 状态管理提取到 useUserListState Hook
 * 2. ✅ 业务逻辑提取到 useUserOperations Hook
 * 3. ✅ 主组件仅负责 UI 组合 (82% 代码减少)
 * 4. ✅ 所有 Modal 和 Form 统一管理
 * 5. ✅ 错误边界保护 - 组件错误不会导致整个页面崩溃
 * 6. ✅ 统一加载状态管理 - 骨架屏、错误提示、空状态、重试按钮
 */
const UserList = () => {
  // ===== 状态管理 (统一由 Hook 管理) =====
  const state = useUserListState();

  // ===== 数据查询 =====
  const { data, isLoading, error, refetch } = useUsers(state.params);
  const { data: rolesData } = useRoles({ page: 1, pageSize: 100 });

  const users = data?.data || [];
  const total = data?.total || 0;
  const roles = rolesData?.data || [];

  // ===== 业务逻辑 =====
  const operations = useUserOperations({
    form: state.form,
    editForm: state.editForm,
    balanceForm: state.balanceForm,
    resetPasswordForm: state.resetPasswordForm,
    selectedUser: state.selectedUser,
    balanceType: state.balanceType,
    selectedRowKeys: state.selectedRowKeys,
    onCreateModalClose: state.closeCreateModal,
    onEditModalClose: state.closeEditModal,
    onBalanceModalClose: state.closeBalanceModal,
    onResetPasswordModalClose: state.closeResetPasswordModal,
    onSelectionChange: state.setSelectedRowKeys,
    onBalanceError: state.setBalanceError,
  });

  // ===== 渲染 =====
  return (
    <ErrorBoundary boundaryName="UserListPage">
      <div>
        <h2>用户管理</h2>

        <LoadingState
          loading={isLoading}
          error={error}
          empty={users.length === 0 && !isLoading}
          onRetry={refetch}
          loadingType="skeleton"
          skeletonRows={5}
          errorDescription="加载用户列表失败，请检查网络连接后重试"
          emptyDescription="暂无用户数据，点击右上角「创建用户」按钮添加新用户"
        >
          <UserFilterPanel
        form={state.filterForm}
        roles={roles}
        filterExpanded={state.filterExpanded}
        hasFilters={state.hasFilters}
        onFilterChange={state.handleFilterChange}
        onClearFilters={state.handleClearFilters}
        onToggleExpanded={() => state.setFilterExpanded(!state.filterExpanded)}
      />

      <UserToolbar
        selectedCount={state.selectedRowKeys.length}
        onCreateUser={() => state.setCreateModalVisible(true)}
        onExport={state.handleExport}
        onImport={state.handleImport}
        onBatchDelete={operations.handleBatchDelete}
        onBatchActivate={() => operations.handleBatchUpdateStatus('active')}
        onBatchBan={() => operations.handleBatchUpdateStatus('banned')}
      />

      <UserTable
        users={users}
        loading={isLoading}
        page={state.page}
        pageSize={state.pageSize}
        total={total}
        selectedRowKeys={state.selectedRowKeys}
        visibleEmails={state.visibleEmails}
        onPageChange={(page, pageSize) => {
          state.setPage(page);
          state.setPageSize(pageSize);
        }}
        onSelectionChange={state.setSelectedRowKeys}
        onEdit={state.handleEdit}
        onResetPassword={state.openResetPassword}
        onRecharge={state.openRecharge}
        onDeduct={state.openDeduct}
        onUpdateStatus={operations.handleUpdateStatus}
        onDelete={operations.handleDelete}
        onToggleEmailVisibility={state.toggleEmailVisibility}
      />

      <CreateUserModal
        visible={state.createModalVisible}
        form={state.form}
        roles={roles}
        onCancel={state.closeCreateModal}
        onFinish={operations.handleCreate}
      />

      <EditUserModal
        visible={state.editModalVisible}
        form={state.editForm}
        roles={roles}
        selectedUser={state.selectedUser}
        onCancel={state.closeEditModal}
        onFinish={operations.handleUpdate}
      />

      <BalanceModal
        visible={state.balanceModalVisible}
        form={state.balanceForm}
        balanceType={state.balanceType}
        selectedUser={state.selectedUser}
        error={state.balanceError}
        onCancel={state.closeBalanceModal}
        onFinish={operations.handleBalanceOperation}
        onClearError={() => state.setBalanceError(null)}
        onRetry={() => state.balanceForm.submit()}
      />

      <ResetPasswordModal
        visible={state.resetPasswordModalVisible}
        form={state.resetPasswordForm}
        selectedUser={state.selectedUser}
        onCancel={state.closeResetPasswordModal}
        onFinish={operations.handleResetPassword}
      />
        </LoadingState>
      </div>
    </ErrorBoundary>
  );
};

export default UserList;
