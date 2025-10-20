import { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Form, Input, Modal, message, Row, Col, Statistic, Space } from 'antd';
import { EditOutlined, LockOutlined, DollarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/services/auth';
import { updateProfile, changePassword, getBalance } from '@/services/user';
import type { User } from '@/types';
import dayjs from 'dayjs';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const loadUser = async () => {
    setLoading(true);
    try {
      const data = await getCurrentUser();
      setUser(data);
    } catch (error) {
      message.error('加载用户信息失败');
    } finally {
      setLoading(false);
    }
  };

  const loadBalance = async () => {
    try {
      const data = await getBalance();
      setBalance(data.balance);
    } catch (error) {
      console.error('加载余额失败', error);
    }
  };

  useEffect(() => {
    loadUser();
    loadBalance();
  }, []);

  const handleUpdateProfile = async (values: { email?: string; phone?: string }) => {
    try {
      const updatedUser = await updateProfile(values);
      setUser(updatedUser);
      message.success('更新成功');
      setEditModalVisible(false);
      editForm.resetFields();
    } catch (error) {
      message.error('更新失败');
    }
  };

  const handleChangePassword = async (values: { oldPassword: string; newPassword: string }) => {
    try {
      await changePassword(values);
      message.success('密码修改成功，请重新登录');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
      // 退出登录
      localStorage.removeItem('token');
      window.location.href = '/login';
    } catch (error) {
      message.error('密码修改失败');
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      active: { color: 'green', text: '正常' },
      inactive: { color: 'orange', text: '未激活' },
      banned: { color: 'red', text: '已封禁' },
    };
    return statusMap[status] || { color: 'default', text: status };
  };

  if (!user) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <h2>个人中心</h2>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Statistic
              title="账户余额"
              value={balance}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#3f8600' }}
            />
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                icon={<DollarOutlined />}
                onClick={() => navigate('/recharge')}
              >
                充值
              </Button>
              <Button
                icon={<ClockCircleOutlined />}
                onClick={() => navigate('/usage')}
              >
                使用记录
              </Button>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic title="账户状态" value={getStatusTag(user.status).text} />
          </Card>
        </Col>
      </Row>

      <Card
        title="基本信息"
        extra={
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              editForm.setFieldsValue({
                email: user.email,
                phone: user.phone,
              });
              setEditModalVisible(true);
            }}
          >
            编辑
          </Button>
        }
        loading={loading}
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
          <Descriptions.Item label="手机号">{user.phone || '未设置'}</Descriptions.Item>
          <Descriptions.Item label="余额">¥{user.balance.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="注册时间">
            {dayjs(user.createdAt).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="安全设置" style={{ marginTop: 24 }}>
        <Button
          icon={<LockOutlined />}
          onClick={() => setPasswordModalVisible(true)}
        >
          修改密码
        </Button>
      </Card>

      {/* 编辑信息对话框 */}
      <Modal
        title="编辑个人信息"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
      >
        <Form form={editForm} onFinish={handleUpdateProfile} layout="vertical">
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="手机号" name="phone">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改密码对话框 */}
      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          passwordForm.resetFields();
        }}
        onOk={() => passwordForm.submit()}
      >
        <Form form={passwordForm} onFinish={handleChangePassword} layout="vertical">
          <Form.Item
            label="当前密码"
            name="oldPassword"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label="确认新密码"
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
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Profile;
