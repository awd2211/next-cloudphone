import React, { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';
import type { Role } from '@/types';

interface RoleFormModalProps {
  visible: boolean;
  editingRole: Role | null;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (values: { name: string; description?: string }) => Promise<void>;
}

export const RoleFormModal: React.FC<RoleFormModalProps> = React.memo(
  ({ visible, editingRole, loading, onCancel, onSubmit }) => {
    const [form] = Form.useForm();

    useEffect(() => {
      if (visible && editingRole) {
        form.setFieldsValue(editingRole);
      } else if (!visible) {
        form.resetFields();
      }
    }, [visible, editingRole, form]);

    return (
      <Modal
        title={editingRole ? '编辑角色' : '创建角色'}
        open={visible}
        onCancel={onCancel}
        onOk={() => form.submit()}
        confirmLoading={loading}
      >
        <Form form={form} onFinish={onSubmit} layout="vertical">
          <Form.Item
            label="角色名称"
            name="name"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="例如：管理员" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea placeholder="角色描述" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

RoleFormModal.displayName = 'RoleFormModal';
