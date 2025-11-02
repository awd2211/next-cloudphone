import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Alert, Progress, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { changePassword } from '@/services/auth';

interface PasswordFormValues {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * 密码管理组件
 *
 * 功能：
 * 1. 修改密码
 * 2. 实时密码强度检测
 * 3. 密码确认验证
 */
export const PasswordManagement: React.FC = React.memo(() => {
  const [form] = Form.useForm<PasswordFormValues>();
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const newPassword = Form.useWatch('newPassword', form);

  // 密码强度计算
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;

    // 长度检查
    if (newPassword.length >= 8) strength += 25;
    if (newPassword.length >= 12) strength += 15;

    // 字符类型检查
    if (/\d/.test(newPassword)) strength += 20; // 数字
    if (/[a-z]/.test(newPassword)) strength += 15; // 小写字母
    if (/[A-Z]/.test(newPassword)) strength += 15; // 大写字母
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword))
      strength += 10; // 特殊字符

    setPasswordStrength(Math.min(strength, 100));
  }, [newPassword]);

  // 获取密码强度颜色
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return '#ff4d4f'; // 弱 - 红色
    if (passwordStrength < 70) return '#faad14'; // 中 - 黄色
    return '#52c41a'; // 强 - 绿色
  };

  // 获取密码强度文本
  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return '弱';
    if (passwordStrength < 70) return '中';
    return '强';
  };

  // 处理密码修改提交
  const handleSubmit = async (values: PasswordFormValues) => {
    setLoading(true);

    try {
      await changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });

      message.success('密码修改成功，请使用新密码登录');
      form.resetFields();
      setPasswordStrength(0);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        '密码修改失败，请检查旧密码是否正确';

      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <Alert
        message="密码安全建议"
        description={
          <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
            <li>密码长度至少 8 位，建议 12 位以上</li>
            <li>包含大小写字母、数字和特殊字符</li>
            <li>不要使用生日、手机号等容易猜测的信息</li>
            <li>定期更换密码以保证账户安全</li>
          </ul>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="当前密码"
          name="oldPassword"
          rules={[{ required: true, message: '请输入当前密码' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入当前密码"
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 8, message: '密码长度至少 8 位' },
            {
              pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
              message: '密码必须包含大小写字母和数字',
            },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入新密码（8位以上，包含大小写字母和数字）"
            size="large"
          />
        </Form.Item>

        {newPassword && (
          <div style={{ marginTop: -16, marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 12, color: '#666' }}>密码强度</span>
              <span
                style={{
                  fontSize: 12,
                  color: getPasswordStrengthColor(),
                  fontWeight: 500,
                }}
              >
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

        <Form.Item
          label="确认新密码"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
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

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            size="large"
            block
          >
            修改密码
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
});

PasswordManagement.displayName = 'PasswordManagement';
