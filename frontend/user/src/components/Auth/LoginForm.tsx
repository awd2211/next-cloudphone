import React from 'react';
import { Form, Input, Button, FormInstance } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { CaptchaInput } from './CaptchaInput';
import type { LoginDto } from '@/types';

interface LoginFormProps {
  form: FormInstance;
  loading: boolean;
  captchaSvg: string;
  captchaLoading: boolean;
  onFinish: (values: Omit<LoginDto, 'captchaId'>) => void;
  onRefreshCaptcha: () => void;
}

/**
 * 登录表单组件
 * 包含用户名、密码和验证码输入
 */
export const LoginForm: React.FC<LoginFormProps> = React.memo(({
  form,
  loading,
  captchaSvg,
  captchaLoading,
  onFinish,
  onRefreshCaptcha,
}) => {
  return (
    <Form form={form} onFinish={onFinish} size="large">
      <Form.Item
        name="username"
        rules={[{ required: true, message: '请输入用户名' }]}
      >
        <Input prefix={<UserOutlined />} placeholder="用户名" />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[{ required: true, message: '请输入密码' }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="密码" />
      </Form.Item>

      <CaptchaInput
        captchaSvg={captchaSvg}
        captchaLoading={captchaLoading}
        onRefresh={onRefreshCaptcha}
      />

      <Form.Item>
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Link to="/forgot-password" style={{ fontSize: 12 }}>
            忘记密码？
          </Link>
        </div>
        <Button type="primary" htmlType="submit" block loading={loading}>
          登录
        </Button>
      </Form.Item>
    </Form>
  );
});

LoginForm.displayName = 'LoginForm';
