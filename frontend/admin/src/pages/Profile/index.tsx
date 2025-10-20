import { useState, useEffect } from 'react';
import { Card, Descriptions, Button, Form, Input, Modal, message, Row, Col, Space } from 'antd';
import { EditOutlined, LockOutlined, UserOutlined, MailOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import TwoFactorSettings from '@/components/TwoFactorSettings';

interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
  twoFactorEnabled?: boolean;
  createdAt: string;
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordForm] = Form.useForm();

  const loadUser = async () => {
    setLoading(true);
    try {
      // 从localStorage获取用户信息
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
      }
    } catch (error) {
      message.error('加载用户信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const handleChangePassword = async (values: { oldPassword: string; newPassword: string }) => {
    try {
      // TODO: 调用修改密码API
      message.success('密码修改成功，请重新登录');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
      // 退出登录
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } catch (error) {
      message.error('密码修改失败');
    }
  };

  if (!user) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <h2>个人中心</h2>

      <Card
        title="基本信息"
        loading={loading}
        style={{ marginBottom: 24 }}
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="用户名" span={1}>
            <Space>
              <UserOutlined />
              {user.username}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="邮箱" span={1}>
            <Space>
              <MailOutlined />
              {user.email}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="角色" span={1}>
            {user.role || '管理员'}
          </Descriptions.Item>
          <Descriptions.Item label="注册时间" span={1}>
            {user.createdAt ? dayjs(user.createdAt).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="安全设置">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <h4>修改密码</h4>
            <Button
              icon={<LockOutlined />}
              onClick={() => setPasswordModalVisible(true)}
            >
              修改密码
            </Button>
          </div>
        </Space>
      </Card>

      {/* 2FA设置 */}
      <TwoFactorSettings
        isEnabled={user?.twoFactorEnabled || false}
        onStatusChange={() => {
          loadUser();
        }}
      />

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
