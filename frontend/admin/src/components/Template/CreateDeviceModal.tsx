import { memo } from 'react';
import { Modal, Form, Input, Select } from 'antd';
import type { FormInstance } from 'antd';
import type { User } from '@/types';

interface CreateDeviceModalProps {
  visible: boolean;
  templateName: string;
  form: FormInstance;
  users: User[];
  onOk: () => void;
  onCancel: () => void;
}

export const CreateDeviceModal = memo<CreateDeviceModalProps>(
  ({ visible, templateName, form, users, onOk, onCancel }) => {
    return (
      <Modal
        title={`从模板创建设备: ${templateName}`}
        open={visible}
        onCancel={onCancel}
        onOk={onOk}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="设备名称" name="name">
            <Input placeholder="留空将自动生成" />
          </Form.Item>
          <Form.Item
            label="分配给用户"
            name="userId"
            rules={[{ required: true, message: '请选择用户' }]}
          >
            <Select
              showSearch
              placeholder="请选择用户"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={users.map((user) => ({
                label: `${user.username} (${user.email})`,
                value: user.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

CreateDeviceModal.displayName = 'CreateDeviceModal';
