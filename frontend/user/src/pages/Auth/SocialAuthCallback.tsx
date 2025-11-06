import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, Spin, Result, Typography } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { handleSocialAuthCallback } from '@/services/socialAuth';
import type { SocialProvider } from '@/types';

const { Title, Text, Paragraph } = Typography;

/**
 * 社交登录回调处理页面
 *
 * 处理从社交平台返回的授权码，完成登录流程
 * 路由: /auth/callback/:provider
 *
 * URL 参数:
 * - provider: 社交平台 (google, facebook, twitter, github, wechat)
 * - code: 授权码
 * - state: 状态参数（可选，用于防止 CSRF 攻击）
 * - error: 错误信息（当授权失败时）
 */
const SocialAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { provider } = useParams<{ provider: SocialProvider }>();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('正在处理登录...');
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const processCallback = async () => {
      // 检查是否有错误参数
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        setStatus('error');
        setMessage(errorDescription || `授权失败: ${error}`);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // 获取授权码
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (!code) {
        setStatus('error');
        setMessage('未获取到授权码');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!provider) {
        setStatus('error');
        setMessage('无效的社交登录平台');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // 调用后端 API 处理社交登录
        const result = await handleSocialAuthCallback(provider, {
          code,
          state: state || undefined,
        });

        // 保存 token 和用户信息
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));

        setStatus('success');
        setIsNewUser(result.isNewUser || false);
        setMessage(result.isNewUser ? '注册成功！欢迎加入' : '登录成功！');

        // 2秒后跳转到首页
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } catch (err: any) {
        console.error('Social auth callback error:', err);
        setStatus('error');
        setMessage(err.response?.data?.message || '登录失败，请重试');

        // 3秒后跳转回登录页
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    processCallback();
  }, [provider, searchParams, navigate]);

  const getProviderName = (provider?: SocialProvider): string => {
    if (!provider) return '社交账号';
    const names: Record<SocialProvider, string> = {
      google: 'Google',
      facebook: 'Facebook',
      twitter: 'X',
      github: 'GitHub',
      wechat: '微信',
    };
    return names[provider] || provider;
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div style={{ textAlign: 'center', padding: '60px 40px' }}>
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 48, color: '#6366f1' }} spin />}
              size="large"
            />
            <Title level={3} style={{ marginTop: 24, color: '#1f2937' }}>
              {getProviderName(provider)} 登录处理中
            </Title>
            <Paragraph style={{ color: '#6b7280', fontSize: 14 }}>
              正在验证您的身份信息，请稍候...
            </Paragraph>
          </div>
        );

      case 'success':
        return (
          <Result
            icon={<CheckCircleOutlined style={{ color: '#10b981' }} />}
            title={
              <Title level={3} style={{ color: '#1f2937', marginBottom: 0 }}>
                {message}
              </Title>
            }
            subTitle={
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: '#6b7280', display: 'block', marginBottom: 8 }}>
                  {isNewUser
                    ? `您已通过 ${getProviderName(provider)} 成功注册账号`
                    : `通过 ${getProviderName(provider)} 登录成功`}
                </Text>
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  即将跳转到控制台...
                </Text>
              </div>
            }
            style={{ padding: '40px 20px' }}
          />
        );

      case 'error':
        return (
          <Result
            icon={<CloseCircleOutlined style={{ color: '#ef4444' }} />}
            title={
              <Title level={3} style={{ color: '#1f2937', marginBottom: 0 }}>
                登录失败
              </Title>
            }
            subTitle={
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: '#ef4444', display: 'block', marginBottom: 8 }}>
                  {message}
                </Text>
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  即将返回登录页面...
                </Text>
              </div>
            }
            style={{ padding: '40px 20px' }}
          />
        );
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
      }}
    >
      {/* 背景装饰 */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <Card
        style={{
          width: '100%',
          maxWidth: 500,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          zIndex: 1,
        }}
        bodyStyle={{ padding: 0 }}
      >
        {renderContent()}
      </Card>
    </div>
  );
};

export default SocialAuthCallback;
