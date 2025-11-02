import { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Form,
  Input,
  Modal,
  message,
  Row,
  Col,
  Space,
  Select,
  Radio,
  Divider,
} from 'antd';
import {
  EditOutlined,
  LockOutlined,
  UserOutlined,
  MailOutlined,
  GlobalOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import TwoFactorSettings from '@/components/TwoFactorSettings';
import request from '@/utils/request';

interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
  twoFactorEnabled?: boolean;
  createdAt: string;
  language?: string;
  theme?: string;
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);
  const [passwordForm] = Form.useForm();
  const [preferencesForm] = Form.useForm();

  const loadUser = async () => {
    setLoading(true);
    try {
      // 从localStorage获取用户信息
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);

        // 从metadata中提取语言和主题设置
        if (userData.metadata) {
          userData.language = userData.metadata.language || 'zh-CN';
          userData.theme = userData.metadata.theme || 'auto';
        } else {
          userData.language = 'zh-CN';
          userData.theme = 'auto';
        }

        setUser(userData);

        // 应用主题设置
        applyTheme(userData.theme);
      }
    } catch (error) {
      message.error('加载用户信息失败');
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (theme: string) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (theme === 'auto') {
      // 跟随系统主题
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const handleChangePassword = async (values: { oldPassword: string; newPassword: string }) => {
    try {
      const userId = user?.id;
      if (!userId) {
        message.error('用户信息获取失败');
        return;
      }

      // 调用后端 API 修改密码
      await request.post(`/users/${userId}/change-password`, {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });

      message.success('密码修改成功，请重新登录');
      setPasswordModalVisible(false);
      passwordForm.resetFields();

      // 清除本地存储并退出登录
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');

      // 延迟跳转到登录页
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } catch (error) {
      message.error('密码修改失败，请检查原密码是否正确');
      console.error('Failed to change password:', error);
    }
  };

  const handleSavePreferences = async (values: { language: string; theme: string }) => {
    try {
      const userId = user?.id;
      if (!userId) {
        message.error('用户信息获取失败');
        return;
      }

      // 调用后端 API 保存偏好设置
      const response = await request.patch(`/users/${userId}/preferences`, {
        language: values.language,
        theme: values.theme,
      });

      // 更新本地用户信息（从后端响应中获取更新后的用户数据）
      if (response.data) {
        const updatedUser = {
          ...user,
          language: values.language,
          theme: values.theme,
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      // 应用主题设置
      applyTheme(values.theme);

      message.success('偏好设置保存成功');
      setPreferencesModalVisible(false);
    } catch (error) {
      message.error('保存偏好设置失败');
      console.error('Failed to save preferences:', error);
    }
  };

  if (!user) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <h2>个人中心</h2>

      <Card title="基本信息" loading={loading} style={{ marginBottom: 24 }}>
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

      <Card title="偏好设置" style={{ marginBottom: 24 }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="语言" span={1}>
            <Space>
              <GlobalOutlined />
              {user.language === 'zh-CN'
                ? '简体中文'
                : user.language === 'en-US'
                  ? 'English'
                  : '简体中文'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="主题" span={1}>
            <Space>
              <BgColorsOutlined />
              {user.theme === 'dark'
                ? '深色模式'
                : user.theme === 'light'
                  ? '浅色模式'
                  : '跟随系统'}
            </Space>
          </Descriptions.Item>
        </Descriptions>
        <Button
          icon={<EditOutlined />}
          onClick={() => {
            preferencesForm.setFieldsValue({
              language: user.language || 'zh-CN',
              theme: user.theme || 'auto',
            });
            setPreferencesModalVisible(true);
          }}
          style={{ marginTop: 16 }}
        >
          修改偏好设置
        </Button>
      </Card>

      <Card title="安全设置">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <h4>修改密码</h4>
            <Button icon={<LockOutlined />} onClick={() => setPasswordModalVisible(true)}>
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

      {/* 偏好设置对话框 */}
      <Modal
        title="偏好设置"
        open={preferencesModalVisible}
        onCancel={() => {
          setPreferencesModalVisible(false);
          preferencesForm.resetFields();
        }}
        onOk={() => preferencesForm.submit()}
        width={600}
      >
        <Form form={preferencesForm} onFinish={handleSavePreferences} layout="vertical">
          <Form.Item
            label="界面语言"
            name="language"
            rules={[{ required: true, message: '请选择界面语言' }]}
          >
            <Select>
              <Select.Option value="zh-CN">🇨🇳 简体中文</Select.Option>
              <Select.Option value="en-US">🇺🇸 English</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="主题风格"
            name="theme"
            rules={[{ required: true, message: '请选择主题风格' }]}
          >
            <Radio.Group>
              <Radio.Button value="auto">
                <Space>
                  <BgColorsOutlined />
                  跟随系统
                </Space>
              </Radio.Button>
              <Radio.Button value="light">
                <Space>☀️ 浅色模式</Space>
              </Radio.Button>
              <Radio.Button value="dark">
                <Space>🌙 深色模式</Space>
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Divider />

          <Form.Item>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ color: '#666' }}>💡 提示：</div>
              <ul style={{ color: '#666', paddingLeft: 20, margin: 0 }}>
                <li>语言设置将影响整个管理后台的界面语言</li>
                <li>深色模式可以减轻眼睛疲劳，适合在夜间使用</li>
                <li>跟随系统将根据您的操作系统主题自动切换</li>
              </ul>
            </Space>
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
