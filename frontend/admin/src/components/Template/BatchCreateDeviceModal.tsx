import { memo } from 'react';
import { Modal, Form, Input, InputNumber, Select } from 'antd';
import type { FormInstance } from 'antd';
import type { User } from '@/types';

interface BatchCreateDeviceModalProps {
  visible: boolean;
  templateName: string;
  form: FormInstance;
  users: User[];
  onOk: (values: any) => Promise<void>;
  onCancel: () => void;
}

export const BatchCreateDeviceModal = memo<BatchCreateDeviceModalProps>(
  ({ visible, templateName, form, users, onOk, onCancel }) => {
    const handleOk = async () => {
      try {
        const values = await form.validateFields();
        await onOk(values);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    };

    return (
      <Modal
        title={`批量创建设备: ${templateName}`}
        open={visible}
        onCancel={onCancel}
        onOk={handleOk}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="创建数量"
            name="count"
            rules={[{ required: true, message: '请输入创建数量' }]}
            initialValue={5}
          >
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
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
          <Form.Item label="设备名称前缀" name="name">
            <Input placeholder="留空将使用模板名称" />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

BatchCreateDeviceModal.displayName = 'BatchCreateDeviceModal';
