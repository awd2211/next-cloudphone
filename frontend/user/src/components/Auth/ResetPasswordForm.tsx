import { Form, Input, Button, Progress } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import { useState, useEffect } from 'react';

interface ResetPasswordFormProps {
  form: FormInstance;
  loading: boolean;
  onFinish: (values: ResetPasswordFormValues) => void;
}

export interface ResetPasswordFormValues {
  password: string;
  confirmPassword: string;
}

/**
 * 重置密码表单组件
 *
 * 功能：
 * 1. 输入新密码
 * 2. 确认新密码
 * 3. 密码强度检测
 * 4. 表单验证
 */
export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  form,
  loading,
  onFinish,
}) => {
  const [passwordStrength, setPasswordStrength] = useState(0);
  const password = Form.useWatch('password', form);

  // 密码强度计算
  useEffect(() => {
    // 使用 requestAnimationFrame 避免同步渲染问题
    requestAnimationFrame(() => {
      if (!password) {
        setPasswordStrength(0);
        return;
      }

      let strength = 0;

      // 长度检查
      if (password.length >= 8) strength += 25;
      if (password.length >= 12) strength += 15;

      // 包含数字
      if (/\d/.test(password)) strength += 20;

      // 包含小写字母
      if (/[a-z]/.test(password)) strength += 15;

      // 包含大写字母
      if (/[A-Z]/.test(password)) strength += 15;

      // 包含特殊字符
      if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) strength += 10;

      setPasswordStrength(Math.min(strength, 100));
    });
  }, [password]);

  // 密码强度颜色
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return '#ff4d4f';
    if (passwordStrength < 70) return '#faad14';
    return '#52c41a';
  };

  // 密码强度文本
  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return '弱';
    if (passwordStrength < 70) return '中';
    return '强';
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      autoComplete="off"
    >
      {/* 新密码 */}
      <Form.Item
        name="password"
        label="新密码"
        rules={[
          { required: true, message: '请输入新密码' },
          { min: 8, message: '密码长度至少8位' },
          {
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
            message: '密码必须包含大小写字母和数字',
          },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="请输入新密码（至少8位，包含大小写字母和数字）"
          size="large"
          autoFocus
        />
      </Form.Item>

      {/* 密码强度指示器 */}
      {password && (
        <div style={{ marginTop: -16, marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
              fontSize: 12,
            }}
          >
            <span>密码强度</span>
            <span style={{ color: getPasswordStrengthColor(), fontWeight: 'bold' }}>
              {getPasswordStrengthText()}
            </span>
          </div>
          <Progress
            percent={passwordStrength}
            strokeColor={getPasswordStrengthColor()}
            showInfo={false}
            size="small"
          />
        </div>
      )}

      {/* 确认密码 */}
      <Form.Item
        name="confirmPassword"
        label="确认密码"
        dependencies={['password']}
        rules={[
          { required: true, message: '请确认新密码' },
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
          placeholder="请再次输入新密码"
          size="large"
        />
      </Form.Item>

      {/* 提交按钮 */}
      <Form.Item style={{ marginTop: 32 }}>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
          size="large"
        >
          重置密码
        </Button>
      </Form.Item>
    </Form>
  );
};
