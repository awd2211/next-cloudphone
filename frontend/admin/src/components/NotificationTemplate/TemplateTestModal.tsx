import { memo } from 'react';
import { Modal, Form, Input, Divider } from 'antd';
import type { FormInstance } from 'antd';
import type { NotificationTemplate } from '@/types';

interface TemplateTestModalProps {
  visible: boolean;
  template: NotificationTemplate | null;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
}

export const TemplateTestModal = memo<TemplateTestModalProps>(
  ({ visible, template, form, onOk, onCancel }) => {
    const getRecipientLabel = () => {
      if (template?.type === 'email') return '收件人邮箱';
      if (template?.type === 'sms') return '手机号';
      return '用户ID';
    };

    return (
      <Modal
        title={`测试发送: ${template?.name}`}
        open={visible}
        onCancel={onCancel}
        onOk={onOk}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={getRecipientLabel()}
            name="recipient"
            rules={[{ required: true, message: '请输入接收方' }]}
          >
            <Input placeholder="输入测试接收方" />
          </Form.Item>

          <Divider>变量值</Divider>

          {template?.variables.map((varName) => (
            <Form.Item key={varName} label={varName} name={varName}>
              <Input placeholder={`输入 ${varName} 的测试值`} />
            </Form.Item>
          ))}
        </Form>
      </Modal>
    );
  }
);

TemplateTestModal.displayName = 'TemplateTestModal';
