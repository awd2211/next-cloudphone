/**
 * EditUserModal - 编辑用户对话框组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Modal, Form, Input, Select } from 'antd';
import type { FormInstance } from 'antd';
import type { UpdateUserDto, User } from '@/types';

interface Role {
  id: string;
  name: string;
}

interface EditUserModalProps {
  visible: boolean;
  form: FormInstance;
  roles: Role[];
  selectedUser: User | null;
  onCancel: () => void;
  onFinish: (values: UpdateUserDto) => void;
}

/**
 * EditUserModal 组件
 * 编辑用户的对话框
 */
export const EditUserModal = memo<EditUserModalProps>(
  ({ visible, form, roles, selectedUser, onCancel, onFinish }) => {
    return (
      <Modal
        title="编辑用户"
        open={visible}
        onCancel={onCancel}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item label="用户名">
            <Input value={selectedUser?.username} disabled />
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

          <Form.Item label="手机号" name="phone">
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item label="状态" name="status">
            <Select placeholder="请选择状态">
              <Select.Option value="active">正常</Select.Option>
              <Select.Option value="inactive">未激活</Select.Option>
              <Select.Option value="banned">已封禁</Select.Option>
            </Select>
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

EditUserModal.displayName = 'EditUserModal';
