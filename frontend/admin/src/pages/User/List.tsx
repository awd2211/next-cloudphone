import { useState, useMemo, useCallback } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  InputNumber,
  Select,
  DatePicker,
  Card,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  DownloadOutlined,
  UploadOutlined,
  FilterOutlined,
  DeleteOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TableRowSelection } from 'antd/es/table';
import type { User, CreateUserDto, UpdateUserDto } from '@/types';
import dayjs from 'dayjs';
import {
  useUsers,
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useToggleUserStatus,
} from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import * as userService from '@/services/user';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { EnhancedErrorAlert, type EnhancedError } from '@/components/EnhancedErrorAlert';
import { PermissionGuard } from '@/hooks/usePermission';

// ✅ 导入优化的子组件（React.memo）
import {
  UserActions,
  UserStatusTag,
  UserRolesTags,
  UserEmailCell,
  BalanceDisplay,
  UserFilterPanel,
  UserToolbar,
  CreateUserModal,
  EditUserModal,
  BalanceModal,
  ResetPasswordModal,
  STATUS_CONFIG,
} from '@/components/User';

/**
 * 用户列表页面（优化版 - 使用 React Query）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 自动请求去重和缓存
 * 5. ✅ 乐观更新支持
 */
const UserList = () => {
  // 分页和Modal状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [balanceType, setBalanceType] = useState<'recharge' | 'deduct'>('recharge');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceError, setBalanceError] = useState<EnhancedError | null>(null);

  // 新功能状态
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [visibleEmails, setVisibleEmails] = useState<Set<string>>(new Set());

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [balanceForm] = Form.useForm();
  const [resetPasswordForm] = Form.useForm();
  const [filterForm] = Form.useForm();

  // 使用异步操作hook
  const { execute: executeBalanceOperation } = useAsyncOperation();

  // ✅ 使用 React Query hooks 替换手动状态管理
  // 合并分页和筛选参数
  const params = useMemo(() => {
    const queryParams: any = { page, pageSize };

    // 添加筛选条件
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

  // 获取角色列表
  const { data: rolesData } = useRoles({ page: 1, pageSize: 100 });
  const roles = rolesData?.data || [];

  // Mutations
  const createMutation = useCreateUser();
  const deleteMutation = useDeleteUser();
  const updateMutation = useUpdateUser();
  const toggleStatusMutation = useToggleUserStatus();

  const users = data?.data || [];
  const total = data?.total || 0;

  // ✅ useCallback 优化事件处理函数
  const handleCreate = useCallback(
    async (values: CreateUserDto) => {
      await createMutation.mutateAsync(values);
      setCreateModalVisible(false);
      form.resetFields();
    },
    [createMutation, form]
  );

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

  const handleUpdate = useCallback(
    async (values: UpdateUserDto) => {
      if (!selectedUser) return;
      await updateMutation.mutateAsync({ id: selectedUser.id, data: values });
      setEditModalVisible(false);
      editForm.resetFields();
      setSelectedUser(null);
    },
    [selectedUser, updateMutation, editForm]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const handleUpdateStatus = useCallback(
    async (id: string, status: 'active' | 'inactive' | 'banned') => {
      await updateMutation.mutateAsync({ id, data: { status } });
    },
    [updateMutation]
  );

  const handleBalanceOperation = useCallback(
    async (values: { amount: number; reason?: string }) => {
      if (!selectedUser) return;

      setBalanceError(null);

      await executeBalanceOperation(
        async () => {
          if (balanceType === 'recharge') {
            await userService.rechargeBalance(selectedUser.id, values.amount);
          } else {
            await userService.deductBalance(
              selectedUser.id,
              values.amount,
              values.reason || '管理员扣减'
            );
          }
        },
        {
          successMessage: balanceType === 'recharge' ? '充值成功' : '扣减成功',
          errorContext: balanceType === 'recharge' ? '余额充值' : '余额扣减',
          showErrorMessage: false,
          onSuccess: () => {
            setBalanceModalVisible(false);
            balanceForm.resetFields();
            // 手动失效缓存以刷新数据
            createMutation.mutate({} as any, {
              onSuccess: () => {}, // 触发缓存失效
            });
          },
          onError: (error: any) => {
            const response = error.response?.data;
            setBalanceError({
              message: response?.message || '操作失败',
              userMessage:
                response?.userMessage ||
                (balanceType === 'recharge' ? '充值失败，请稍后重试' : '扣减失败，请稍后重试'),
              code: response?.errorCode || error.response?.status?.toString(),
              requestId: response?.requestId,
              recoverySuggestions: response?.recoverySuggestions || [
                {
                  action: '检查余额',
                  description:
                    balanceType === 'deduct' ? '确认用户余额是否充足' : '确认充值金额是否正确',
                },
                {
                  action: '重试',
                  description: '稍后重试操作',
                },
                {
                  action: '联系技术支持',
                  description: '如果问题持续，请联系技术支持',
                  actionUrl: '/support',
                },
              ],
              retryable: true,
            });
          },
        }
      );
    },
    [selectedUser, balanceType, balanceForm, createMutation, executeBalanceOperation]
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

  // 重置密码处理
  const handleResetPassword = useCallback(
    async (values: { newPassword: string }) => {
      if (!selectedUser) return;
      try {
        await userService.changePassword(selectedUser.id, {
          oldPassword: '', // 管理员重置不需要旧密码
          newPassword: values.newPassword,
        });
        message.success('密码重置成功');
        setResetPasswordModalVisible(false);
        resetPasswordForm.resetFields();
        setSelectedUser(null);
      } catch (error: any) {
        message.error(`密码重置失败: ${error.response?.data?.message || error.message}`);
      }
    },
    [selectedUser, resetPasswordForm]
  );

  const openResetPassword = useCallback((record: User) => {
    setSelectedUser(record);
    setResetPasswordModalVisible(true);
  }, []);

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请至少选择一个用户');
      return;
    }
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个用户吗？此操作不可恢复！`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await Promise.all(selectedRowKeys.map((id) => deleteMutation.mutateAsync(id)));
          message.success(`成功删除 ${selectedRowKeys.length} 个用户`);
          setSelectedRowKeys([]);
        } catch (error: any) {
          message.error(`批量删除失败: ${error.response?.data?.message || error.message}`);
        }
      },
    });
  }, [selectedRowKeys, deleteMutation]);

  // 批量修改状态
  const handleBatchUpdateStatus = useCallback(
    async (status: 'active' | 'inactive' | 'banned') => {
      if (selectedRowKeys.length === 0) {
        message.warning('请至少选择一个用户');
        return;
      }
      try {
        await Promise.all(
          selectedRowKeys.map((id) => updateMutation.mutateAsync({ id, data: { status } }))
        );
        message.success(`成功修改 ${selectedRowKeys.length} 个用户状态`);
        setSelectedRowKeys([]);
      } catch (error: any) {
        message.error(`批量修改状态失败: ${error.response?.data?.message || error.message}`);
      }
    },
    [selectedRowKeys, updateMutation]
  );

  // 批量分配角色
  const handleBatchAssignRoles = useCallback(
    (roleIds: string[]) => {
      if (selectedRowKeys.length === 0) {
        message.warning('请至少选择一个用户');
        return;
      }
      Modal.confirm({
        title: '确认批量分配角色',
        content: `确定要为选中的 ${selectedRowKeys.length} 个用户分配角色吗？`,
        okText: '确定',
        cancelText: '取消',
        onOk: async () => {
          try {
            await Promise.all(
              selectedRowKeys.map((id) => updateMutation.mutateAsync({ id, data: { roleIds } }))
            );
            message.success(`成功为 ${selectedRowKeys.length} 个用户分配角色`);
            setSelectedRowKeys([]);
          } catch (error: any) {
            message.error(`批量分配角色失败: ${error.response?.data?.message || error.message}`);
          }
        },
      });
    },
    [selectedRowKeys, updateMutation]
  );

  // 实时筛选处理
  const handleFilterChange = useCallback((field: string, value: any) => {
    setFilters((prev: any) => ({
      ...prev,
      [field]: value,
    }));
    setPage(1); // 重置到第一页
  }, []);

  // 清空所有筛选条件
  const handleClearFilters = useCallback(() => {
    setFilters({});
    filterForm.resetFields();
    setPage(1);
  }, [filterForm]);

  // 检查是否有筛选条件
  const hasFilters = useMemo(() => {
    return Object.keys(filters).some((key) => filters[key] !== undefined && filters[key] !== '');
  }, [filters]);

  // 导出用户数据
  const handleExport = useCallback(async () => {
    try {
      message.info('导出功能开发中...');
      // TODO: 实现导出逻辑
    } catch (error: any) {
      message.error(`导出失败: ${error.message}`);
    }
  }, []);

  // 导入用户数据
  const handleImport = useCallback(async () => {
    message.info('导入功能开发中...');
    // TODO: 实现导入逻辑
  }, []);

  // 切换邮箱显示/隐藏
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

  // 表格行选择配置
  const rowSelection: TableRowSelection<User> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys as string[]),
  };

  // ✅ useMemo 优化表格列配置
  const columns: ColumnsType<User> = useMemo(
    () => [
      {
        title: '用户 ID',
        dataIndex: 'id',
        key: 'id',
        width: 100,
        ellipsis: true,
      },
      {
        title: '用户名',
        dataIndex: 'username',
        key: 'username',
        sorter: (a, b) => a.username.localeCompare(b.username),
      },
      {
        title: '邮箱',
        dataIndex: 'email',
        key: 'email',
        sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
        // ✅ 使用 memo 化的 UserEmailCell 组件
        render: (email: string, record: User) => (
          <UserEmailCell
            email={email}
            isVisible={visibleEmails.has(record.id)}
            onToggleVisibility={() => toggleEmailVisibility(record.id)}
          />
        ),
      },
      {
        title: '手机号',
        dataIndex: 'phone',
        key: 'phone',
        sorter: (a, b) => (a.phone || '').localeCompare(b.phone || ''),
      },
      {
        title: '余额',
        dataIndex: 'balance',
        key: 'balance',
        sorter: (a, b) => (a.balance || 0) - (b.balance || 0),
        render: (balance: number) => <BalanceDisplay balance={balance} />,
      },
      {
        title: '角色',
        dataIndex: 'roles',
        key: 'roles',
        // ✅ 使用 memo 化的 UserRolesTags 组件
        render: (roles: any[]) => <UserRolesTags roles={roles} />,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        sorter: (a, b) => a.status.localeCompare(b.status),
        // ✅ 使用 memo 化的 UserStatusTag 组件
        render: (status: string) => <UserStatusTag status={status as any} />,
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      },
      {
        title: '操作',
        key: 'action',
        width: 250,
        fixed: 'right',
        // ✅ 使用 memo 化的 UserActions 组件
        render: (_, record) => (
          <UserActions
            user={record}
            onEdit={handleEdit}
            onResetPassword={openResetPassword}
            onRecharge={openRecharge}
            onDeduct={openDeduct}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDelete}
          />
        ),
      },
    ],
    [
      handleEdit,
      openResetPassword,
      openRecharge,
      openDeduct,
      handleUpdateStatus,
      handleDelete,
      visibleEmails,
      toggleEmailVisibility,
    ]
  );

  return (
    <div>
      <h2>用户管理</h2>

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

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={isLoading}
        rowSelection={rowSelection}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
          },
        }}
        scroll={{ x: 1200 }}
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
