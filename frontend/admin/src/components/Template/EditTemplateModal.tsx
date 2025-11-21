import { memo } from 'react';
import { Modal, Form, Input, Select } from 'antd';
import type { FormInstance } from 'antd';

const { TextArea } = Input;
const { Option } = Select;

interface EditTemplateModalProps {
  visible: boolean;
  form: FormInstance;
  onOk: (values: any) => Promise<void>;
  onCancel: () => void;
}

export const EditTemplateModal = memo<EditTemplateModalProps>(
  ({ visible, form, onOk, onCancel }) => {
    const handleOk = async () => {
      try {
        const values = await form.validateFields();
        await onOk(values);
      } catch (_error) {
        console.error('Form submission error:', error);
      }
    };

    return (
      <Modal title="编辑模板" open={visible} onCancel={onCancel} onOk={handleOk}>
        <Form form={form} layout="vertical">
          <Form.Item
            label="模板名称"
            name="name"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>
          <Form.Item label="模板描述" name="description">
            <TextArea rows={3} placeholder="请输入模板描述" />
          </Form.Item>
          <Form.Item label="分类" name="category">
            <Select placeholder="请选择分类">
              <Option value="开发测试">开发测试</Option>
              <Option value="游戏">游戏</Option>
              <Option value="社交">社交</Option>
              <Option value="办公">办公</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item label="可见性" name="isPublic">
            <Select>
              <Option value={true}>公开（所有用户可见）</Option>
              <Option value={false}>私有（仅自己可见）</Option>
            </Select>
          </Form.Item>
          <Form.Item label="标签" name="tags">
            <Select mode="tags" placeholder="输入标签后按回车添加" />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

EditTemplateModal.displayName = 'EditTemplateModal';
