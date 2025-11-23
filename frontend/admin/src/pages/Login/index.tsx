import { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, Input, Button, Typography, Divider, Space, Checkbox, Skeleton } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  CloudOutlined,
  SafetyCertificateOutlined,
  MobileOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from '@tsparticles/engine';
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

// 打字机效果 Hook
const useTypewriter = (text: string, speed: number = 50) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayText, isComplete };
};

// 粒子配置
const particlesOptions: ISourceOptions = {
  fullScreen: false,
  background: { color: { value: 'transparent' } },
  fpsLimit: 60,
  particles: {
    color: { value: '#4facfe' },
    links: {
      color: '#4facfe',
      distance: 150,
      enable: true,
      opacity: 0.3,
      width: 1,
    },
    move: {
      enable: true,
      speed: 1,
      direction: 'none',
      random: true,
      straight: false,
      outModes: { default: 'bounce' },
    },
    number: {
      density: { enable: true, area: 800 },
      value: 60,
    },
    opacity: { value: 0.5 },
    shape: { type: 'circle' },
    size: { value: { min: 1, max: 3 } },
  },
  detectRetina: true,
};

const Login = () => {
  const [form] = Form.useForm();
  const [particlesInit, setParticlesInit] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {
    captchaSvg,
    captchaLoading,
    fetchCaptcha,
    loginLoading,
    loginError,
    setLoginError,
    handleLogin,
    twoFactorModalVisible,
    twoFactorToken,
    twoFactorLoading,
    twoFactorError,
    setTwoFactorToken,
    setTwoFactorError,
    handleTwoFactorVerify,
    handleTwoFactorCancel,
  } = useLogin();

  // 初始化粒子引擎
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setParticlesInit(true);
    });
  }, []);

  // 模拟页面加载
  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // 打字机效果文字
  const description = '企业级云端 Android 设备管理解决方案，支持大规模部署、智能调度、实时监控';
  const { displayText, isComplete } = useTypewriter(description, 40);

  const onFinish = async (values: LoginForm) => {
    const success = await handleLogin(values, () => form.setFieldValue('captcha', ''));
    if (success) {
      setLoginSuccess(true);
    }
  };

  // 平台特性
  const features = useMemo(() => [
    { icon: <MobileOutlined />, text: '云端设备管理' },
    { icon: <GlobalOutlined />, text: '全球节点部署' },
    { icon: <SafetyCertificateOutlined />, text: '企业级安全' },
  ], []);

  // 骨架屏加载中
  if (pageLoading) {
    return (
      <div className="login-page">
        <div className="login-brand">
          <div className="brand-content">
            <Skeleton.Avatar active size={60} style={{ marginBottom: 20 }} />
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        </div>
        <div className="login-form-section glass-effect">
          <div className="login-form-container">
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        </div>
      </div>
    );
  }

  // 登录成功动画
  if (loginSuccess) {
    return (
      <div className="login-page">
        <div className="login-success-overlay">
          <div className="success-content">
            <CheckCircleOutlined className="success-icon" />
            <Title level={3} style={{ color: '#fff', marginTop: 20 }}>登录成功</Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)' }}>正在跳转...</Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      {/* 左侧品牌区域 */}
      <div className="login-brand">
        {/* 粒子背景 */}
        {particlesInit && (
          <Particles
            id="tsparticles"
            options={particlesOptions}
            className="particles-bg"
          />
        )}

        <div className="brand-content">
          <div className="brand-logo">
            <CloudOutlined className="logo-icon" />
            <span className="logo-text">CloudPhone</span>
          </div>
          <Title level={2} className="brand-title">
            云手机管理平台
          </Title>
          <Paragraph className="brand-description typewriter">
            {displayText}
            {!isComplete && <span className="cursor">|</span>}
          </Paragraph>

          {/* 3D 手机展示 */}
          <div className="phone-3d-container">
            <div className="phone-3d">
              <div className="phone-screen">
                <div className="phone-status-bar">
                  <span>9:41</span>
                  <span>⚡ 100%</span>
                </div>
                <div className="phone-app-grid">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="phone-app-icon" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="brand-features">
            {features.map((feature, index) => (
              <div key={index} className="feature-item" style={{ animationDelay: `${index * 0.1}s` }}>
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

      {/* 右侧登录表单 - 玻璃拟态 */}
      <div className="login-form-section glass-effect">
        <div className="login-form-container">
          <div className="form-header">
            <Title level={3} className="form-title">管理员登录</Title>
            <Text type="secondary" className="form-subtitle">
              请使用管理员账号登录系统
            </Text>
          </div>

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
              label={<span className={`floating-label ${focusedField === 'username' ? 'focused' : ''}`}>用户名</span>}
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined className="input-icon" />}
                placeholder="请输入用户名"
                autoComplete="username"
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className={`floating-label ${focusedField === 'password' ? 'focused' : ''}`}>密码</span>}
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="input-icon" />}
                placeholder="请输入密码"
                autoComplete="current-password"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
            </Form.Item>

            <Form.Item
              name="captcha"
              label={<span className={`floating-label ${focusedField === 'captcha' ? 'focused' : ''}`}>验证码</span>}
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
