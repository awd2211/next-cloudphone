import { Form, Input, Button, Radio } from 'antd';
import { MailOutlined, PhoneOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';

interface ForgotPasswordFormProps {
  form: FormInstance;
  loading: boolean;
  onFinish: (values: ForgotPasswordFormValues) => void;
}

export interface ForgotPasswordFormValues {
  type: 'email' | 'phone';
  email?: string;
  phone?: string;
}

/**
 * 忘记密码表单组件
 *
 * 功能：
 * 1. 选择重置方式（邮箱/手机）
 * 2. 输入邮箱或手机号
 * 3. 表单验证
 */
export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  form,
  loading,
  onFinish,
}) => {
  const resetType = Form.useWatch('type', form);

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{ type: 'email' }}
      autoComplete="off"
    >
      {/* 重置方式选择 */}
      <Form.Item
        name="type"
        label="重置方式"
        rules={[{ required: true, message: '请选择重置方式' }]}
      >
        <Radio.Group>
          <Radio.Button value="email">邮箱</Radio.Button>
          <Radio.Button value="phone">手机号</Radio.Button>
        </Radio.Group>
      </Form.Item>

      {/* 邮箱输入 */}
      {resetType === 'email' && (
        <Form.Item
          name="email"
          label="邮箱地址"
          rules={[
            { required: true, message: '请输入邮箱地址' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="请输入您注册时使用的邮箱"
            size="large"
            autoFocus
          />
        </Form.Item>
      )}

      {/* 手机号输入 */}
      {resetType === 'phone' && (
        <Form.Item
          name="phone"
          label="手机号码"
          rules={[
            { required: true, message: '请输入手机号码' },
            {
              pattern: /^1[3-9]\d{9}$/,
              message: '请输入有效的手机号码',
            },
          ]}
        >
          <Input
            prefix={<PhoneOutlined />}
            placeholder="请输入您注册时使用的手机号"
            size="large"
            autoFocus
            maxLength={11}
          />
        </Form.Item>
      )}

      {/* 提交按钮 */}
      <Form.Item style={{ marginTop: 32 }}>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
          size="large"
        >
          发送重置链接
        </Button>
      </Form.Item>

      {/* 提示信息 */}
      <div style={{ marginTop: 16, color: '#999', fontSize: 12, textAlign: 'center' }}>
        {resetType === 'email' ? (
          <p>重置链接将发送到您的邮箱，请注意查收</p>
        ) : (
          <p>验证码将发送到您的手机，请注意查收</p>
        )}
      </div>
    </Form>
  );
};
