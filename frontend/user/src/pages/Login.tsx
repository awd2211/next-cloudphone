import { Card, Tabs, Space, Typography } from 'antd';
import { LoginForm, RegisterForm, TwoFactorModal } from '@/components/Auth';
import { useLogin } from '@/hooks/useLogin';
import { RocketOutlined, SafetyOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const Login = () => {
  const {
    loginForm,
    registerForm,
    loading,
    captchaSvg,
    captchaLoading,
    twoFactorModalVisible,
    twoFactorToken,
    handleLogin,
    handleRegister,
    fetchCaptcha,
    handle2FAVerify,
    handle2FACancel,
    setTwoFactorToken,
    handleSocialAuth,
  } = useLogin();

  const tabItems = [
    {
      key: 'login',
      label: '登录',
      children: (
        <LoginForm
          form={loginForm}
          loading={loading}
          captchaSvg={captchaSvg}
          captchaLoading={captchaLoading}
          onFinish={handleLogin}
          onRefreshCaptcha={fetchCaptcha}
          onSocialLogin={handleSocialAuth}
        />
      ),
    },
    {
      key: 'register',
      label: '注册',
      children: (
        <RegisterForm
          form={registerForm}
          loading={loading}
          onFinish={handleRegister}
        />
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
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>
        {`
          @keyframes float {
            0%, 100% {
              transform: translateY(0) rotate(0deg);
            }
            50% {
              transform: translateY(-20px) rotate(5deg);
            }
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-50px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes pulse {
            0%, 100% {
              opacity: 0.4;
              transform: scale(1);
            }
            50% {
              opacity: 0.6;
              transform: scale(1.1);
            }
          }
          .login-card {
            animation: fadeIn 0.6s ease-out;
          }
          .feature-item {
            animation: slideInLeft 0.6s ease-out;
            opacity: 0;
            animation-fill-mode: forwards;
          }
          .feature-item:nth-child(1) { animation-delay: 0.2s; }
          .feature-item:nth-child(2) { animation-delay: 0.3s; }
          .feature-item:nth-child(3) { animation-delay: 0.4s; }
        `}
      </style>

      {/* 背景装饰圆圈 */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float 8s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float 6s ease-in-out infinite reverse',
        }}
      />

      {/* 左侧信息区 */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1200,
          width: '100%',
          padding: '0 40px',
          display: 'flex',
          alignItems: 'center',
          gap: 80,
        }}
      >
        {/* 左侧品牌介绍 */}
        <div style={{ flex: 1, color: '#fff' }}>
          <div style={{ marginBottom: 48 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 20px',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                borderRadius: 24,
                marginBottom: 24,
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              <RocketOutlined style={{ marginRight: 8, fontSize: 16 }} />
              <Text style={{ color: '#fff', fontWeight: 500 }}>企业级云手机平台</Text>
            </div>

            <Title level={1} style={{ color: '#fff', fontSize: 56, fontWeight: 700, marginBottom: 16, lineHeight: 1.2 }}>
              Ultrathink
            </Title>
            <Title level={2} style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: 32, fontWeight: 600, marginBottom: 24 }}>
              云端手机，触手可及
            </Title>
            <Paragraph style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 18, marginBottom: 0, lineHeight: 1.8 }}>
              全球领先的云手机管理平台，为您提供稳定、安全、高效的云端Android设备服务
            </Paragraph>
          </div>

          {/* 特性列表 */}
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {[
              { icon: <ThunderboltOutlined />, title: '秒级部署', desc: '一键创建云手机，立即使用' },
              { icon: <SafetyOutlined />, title: '安全可靠', desc: '企业级安全保障，数据加密存储' },
              { icon: <RocketOutlined />, title: '弹性扩展', desc: '按需付费，灵活扩展设备数量' },
            ].map((item, index) => (
              <div
                key={index}
                className="feature-item"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '16px 20px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                    fontSize: 24,
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ color: '#fff', fontSize: 16, display: 'block', marginBottom: 4 }}>
                    {item.title}
                  </Text>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: 14 }}>
                    {item.desc}
                  </Text>
                </div>
              </div>
            ))}
          </Space>
        </div>

        {/* 右侧登录卡片 */}
        <Card
          className="login-card"
          style={{
            width: 460,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            borderRadius: 16,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
          bodyStyle={{ padding: 40 }}
        >
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              }}
            >
              <span style={{ fontSize: 32, fontWeight: 'bold', color: '#fff' }}>U</span>
            </div>
            <Title level={3} style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
              欢迎回来
            </Title>
            <Paragraph style={{ color: '#64748b', marginTop: 8, marginBottom: 0 }}>
              登录您的账号以继续使用
            </Paragraph>
          </div>

          <Tabs items={tabItems} centered size="large" />
        </Card>
      </div>

      <TwoFactorModal
        visible={twoFactorModalVisible}
        loading={loading}
        token={twoFactorToken}
        onTokenChange={setTwoFactorToken}
        onVerify={handle2FAVerify}
        onCancel={handle2FACancel}
      />
    </div>
  );
};

export default Login;
