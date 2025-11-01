/**
 * ResetPasswordModal - 重置密码对话框组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Modal, Form, Input } from 'antd';
import type { FormInstance } from 'antd';
import type { User } from '@/types';

interface ResetPasswordModalProps {
  visible: boolean;
  form: FormInstance;
  selectedUser: User | null;
  onCancel: () => void;
  onFinish: (values: { newPassword: string }) => void;
}

/**
 * ResetPasswordModal 组件
 * 重置用户密码的对话框
 */
export const ResetPasswordModal = memo<ResetPasswordModalProps>(
  ({ visible, form, selectedUser, onCancel, onFinish }) => {
    return (
      <Modal
        title="重置密码"
        open={visible}
        onCancel={onCancel}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item label="用户">
            <Input value={selectedUser?.username} disabled />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>

          <Form.Item
            label="确认密码"
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
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

ResetPasswordModal.displayName = 'ResetPasswordModal';
