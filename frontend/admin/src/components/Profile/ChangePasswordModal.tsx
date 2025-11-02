import React from 'react';
import { Modal, Form, Input } from 'antd';
import type { FormInstance } from 'antd';

interface ChangePasswordModalProps {
  visible: boolean;
  form: FormInstance;
  onCancel: () => void;
  onSubmit: (values: { oldPassword: string; newPassword: string }) => Promise<void>;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = React.memo(
  ({ visible, form, onCancel, onSubmit }) => {
    const handleCancel = () => {
      onCancel();
      form.resetFields();
    };

    return (
      <Modal
        title="修改密码"
        open={visible}
        onCancel={handleCancel}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={onSubmit} layout="vertical">
          <Form.Item
            label="当前密码"
            name="oldPassword"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
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
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

ChangePasswordModal.displayName = 'ChangePasswordModal';
