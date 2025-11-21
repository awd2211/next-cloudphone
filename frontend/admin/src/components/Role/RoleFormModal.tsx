import React, { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';
import type { Role } from '@/types';
import { getRoleNameError } from '@/utils/validators';

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
            rules={[
              { required: true, message: '请输入角色名称' },
              {
                validator: async (_, value) => {
                  if (value) {
                    const error = getRoleNameError(value);
                    if (error) {
                      throw new Error(error);
                    }
                  }
                },
              },
            ]}
          >
            <Input placeholder="例如：admin_role" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
            rules={[{ max: 200, message: '描述不能超过200个字符' }]}
          >
            <Input.TextArea
              placeholder="角色描述"
              rows={3}
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

RoleFormModal.displayName = 'RoleFormModal';
