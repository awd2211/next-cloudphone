import React from 'react';
import { Form, Input, Button, FormInstance, Checkbox, Typography, Progress } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { RegisterDto } from '@/types';

const { Text } = Typography;

interface RegisterFormProps {
  form: FormInstance;
  loading: boolean;
  onFinish: (values: RegisterDto) => void;
}

/**
 * 注册表单组件（优化版）
 * 包含用户名、邮箱、手机号、密码和确认密码输入，以及密码强度提示
 */
export const RegisterForm: React.FC<RegisterFormProps> = React.memo(({
  form,
  loading,
  onFinish,
}) => {
  const [passwordStrength, setPasswordStrength] = React.useState(0);

  // 密码强度计算
  const calculatePasswordStrength = (password: string) => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 6) strength += 25;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 15;
    if (/[!@#$%^&*]/.test(password)) strength += 10;
    return Math.min(strength, 100);
  };

  const getPasswordStrengthColor = (strength: number) => {
    if (strength < 40) return '#ef4444';
    if (strength < 70) return '#f59e0b';
    return '#10b981';
  };

  const getPasswordStrengthText = (strength: number) => {
    if (strength < 40) return '弱';
    if (strength < 70) return '中';
    return '强';
  };

  return (
    <div>
      <style>
        {`
          .register-form .ant-input-affix-wrapper,
          .register-form .ant-input {
            border-radius: 10px;
            border: 1.5px solid #e2e8f0;
            transition: all 0.3s;
          }
          .register-form .ant-input-affix-wrapper:hover,
          .register-form .ant-input:hover {
            border-color: #6366f1;
          }
          .register-form .ant-input-affix-wrapper-focused,
          .register-form .ant-input:focus {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          }
          .register-form .ant-btn-primary {
            height: 48px;
            border-radius: 10px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border: none;
            font-size: 16px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            transition: all 0.3s;
          }
          .register-form .ant-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
          }
          .feature-list {
            margin-bottom: 20px;
            padding: 16px;
            background: #f8fafc;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
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

      <Form form={form} onFinish={onFinish} size="large" className="register-form">
        <Form.Item
          name="username"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' },
            { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
          ]}
        >
          <Input
            prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
            placeholder="用户名（3-20个字符）"
            style={{ height: 48 }}
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
            prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
            placeholder="邮箱地址"
            style={{ height: 48 }}
          />
        </Form.Item>

        <Form.Item
          name="phone"
          rules={[
            { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
          ]}
        >
          <Input
            prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
            placeholder="手机号（可选）"
            style={{ height: 48 }}
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
            prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
            placeholder="密码（至少6个字符）"
            style={{ height: 48 }}
            onChange={(e) => setPasswordStrength(calculatePasswordStrength(e.target.value))}
          />
        </Form.Item>

        {passwordStrength > 0 && (
          <div style={{ marginTop: -16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: '#64748b' }}>密码强度</Text>
              <Text style={{ fontSize: 12, color: getPasswordStrengthColor(passwordStrength), fontWeight: 600 }}>
                {getPasswordStrengthText(passwordStrength)}
              </Text>
            </div>
            <Progress
              percent={passwordStrength}
              strokeColor={getPasswordStrengthColor(passwordStrength)}
              showInfo={false}
              size="small"
            />
          </div>
        )}

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
            prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
            placeholder="确认密码"
            style={{ height: 48 }}
          />
        </Form.Item>

        <div className="feature-list">
          <Text strong style={{ fontSize: 13, color: '#475569', display: 'block', marginBottom: 12 }}>
            注册即可享受：
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              '免费试用 7 天企业版功能',
              '赠送 50GB 流量和 100 条短信',
              '7×24 小时技术支持',
            ].map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleOutlined style={{ color: '#10b981', marginRight: 8, fontSize: 14 }} />
                <Text style={{ fontSize: 13, color: '#64748b' }}>{item}</Text>
              </div>
            ))}
          </div>
        </div>

        <Form.Item
          name="agreement"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) =>
                value ? Promise.resolve() : Promise.reject(new Error('请同意用户协议和隐私政策')),
            },
          ]}
        >
          <Checkbox>
            <Text style={{ fontSize: 13, color: '#64748b' }}>
              我已阅读并同意{' '}
              <a href="/terms" target="_blank" style={{ color: '#6366f1', fontWeight: 500 }}>
                用户协议
              </a>{' '}
              和{' '}
              <a href="/privacy" target="_blank" style={{ color: '#6366f1', fontWeight: 500 }}>
                隐私政策
              </a>
            </Text>
          </Checkbox>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            立即注册
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
});

RegisterForm.displayName = 'RegisterForm';
