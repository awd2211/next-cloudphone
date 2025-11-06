import React from 'react';
import { Form, Input, Button, Radio, Typography } from 'antd';
import { MailOutlined, PhoneOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';

const { Text } = Typography;

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
 * 忘记密码表单组件（优化版）
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
    <div>
      <style>
        {`
          .forgot-password-form .ant-input-affix-wrapper,
          .forgot-password-form .ant-input {
            border-radius: 10px;
            border: 1.5px solid #e2e8f0;
            transition: all 0.3s;
            height: 48px;
          }
          .forgot-password-form .ant-input-affix-wrapper:hover,
          .forgot-password-form .ant-input:hover {
            border-color: #6366f1;
          }
          .forgot-password-form .ant-input-affix-wrapper-focused,
          .forgot-password-form .ant-input:focus {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          }
          .forgot-password-form .ant-btn-primary {
            height: 48px;
            border-radius: 10px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border: none;
            font-size: 16px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            transition: all 0.3s;
          }
          .forgot-password-form .ant-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
          }
          .forgot-password-form .ant-radio-group {
            width: 100%;
          }
          .forgot-password-form .ant-radio-button-wrapper {
            height: 40px;
            line-height: 38px;
            border-radius: 10px;
            border: 1.5px solid #e2e8f0;
            flex: 1;
            text-align: center;
            font-weight: 500;
          }
          .forgot-password-form .ant-radio-button-wrapper:first-child {
            border-radius: 10px 0 0 10px;
          }
          .forgot-password-form .ant-radio-button-wrapper:last-child {
            border-radius: 0 10px 10px 0;
          }
          .forgot-password-form .ant-radio-button-wrapper-checked {
            background: #6366f1;
            border-color: #6366f1;
            color: #fff;
          }
          .forgot-password-form .ant-radio-button-wrapper-checked:hover {
            background: #5558e3;
            border-color: #5558e3;
          }
          .forgot-password-form .ant-form-item-label > label {
            font-weight: 500;
            color: #334155;
          }
        `}
      </style>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ type: 'email' }}
        autoComplete="off"
        className="forgot-password-form"
      >
        {/* 重置方式选择 */}
        <Form.Item
          name="type"
          label="重置方式"
          rules={[{ required: true, message: '请选择重置方式' }]}
        >
          <Radio.Group style={{ display: 'flex', gap: 8 }}>
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
              prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
              placeholder="请输入您注册时使用的邮箱"
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
              prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
              placeholder="请输入您注册时使用的手机号"
              autoFocus
              maxLength={11}
            />
          </Form.Item>
        )}

        {/* 提交按钮 */}
        <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
          >
            发送重置链接
          </Button>
        </Form.Item>

        {/* 提示信息 */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Text style={{ color: '#94a3b8', fontSize: 13 }}>
            {resetType === 'email' ? (
              <>重置链接将发送到您的邮箱，请注意查收</>
            ) : (
              <>验证码将发送到您的手机，请注意查收</>
            )}
          </Text>
        </div>
      </Form>
    </div>
  );
};
