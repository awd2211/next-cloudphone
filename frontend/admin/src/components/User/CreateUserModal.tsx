/**
 * CreateUserModal - 创建用户对话框组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Modal, Form, Input, Select } from 'antd';
import type { FormInstance } from 'antd';
import type { CreateUserDto } from '@/types';

interface Role {
  id: string;
  name: string;
}

interface CreateUserModalProps {
  visible: boolean;
  form: FormInstance;
  roles: Role[];
  onCancel: () => void;
  onFinish: (values: CreateUserDto) => void;
}

/**
 * CreateUserModal 组件
 * 创建用户的对话框
 */
export const CreateUserModal = memo<CreateUserModalProps>(
  ({ visible, form, roles, onCancel, onFinish }) => {
    return (
      <Modal
        title="创建用户"
        open={visible}
        onCancel={onCancel}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item label="手机号" name="phone">
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item label="角色" name="roleIds">
            <Select
              mode="multiple"
              placeholder="请选择角色"
              options={roles.map((role) => ({
                label: role.name,
                value: role.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

CreateUserModal.displayName = 'CreateUserModal';
