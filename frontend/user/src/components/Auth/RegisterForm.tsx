import React from 'react';
import { Form, Input, Button, FormInstance } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import type { RegisterDto } from '@/types';

interface RegisterFormProps {
  form: FormInstance;
  loading: boolean;
  onFinish: (values: RegisterDto) => void;
}

/**
 * 注册表单组件
 * 包含用户名、邮箱、手机号、密码和确认密码输入
 */
export const RegisterForm: React.FC<RegisterFormProps> = React.memo(({
  form,
  loading,
  onFinish,
}) => {
  return (
    <Form form={form} onFinish={onFinish} size="large">
      <Form.Item
        name="username"
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 3, message: '用户名至少3个字符' },
        ]}
      >
        <Input prefix={<UserOutlined />} placeholder="用户名" />
      </Form.Item>

      <Form.Item
        name="email"
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' },
        ]}
      >
        <Input prefix={<MailOutlined />} placeholder="邮箱" />
      </Form.Item>

      <Form.Item name="phone">
        <Input prefix={<PhoneOutlined />} placeholder="手机号（可选）" />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[
          { required: true, message: '请输入密码' },
          { min: 6, message: '密码至少6个字符' },
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="密码" />
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
        <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>
          注册
        </Button>
      </Form.Item>
    </Form>
  );
});

RegisterForm.displayName = 'RegisterForm';
