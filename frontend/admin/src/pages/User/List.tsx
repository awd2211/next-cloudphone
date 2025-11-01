import { useState, useMemo, useCallback } from 'react';
import { Form, message } from 'antd';
import type { User, CreateUserDto, UpdateUserDto } from '@/types';
import { useUsers } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import type { EnhancedError } from '@/components/EnhancedErrorAlert';
import {
  UserTable,
  UserStatsCards,
  UserFilterPanel,
  UserToolbar,
  CreateUserModal,
  EditUserModal,
  BalanceModal,
  ResetPasswordModal,
  useUserOperations,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from '@/components/User';

/**
 * 用户列表页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 组件拆分 - 提取 UserTable, UserStatsCards 等
 * 5. ✅ 自定义 Hook - useUserOperations 封装业务逻辑
 * 6. ✅ 常量提取 - constants.ts
 */
const UserList = () => {
  // ===== 状态管理 =====
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [balanceType, setBalanceType] = useState<'recharge' | 'deduct'>('recharge');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceError, setBalanceError] = useState<EnhancedError | null>(null);
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [visibleEmails, setVisibleEmails] = useState<Set<string>>(new Set());

  // ===== 表单实例 =====
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [balanceForm] = Form.useForm();
  const [resetPasswordForm] = Form.useForm();
  const [filterForm] = Form.useForm();

  // ===== 数据查询 =====
  const params = useMemo(() => {
    const queryParams: any = { page, pageSize };
    if (filters.username) queryParams.username = filters.username;
    if (filters.email) queryParams.email = filters.email;
    if (filters.phone) queryParams.phone = filters.phone;
    if (filters.status) queryParams.status = filters.status;
    if (filters.roleId) queryParams.roleId = filters.roleId;
    if (filters.minBalance !== undefined) queryParams.minBalance = filters.minBalance;
    if (filters.maxBalance !== undefined) queryParams.maxBalance = filters.maxBalance;
    if (filters.startDate) queryParams.startDate = filters.startDate;
    if (filters.endDate) queryParams.endDate = filters.endDate;
    return queryParams;
  }, [page, pageSize, filters]);

  const { data, isLoading } = useUsers(params);
  const { data: rolesData } = useRoles({ page: 1, pageSize: 100 });

  const users = data?.data || [];
  const total = data?.total || 0;
  const roles = rolesData?.data || [];

  // ===== 业务逻辑 (使用自定义 Hook) =====
  const {
    handleCreate,
    handleUpdate,
    handleDelete,
    handleUpdateStatus,
    handleBalanceOperation,
    handleResetPassword,
    handleBatchDelete,
    handleBatchUpdateStatus,
  } = useUserOperations({
    form,
    editForm,
    balanceForm,
    resetPasswordForm,
    selectedUser,
    balanceType,
    selectedRowKeys,
    onCreateModalClose: () => {
      setCreateModalVisible(false);
      setSelectedUser(null);
    },
    onEditModalClose: () => {
      setEditModalVisible(false);
      setSelectedUser(null);
    },
    onBalanceModalClose: () => {
      setBalanceModalVisible(false);
      setSelectedUser(null);
    },
    onResetPasswordModalClose: () => {
      setResetPasswordModalVisible(false);
      setSelectedUser(null);
    },
    onSelectionChange: setSelectedRowKeys,
    onBalanceError: setBalanceError,
  });

  // ===== 事件处理 =====
  const handleEdit = useCallback(
    (record: User) => {
      setSelectedUser(record);
      editForm.setFieldsValue({
        email: record.email,
        phone: record.phone,
        status: record.status,
        roleIds: record.roles?.map((r) => r.id) || [],
      });
      setEditModalVisible(true);
    },
    [editForm]
  );

  const openRecharge = useCallback((record: User) => {
    setSelectedUser(record);
    setBalanceType('recharge');
    setBalanceModalVisible(true);
  }, []);

  const openDeduct = useCallback((record: User) => {
    setSelectedUser(record);
    setBalanceType('deduct');
    setBalanceModalVisible(true);
  }, []);

  const openResetPassword = useCallback((record: User) => {
    setSelectedUser(record);
    setResetPasswordModalVisible(true);
  }, []);

  const handleFilterChange = useCallback((field: string, value: any) => {
    setFilters((prev: any) => ({
      ...prev,
      [field]: value,
    }));
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    filterForm.resetFields();
    setPage(1);
  }, [filterForm]);

  const hasFilters = useMemo(() => {
    return Object.keys(filters).some((key) => filters[key] !== undefined && filters[key] !== '');
  }, [filters]);

  const handleExport = useCallback(async () => {
    message.info('导出功能开发中...');
  }, []);

  const handleImport = useCallback(async () => {
    message.info('导入功能开发中...');
  }, []);

  const toggleEmailVisibility = useCallback((userId: string) => {
    setVisibleEmails((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  // ===== 渲染 =====
  return (
    <div>
      <h2>用户管理</h2>

      {/* 统计卡片 */}
      {/* <UserStatsCards total={total} active={0} inactive={0} banned={0} /> */}

      {/* 筛选栏 */}
      <UserFilterPanel
        form={filterForm}
        roles={roles}
        filterExpanded={filterExpanded}
        hasFilters={hasFilters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        onToggleExpanded={() => setFilterExpanded(!filterExpanded)}
      />

      {/* 操作按钮栏 */}
      <UserToolbar
        selectedCount={selectedRowKeys.length}
        onCreateUser={() => setCreateModalVisible(true)}
        onExport={handleExport}
        onImport={handleImport}
        onBatchDelete={handleBatchDelete}
        onBatchActivate={() => handleBatchUpdateStatus('active')}
        onBatchBan={() => handleBatchUpdateStatus('banned')}
      />

      {/* 用户表格 */}
      <UserTable
        users={users}
        loading={isLoading}
        page={page}
        pageSize={pageSize}
        total={total}
        selectedRowKeys={selectedRowKeys}
        visibleEmails={visibleEmails}
        onPageChange={(page, pageSize) => {
          setPage(page);
          setPageSize(pageSize);
        }}
        onSelectionChange={setSelectedRowKeys}
        onEdit={handleEdit}
        onResetPassword={openResetPassword}
        onRecharge={openRecharge}
        onDeduct={openDeduct}
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDelete}
        onToggleEmailVisibility={toggleEmailVisibility}
      />

      {/* 创建用户Modal */}
      <CreateUserModal
        visible={createModalVisible}
        form={form}
        roles={roles}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onFinish={handleCreate}
      />

      {/* 编辑用户Modal */}
      <EditUserModal
        visible={editModalVisible}
        form={editForm}
        roles={roles}
        selectedUser={selectedUser}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setSelectedUser(null);
        }}
        onFinish={handleUpdate}
      />

      {/* 余额操作Modal */}
      <BalanceModal
        visible={balanceModalVisible}
        form={balanceForm}
        balanceType={balanceType}
        selectedUser={selectedUser}
        error={balanceError}
        onCancel={() => {
          setBalanceModalVisible(false);
          setBalanceError(null);
          balanceForm.resetFields();
        }}
        onFinish={handleBalanceOperation}
        onClearError={() => setBalanceError(null)}
        onRetry={() => balanceForm.submit()}
      />

      {/* 重置密码Modal */}
      <ResetPasswordModal
        visible={resetPasswordModalVisible}
        form={resetPasswordForm}
        selectedUser={selectedUser}
        onCancel={() => {
          setResetPasswordModalVisible(false);
          resetPasswordForm.resetFields();
          setSelectedUser(null);
        }}
        onFinish={handleResetPassword}
      />
    </div>
  );
};

export default UserList;
