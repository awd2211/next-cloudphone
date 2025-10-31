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
  DollarOutlined,
  MinusOutlined,
  EditOutlined,
  KeyOutlined,
  DownloadOutlined,
  UploadOutlined,
  FilterOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
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

  // ✅ useMemo 优化状态映射
  const statusMap = useMemo(
    () => ({
      active: { color: 'green', text: '正常' },
      inactive: { color: 'default', text: '未激活' },
      banned: { color: 'red', text: '已封禁' },
    }),
    []
  );

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

  // 邮箱脱敏函数
  const maskEmail = useCallback((email: string | undefined) => {
    if (!email) return '';
    const [username, domain] = email.split('@');
    if (!domain) return email;
    const visiblePart = username.slice(0, 3);
    const maskedPart = '*'.repeat(Math.max(0, username.length - 3));
    return `${visiblePart}${maskedPart}@${domain}`;
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
        render: (email: string, record: User) => {
          const isVisible = visibleEmails.has(record.id);
          return (
            <Space>
              <span>{isVisible ? email : maskEmail(email)}</span>
              <Button
                type="link"
                size="small"
                icon={isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => toggleEmailVisibility(record.id)}
                style={{ padding: 0 }}
              />
            </Space>
          );
        },
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
        render: (balance: number) => `¥${(balance || 0).toFixed(2)}`,
      },
      {
        title: '角色',
        dataIndex: 'roles',
        key: 'roles',
        render: (roles: any[]) => (
          <>
            {roles?.map((role) => (
              <Tag key={role.id} color="blue">
                {role.name}
              </Tag>
            ))}
          </>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        sorter: (a, b) => a.status.localeCompare(b.status),
        render: (status: string) => {
          const config = statusMap[status] || { color: 'default', text: status };
          return <Tag color={config.color}>{config.text}</Tag>;
        },
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
        render: (_, record) => (
          <Space size="small">
            <PermissionGuard permission="user:update">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                icon={<KeyOutlined />}
                onClick={() => openResetPassword(record)}
              >
                重置密码
              </Button>
            </PermissionGuard>

            <PermissionGuard permission="billing:manage">
              <Button
                type="link"
                size="small"
                icon={<DollarOutlined />}
                onClick={() => openRecharge(record)}
              >
                充值
              </Button>
              <Button
                type="link"
                size="small"
                icon={<MinusOutlined />}
                onClick={() => openDeduct(record)}
              >
                扣减
              </Button>
            </PermissionGuard>

            <PermissionGuard permission="user:update">
              {record.status === 'active' && (
                <Button
                  type="link"
                  size="small"
                  danger
                  onClick={() => handleUpdateStatus(record.id, 'banned')}
                >
                  封禁
                </Button>
              )}
              {record.status === 'banned' && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => handleUpdateStatus(record.id, 'active')}
                >
                  解封
                </Button>
              )}
            </PermissionGuard>

            <PermissionGuard permission="user:delete">
              <Popconfirm
                title="确定要删除这个用户吗?"
                onConfirm={() => handleDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </Popconfirm>
            </PermissionGuard>
          </Space>
        ),
      },
    ],
    [
      statusMap,
      openRecharge,
      openDeduct,
      handleEdit,
      handleUpdateStatus,
      handleDelete,
      visibleEmails,
      maskEmail,
      toggleEmailVisibility,
    ]
  );

  return (
    <div>
      <h2>用户管理</h2>

      {/* 筛选栏 */}
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <FilterOutlined />
            <span>筛选条件</span>
            {hasFilters && <Tag color="blue">已应用筛选</Tag>}
          </Space>
        }
        extra={
          <Space>
            {hasFilters && (
              <Button size="small" onClick={handleClearFilters}>
                清空
              </Button>
            )}
            <Button
              type="text"
              size="small"
              icon={filterExpanded ? <UpOutlined /> : <DownOutlined />}
              onClick={() => setFilterExpanded(!filterExpanded)}
            >
              {filterExpanded ? '收起' : '展开'}
            </Button>
          </Space>
        }
      >
        {filterExpanded && (
          <Form form={filterForm} layout="vertical">
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item label="用户名" name="username">
                  <Input
                    placeholder="模糊搜索用户名"
                    allowClear
                    onChange={(e) => handleFilterChange('username', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="邮箱" name="email">
                  <Input
                    placeholder="模糊搜索邮箱"
                    allowClear
                    onChange={(e) => handleFilterChange('email', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="手机号" name="phone">
                  <Input
                    placeholder="模糊搜索手机号"
                    allowClear
                    onChange={(e) => handleFilterChange('phone', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="状态" name="status">
                  <Select
                    placeholder="选择状态"
                    allowClear
                    onChange={(value) => handleFilterChange('status', value)}
                    options={[
                      { label: '正常', value: 'active' },
                      { label: '未激活', value: 'inactive' },
                      { label: '已封禁', value: 'banned' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item label="角色" name="roleId">
                  <Select
                    placeholder="选择角色"
                    allowClear
                    onChange={(value) => handleFilterChange('roleId', value)}
                    options={roles.map((role) => ({
                      label: role.name,
                      value: role.id,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="最小余额" name="minBalance">
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="最小余额"
                    min={0}
                    precision={2}
                    onChange={(value) => handleFilterChange('minBalance', value)}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="最大余额" name="maxBalance">
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="最大余额"
                    min={0}
                    precision={2}
                    onChange={(value) => handleFilterChange('maxBalance', value)}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="注册时间" name="dateRange">
                  <DatePicker.RangePicker
                    style={{ width: '100%' }}
                    onChange={(dates) => {
                      if (dates) {
                        handleFilterChange('startDate', dates[0]?.format('YYYY-MM-DD'));
                        handleFilterChange('endDate', dates[1]?.format('YYYY-MM-DD'));
                      } else {
                        handleFilterChange('startDate', undefined);
                        handleFilterChange('endDate', undefined);
                      }
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Card>

      {/* 操作按钮栏 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <PermissionGuard permission="user:create">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建用户
          </Button>
        </PermissionGuard>

        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          导出
        </Button>

        <Button icon={<UploadOutlined />} onClick={handleImport}>
          导入
        </Button>

        {selectedRowKeys.length > 0 && (
          <>
            <PermissionGuard permission="user:delete">
              <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </PermissionGuard>

            <PermissionGuard permission="user:update">
              <Button onClick={() => handleBatchUpdateStatus('active')}>批量启用</Button>
              <Button onClick={() => handleBatchUpdateStatus('banned')}>批量封禁</Button>
            </PermissionGuard>
          </>
        )}
      </Space>

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
      <Modal
        title="创建用户"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item label="手机号" name="phone">
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item label="角色" name="roleIds">
            <Select
              mode="multiple"
              placeholder="请选择角色"
              options={roles.map((role) => ({
                label: role.name,
                value: role.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑用户Modal */}
      <Modal
        title="编辑用户"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setSelectedUser(null);
        }}
        onOk={() => editForm.submit()}
        width={600}
      >
        <Form form={editForm} onFinish={handleUpdate} layout="vertical">
          <Form.Item label="用户名">
            <Input value={selectedUser?.username} disabled />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item label="手机号" name="phone">
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item label="状态" name="status">
            <Select placeholder="请选择状态">
              <Select.Option value="active">正常</Select.Option>
              <Select.Option value="inactive">未激活</Select.Option>
              <Select.Option value="banned">已封禁</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="角色" name="roleIds">
            <Select
              mode="multiple"
              placeholder="请选择角色"
              options={roles.map((role) => ({
                label: role.name,
                value: role.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 余额操作Modal */}
      <Modal
        title={balanceType === 'recharge' ? '充值余额' : '扣减余额'}
        open={balanceModalVisible}
        onCancel={() => {
          setBalanceModalVisible(false);
          setBalanceError(null);
          balanceForm.resetFields();
        }}
        onOk={() => balanceForm.submit()}
      >
        {/* 余额操作错误提示 */}
        {balanceError && (
          <EnhancedErrorAlert
            error={balanceError}
            onClose={() => setBalanceError(null)}
            onRetry={() => balanceForm.submit()}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={balanceForm} onFinish={handleBalanceOperation} layout="vertical">
          <Form.Item label="当前余额">
            <Input value={`¥${(selectedUser?.balance || 0).toFixed(2)}`} disabled />
          </Form.Item>

          <Form.Item label="金额" name="amount" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber
              min={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="请输入金额"
              prefix="¥"
            />
          </Form.Item>

          {balanceType === 'deduct' && (
            <Form.Item label="原因" name="reason">
              <Input.TextArea placeholder="请输入扣减原因" rows={3} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 重置密码Modal */}
      <Modal
        title="重置密码"
        open={resetPasswordModalVisible}
        onCancel={() => {
          setResetPasswordModalVisible(false);
          resetPasswordForm.resetFields();
          setSelectedUser(null);
        }}
        onOk={() => resetPasswordForm.submit()}
      >
        <Form form={resetPasswordForm} onFinish={handleResetPassword} layout="vertical">
          <Form.Item label="用户">
            <Input value={selectedUser?.username} disabled />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>

          <Form.Item
            label="确认密码"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserList;
