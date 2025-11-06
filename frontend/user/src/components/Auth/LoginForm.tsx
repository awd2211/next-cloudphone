import React from 'react';
import { Form, Input, Button, FormInstance, Checkbox, Divider } from 'antd';
import { UserOutlined, LockOutlined, GoogleOutlined, FacebookOutlined, TwitterOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { CaptchaInput } from './CaptchaInput';
import type { LoginDto, SocialProvider } from '@/types';

interface LoginFormProps {
  form: FormInstance;
  loading: boolean;
  captchaSvg: string;
  captchaLoading: boolean;
  onFinish: (values: Omit<LoginDto, 'captchaId'>) => void;
  onRefreshCaptcha: () => void;
  onSocialLogin?: (provider: SocialProvider) => void;
}

/**
 * 登录表单组件（优化版）
 * 包含用户名、密码、验证码输入和社交登录选项
 */
export const LoginForm: React.FC<LoginFormProps> = React.memo(({
  form,
  loading,
  captchaSvg,
  captchaLoading,
  onFinish,
  onRefreshCaptcha,
  onSocialLogin,
}) => {
  const handleSocialLogin = (provider: SocialProvider) => {
    if (onSocialLogin) {
      onSocialLogin(provider);
    } else {
      console.log(`${provider} 登录`);
    }
  };

  return (
    <div>
      <style>
        {`
          .login-form .ant-input-affix-wrapper,
          .login-form .ant-input {
            border-radius: 10px;
            border: 1.5px solid #e2e8f0;
            transition: all 0.3s;
          }
          .login-form .ant-input-affix-wrapper:hover,
          .login-form .ant-input:hover {
            border-color: #6366f1;
          }
          .login-form .ant-input-affix-wrapper-focused,
          .login-form .ant-input:focus {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          }
          .login-form .ant-btn-primary {
            height: 48px;
            border-radius: 10px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border: none;
            font-size: 16px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            transition: all 0.3s;
          }
          .login-form .ant-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
          }
          .social-login-btn {
            height: 44px;
            border-radius: 10px;
            border: 1.5px solid #e2e8f0;
            font-weight: 500;
            transition: all 0.3s;
          }
          .social-login-btn:hover {
            border-color: #6366f1;
            color: #6366f1;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          }
        `}
      </style>

      <Form form={form} onFinish={onFinish} size="large" className="login-form">
        <Form.Item
          name="username"
          rules={[{ required: true, message: '请输入用户名或邮箱' }]}
        >
          <Input
            prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
            placeholder="用户名或邮箱"
            style={{ height: 48 }}
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
            placeholder="密码"
            style={{ height: 48 }}
          />
        </Form.Item>

        <CaptchaInput
          captchaSvg={captchaSvg}
          captchaLoading={captchaLoading}
          onRefresh={onRefreshCaptcha}
        />

        <Form.Item>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Checkbox defaultChecked>
              <span style={{ fontSize: 14, color: '#64748b' }}>记住我</span>
            </Checkbox>
            <Link to="/forgot-password" style={{ fontSize: 14, color: '#6366f1', fontWeight: 500 }}>
              忘记密码？
            </Link>
          </div>
          <Button type="primary" htmlType="submit" block loading={loading}>
            立即登录
          </Button>
        </Form.Item>

        <Divider style={{ margin: '24px 0', fontSize: 13, color: '#94a3b8' }}>
          或使用以下方式登录
        </Divider>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button
            className="social-login-btn"
            icon={<GoogleOutlined style={{ fontSize: 18, color: '#4285f4' }} />}
            onClick={() => handleSocialLogin('google')}
            block
          >
            <span style={{ marginLeft: 8, color: '#334155', fontWeight: 500 }}>使用 Google 登录</span>
          </Button>
          <Button
            className="social-login-btn"
            icon={<FacebookOutlined style={{ fontSize: 18, color: '#1877f2' }} />}
            onClick={() => handleSocialLogin('facebook')}
            block
          >
            <span style={{ marginLeft: 8, color: '#334155', fontWeight: 500 }}>使用 Facebook 登录</span>
          </Button>
          <Button
            className="social-login-btn"
            icon={<TwitterOutlined style={{ fontSize: 18, color: '#1da1f2' }} />}
            onClick={() => handleSocialLogin('twitter')}
            block
          >
            <span style={{ marginLeft: 8, color: '#334155', fontWeight: 500 }}>使用 X 登录</span>
          </Button>
        </div>
      </Form>
    </div>
  );
});

LoginForm.displayName = 'LoginForm';
