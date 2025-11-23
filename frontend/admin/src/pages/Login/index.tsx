import { Form, Input, Button, Typography, Divider, Space, Checkbox } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  CloudOutlined,
  SafetyCertificateOutlined,
  MobileOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { CaptchaInput, TwoFactorModal, useLogin } from '@/components/Login';
import ErrorAlert from '@/components/ErrorAlert';
import './index.css';

const { Title, Text, Paragraph } = Typography;

interface LoginForm {
  username: string;
  password: string;
  captcha: string;
  remember?: boolean;
}

const Login = () => {
  const [form] = Form.useForm();

  const {
    // 验证码相关
    captchaSvg,
    captchaLoading,
    fetchCaptcha,

    // 登录相关
    loginLoading,
    loginError,
    setLoginError,
    handleLogin,

    // 2FA 相关
    twoFactorModalVisible,
    twoFactorToken,
    twoFactorLoading,
    twoFactorError,
    setTwoFactorToken,
    setTwoFactorError,
    handleTwoFactorVerify,
    handleTwoFactorCancel,
  } = useLogin();

  const onFinish = async (values: LoginForm) => {
    await handleLogin(values, () => form.setFieldValue('captcha', ''));
  };

  // 平台特性
  const features = [
    { icon: <MobileOutlined />, text: '云端设备管理' },
    { icon: <GlobalOutlined />, text: '全球节点部署' },
    { icon: <SafetyCertificateOutlined />, text: '企业级安全' },
  ];

  return (
    <div className="login-page">
      {/* 左侧品牌区域 */}
      <div className="login-brand">
        <div className="brand-content">
          <div className="brand-logo">
            <CloudOutlined className="logo-icon" />
            <span className="logo-text">CloudPhone</span>
          </div>
          <Title level={2} className="brand-title">
            云手机管理平台
          </Title>
          <Paragraph className="brand-description">
            企业级云端 Android 设备管理解决方案，支持大规模部署、智能调度、实时监控
          </Paragraph>
          <div className="brand-features">
            {features.map((feature, index) => (
              <div key={index} className="feature-item">
                <span className="feature-icon">{feature.icon}</span>
                <span className="feature-text">{feature.text}</span>
              </div>
            ))}
          </div>
          <div className="brand-stats">
            <div className="stat-item">
              <div className="stat-value">10,000+</div>
              <div className="stat-label">设备在线</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">99.9%</div>
              <div className="stat-label">服务可用性</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">24/7</div>
              <div className="stat-label">技术支持</div>
            </div>
          </div>
        </div>
        <div className="brand-footer">
          <Text className="copyright">© 2024 CloudPhone Platform. All rights reserved.</Text>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="login-form-section">
        <div className="login-form-container">
          <div className="form-header">
            <Title level={3} className="form-title">管理员登录</Title>
            <Text type="secondary" className="form-subtitle">
              请使用管理员账号登录系统
            </Text>
          </div>

          {/* 登录错误提示 */}
          {loginError && (
            <ErrorAlert
              error={loginError}
              onClose={() => setLoginError(null)}
              onRetry={() => form.submit()}
              style={{ marginBottom: 20 }}
            />
          )}

          <Form
            form={form}
            onFinish={onFinish}
            size="large"
            layout="vertical"
            className="login-form"
            initialValues={{ remember: true }}
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined className="input-icon" />}
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="input-icon" />}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item
              name="captcha"
              label="验证码"
              rules={[
                { required: true, message: '请输入验证码' },
                { len: 4, message: '验证码为4位' },
              ]}
            >
              <CaptchaInput
                captchaSvg={captchaSvg}
                captchaLoading={captchaLoading}
                onRefresh={fetchCaptcha}
              />
            </Form.Item>

            <Form.Item>
              <div className="form-extra">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>记住我</Checkbox>
                </Form.Item>
                <a className="forgot-link" href="#" onClick={(e) => e.preventDefault()}>
                  忘记密码?
                </a>
              </div>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loginLoading}
                className="login-button"
              >
                {loginLoading ? '登录中...' : '登 录'}
              </Button>
            </Form.Item>
          </Form>

          <Divider plain>
            <Text type="secondary" style={{ fontSize: 12 }}>安全登录</Text>
          </Divider>

          <div className="security-tips">
            <Space direction="vertical" size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                本系统采用 HTTPS 加密传输
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <LockOutlined style={{ marginRight: 6 }} />
                支持双因素认证 (2FA)
              </Text>
            </Space>
          </div>
        </div>
      </div>

      {/* 2FA 验证 Modal */}
      <TwoFactorModal
        visible={twoFactorModalVisible}
        loading={twoFactorLoading}
        token={twoFactorToken}
        error={twoFactorError}
        onTokenChange={setTwoFactorToken}
        onVerify={handleTwoFactorVerify}
        onCancel={handleTwoFactorCancel}
        onErrorClose={() => setTwoFactorError(null)}
      />
    </div>
  );
};

export default Login;
