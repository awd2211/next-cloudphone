import { useState, useMemo, useCallback } from 'react';
import { Table, Tag, Space, Button, Modal, Form, Input, message, Popconfirm, InputNumber } from 'antd';
import { PlusOutlined, DollarOutlined, MinusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { User, CreateUserDto } from '@/types';
import dayjs from 'dayjs';
import {
  useUsers,
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useToggleUserStatus
} from '@/hooks/useUsers';
import * as userService from '@/services/user';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { EnhancedErrorAlert, type EnhancedError } from '@/components/EnhancedErrorAlert';

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
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [balanceType, setBalanceType] = useState<'recharge' | 'deduct'>('recharge');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceError, setBalanceError] = useState<EnhancedError | null>(null);

  const [form] = Form.useForm();
  const [balanceForm] = Form.useForm();

  // 使用异步操作hook
  const { execute: executeBalanceOperation } = useAsyncOperation();

  // ✅ 使用 React Query hooks 替换手动状态管理
  const params = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const { data, isLoading } = useUsers(params);

  // Mutations
  const createMutation = useCreateUser();
  const deleteMutation = useDeleteUser();
  const updateMutation = useUpdateUser();
  const toggleStatusMutation = useToggleUserStatus();

  const users = data?.data || [];
  const total = data?.total || 0;

  // ✅ useMemo 优化状态映射
  const statusMap = useMemo(() => ({
    active: { color: 'green', text: '正常' },
    inactive: { color: 'default', text: '未激活' },
    banned: { color: 'red', text: '已封禁' },
  }), []);

  // ✅ useCallback 优化事件处理函数
  const handleCreate = useCallback(async (values: CreateUserDto) => {
    await createMutation.mutateAsync(values);
    setCreateModalVisible(false);
    form.resetFields();
  }, [createMutation, form]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  const handleUpdateStatus = useCallback(async (id: string, status: 'active' | 'inactive' | 'banned') => {
    await updateMutation.mutateAsync({ id, data: { status } });
  }, [updateMutation]);

  const handleBalanceOperation = useCallback(async (values: { amount: number; reason?: string }) => {
    if (!selectedUser) return;

    setBalanceError(null);

    await executeBalanceOperation(
      async () => {
        if (balanceType === 'recharge') {
          await userService.rechargeBalance(selectedUser.id, values.amount);
        } else {
          await userService.deductBalance(selectedUser.id, values.amount, values.reason || '管理员扣减');
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
            userMessage: response?.userMessage || (balanceType === 'recharge' ? '充值失败，请稍后重试' : '扣减失败，请稍后重试'),
            code: response?.errorCode || error.response?.status?.toString(),
            requestId: response?.requestId,
            recoverySuggestions: response?.recoverySuggestions || [
              {
                action: '检查余额',
                description: balanceType === 'deduct' ? '确认用户余额是否充足' : '确认充值金额是否正确',
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
  }, [selectedUser, balanceType, balanceForm, createMutation, executeBalanceOperation]);

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

  // ✅ useMemo 优化表格列配置
  const columns: ColumnsType<User> = useMemo(() => [
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
        </Space>
      ),
    },
  ], [statusMap, openRecharge, openDeduct, handleUpdateStatus, handleDelete]);

  return (
    <div>
      <h2>用户管理</h2>

      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          创建用户
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={isLoading}
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

          <Form.Item
            label="金额"
            name="amount"
            rules={[{ required: true, message: '请输入金额' }]}
          >
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
    </div>
  );
};

export default UserList;
