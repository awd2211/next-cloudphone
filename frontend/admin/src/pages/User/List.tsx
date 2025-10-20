import { useState, useEffect } from 'react';
import { Table, Tag, Space, Button, Modal, Form, Input, message, Popconfirm, InputNumber } from 'antd';
import { PlusOutlined, DollarOutlined, MinusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getUsers, createUser, deleteUser, updateUser, rechargeBalance, deductBalance } from '@/services/user';
import type { User, CreateUserDto } from '@/types';
import dayjs from 'dayjs';

const UserList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [balanceType, setBalanceType] = useState<'recharge' | 'deduct'>('recharge');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [balanceForm] = Form.useForm();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers({ page, pageSize });
      setUsers(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, pageSize]);

  const handleCreate = async (values: CreateUserDto) => {
    try {
      await createUser(values);
      message.success('创建用户成功');
      setCreateModalVisible(false);
      form.resetFields();
      loadUsers();
    } catch (error) {
      message.error('创建用户失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id);
      message.success('删除用户成功');
      loadUsers();
    } catch (error) {
      message.error('删除用户失败');
    }
  };

  const handleUpdateStatus = async (id: string, status: 'active' | 'inactive' | 'banned') => {
    try {
      await updateUser(id, { status });
      message.success('更新状态成功');
      loadUsers();
    } catch (error) {
      message.error('更新状态失败');
    }
  };

  const handleBalanceOperation = async (values: { amount: number; reason?: string }) => {
    if (!selectedUser) return;
    try {
      if (balanceType === 'recharge') {
        await rechargeBalance(selectedUser.id, values.amount);
        message.success('充值成功');
      } else {
        await deductBalance(selectedUser.id, values.amount, values.reason || '管理员扣减');
        message.success('扣减成功');
      }
      setBalanceModalVisible(false);
      balanceForm.resetFields();
      loadUsers();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns: ColumnsType<User> = [
    { title: '用户 ID', dataIndex: 'id', key: 'id', width: 100, ellipsis: true },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '手机号', dataIndex: 'phone', key: 'phone' },
    { title: '余额', dataIndex: 'balance', key: 'balance', render: (balance: number) => `¥${balance.toFixed(2)}` },
    { title: '角色', dataIndex: 'roles', key: 'roles', render: (roles: any[]) => <>{roles?.map((role) => <Tag key={role.id} color="blue">{role.name}</Tag>)}</> },
    { title: '状态', dataIndex: 'status', key: 'status', render: (status: string) => {
      const statusMap: Record<string, { color: string; text: string }> = {
        active: { color: 'green', text: '正常' },
        inactive: { color: 'default', text: '未激活' },
        banned: { color: 'red', text: '已封禁' },
      };
      const config = statusMap[status] || { color: 'default', text: status };
      return <Tag color={config.color}>{config.text}</Tag>;
    }},
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm') },
    { title: '操作', key: 'action', width: 250, fixed: 'right', render: (_, record) => (
      <Space size="small">
        <Button type="link" size="small" icon={<DollarOutlined />} onClick={() => { setSelectedUser(record); setBalanceType('recharge'); setBalanceModalVisible(true); }}>充值</Button>
        <Button type="link" size="small" icon={<MinusOutlined />} onClick={() => { setSelectedUser(record); setBalanceType('deduct'); setBalanceModalVisible(true); }}>扣减</Button>
        {record.status === 'active' && <Button type="link" size="small" danger onClick={() => handleUpdateStatus(record.id, 'banned')}>封禁</Button>}
        {record.status === 'banned' && <Button type="link" size="small" onClick={() => handleUpdateStatus(record.id, 'active')}>解封</Button>}
        <Popconfirm title="确定要删除这个用户吗?" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
          <Button type="link" size="small" danger>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <h2>用户管理</h2>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>创建用户</Button>
      </div>
      <Table columns={columns} dataSource={users} rowKey="id" loading={loading} pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: (total) => `共 ${total} 条`, onChange: (page, pageSize) => { setPage(page); setPageSize(pageSize); }}} scroll={{ x: 1200 }} />
      <Modal title="创建用户" open={createModalVisible} onCancel={() => { setCreateModalVisible(false); form.resetFields(); }} onOk={() => form.submit()} width={600}>
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}><Input placeholder="请输入用户名" /></Form.Item>
          <Form.Item label="邮箱" name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效的邮箱地址' }]}><Input placeholder="请输入邮箱" /></Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}><Input.Password placeholder="请输入密码" /></Form.Item>
          <Form.Item label="手机号" name="phone"><Input placeholder="请输入手机号" /></Form.Item>
        </Form>
      </Modal>
      <Modal title={balanceType === 'recharge' ? '充值余额' : '扣减余额'} open={balanceModalVisible} onCancel={() => { setBalanceModalVisible(false); balanceForm.resetFields(); }} onOk={() => balanceForm.submit()}>
        <Form form={balanceForm} onFinish={handleBalanceOperation} layout="vertical">
          <Form.Item label="当前余额"><Input value={`¥${selectedUser?.balance.toFixed(2) || 0}`} disabled /></Form.Item>
          <Form.Item label="金额" name="amount" rules={[{ required: true, message: '请输入金额' }]}><InputNumber min={0.01} precision={2} style={{ width: '100%' }} placeholder="请输入金额" prefix="¥" /></Form.Item>
          {balanceType === 'deduct' && <Form.Item label="原因" name="reason"><Input.TextArea placeholder="请输入扣减原因" rows={3} /></Form.Item>}
        </Form>
      </Modal>
    </div>
  );
};

export default UserList;
