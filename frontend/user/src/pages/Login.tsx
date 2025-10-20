import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Tabs, Row, Col, Modal } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, SafetyOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login, register, getCaptcha } from '@/services/auth';
import { verify2FA } from '@/services/twoFactor';
import type { LoginDto, RegisterDto } from '@/types';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [twoFactorModalVisible, setTwoFactorModalVisible] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [loginCredentials, setLoginCredentials] = useState<any>(null);

  // 获取验证码
  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const data = await getCaptcha();
      setCaptchaId(data.id);
      setCaptchaSvg(data.svg);
    } catch (error) {
      message.error('获取验证码失败');
    } finally {
      setCaptchaLoading(false);
    }
  };

  // 页面加载时获取验证码
  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleLogin = async (values: Omit<LoginDto, 'captchaId'>) => {
    setLoading(true);
    try {
      const result: any = await login({
        ...values,
        captchaId,
      });
      console.log('Login result:', result);

      // 检查是否需要2FA验证
      if (result.requiresTwoFactor) {
        message.info(result.message || '请输入双因素认证代码');
        setLoginCredentials({ ...values, captchaId });
        setTwoFactorModalVisible(true);
        setLoading(false);
        return;
      }

      // 正常登录流程
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      message.success('登录成功');
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      message.error(error.response?.data?.message || '登录失败');
      // 登录失败后刷新验证码
      fetchCaptcha();
      loginForm.setFieldValue('captcha', '');
    } finally {
      setLoading(false);
    }
  };

  // 处理2FA验证
  const handle2FAVerify = async () => {
    if (!twoFactorToken || twoFactorToken.length !== 6) {
      message.error('请输入6位验证码');
      return;
    }

    setLoading(true);
    try {
      const result = await verify2FA({
        ...loginCredentials,
        twoFactorToken,
      });

      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      message.success('登录成功');
      setTwoFactorModalVisible(false);
      setTwoFactorToken('');
      navigate('/');
    } catch (error: any) {
      message.error(error.response?.data?.message || '验证码错误');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: RegisterDto) => {
    setLoading(true);
    try {
      await register(values);
      message.success('注册成功，请登录');
      registerForm.resetFields();
      // 切换到登录 Tab
    } catch (error) {
      message.error('注册失败');
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'login',
      label: '登录',
      children: (
        <Form form={loginForm} onFinish={handleLogin} size="large">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item
            name="captcha"
            rules={[
              { required: true, message: '请输入验证码' },
              { len: 4, message: '验证码为4位' },
            ]}
          >
            <Row gutter={8}>
              <Col span={14}>
                <Input
                  prefix={<SafetyOutlined />}
                  placeholder="验证码"
                  maxLength={4}
                  autoComplete="off"
                />
              </Col>
              <Col span={10}>
                <div
                  onClick={fetchCaptcha}
                  style={{
                    height: 40,
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                  }}
                >
                  {captchaLoading ? (
                    <ReloadOutlined spin style={{ fontSize: 20, color: '#1890ff' }} />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: captchaSvg }} />
                  )}
                </div>
              </Col>
            </Row>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'register',
      label: '注册',
      children: (
        <Form form={registerForm} onFinish={handleRegister} size="large">
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="邮箱"
            />
          </Form.Item>

          <Form.Item name="phone">
            <Input
              prefix={<PhoneOutlined />}
              placeholder="手机号（可选）"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="确认密码"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              注册
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>
            云手机平台
          </h1>
          <p style={{ color: '#999', marginTop: 8 }}>
            随时随地，轻松使用云端手机
          </p>
        </div>

        <Tabs items={tabItems} centered />
      </Card>

      {/* 2FA验证Modal */}
      <Modal
        title="双因素认证"
        open={twoFactorModalVisible}
        onCancel={() => {
          setTwoFactorModalVisible(false);
          setTwoFactorToken('');
          setLoginCredentials(null);
        }}
        onOk={handle2FAVerify}
        okText="验证"
        cancelText="取消"
        okButtonProps={{ loading }}
      >
        <div style={{ padding: '20px 0' }}>
          <p style={{ marginBottom: 16, color: '#666' }}>
            请输入验证器应用中显示的6位验证码
          </p>
          <Input
            placeholder="请输入6位验证码"
            value={twoFactorToken}
            onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ''))}
            maxLength={6}
            size="large"
            prefix={<SafetyOutlined />}
            autoFocus
            onPressEnter={handle2FAVerify}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Login;
