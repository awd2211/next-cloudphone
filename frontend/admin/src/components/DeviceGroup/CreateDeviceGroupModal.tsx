import React from 'react';
import { Modal, Form, Input, Select } from 'antd';
import type { FormInstance } from 'antd';

const { TextArea } = Input;
const { Option } = Select;

interface CreateDeviceGroupModalProps {
  visible: boolean;
  editingGroup: boolean;
  form: FormInstance;
  onCancel: () => void;
  onSubmit: () => void;
}

/**
 * 创建/编辑设备分组模态框
 */
export const CreateDeviceGroupModal: React.FC<CreateDeviceGroupModalProps> = React.memo(
  ({ visible, editingGroup, form, onCancel, onSubmit }) => {
    return (
      <Modal
        title={editingGroup ? '编辑分组' : '创建分组'}
        open={visible}
        onCancel={onCancel}
        onOk={onSubmit}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="分组名称"
            name="name"
            rules={[{ required: true, message: '请输入分组名称' }]}
          >
            <Input placeholder="例如: 生产环境设备" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <TextArea rows={2} placeholder="分组说明" />
          </Form.Item>

          <Form.Item label="标签" name="tags">
            <Select mode="tags" placeholder="添加标签">
              <Option value="production">生产</Option>
              <Option value="testing">测试</Option>
              <Option value="development">开发</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

CreateDeviceGroupModal.displayName = 'CreateDeviceGroupModal';
