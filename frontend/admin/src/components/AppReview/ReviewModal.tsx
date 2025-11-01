import React, { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';

const { TextArea } = Input;

interface ReviewModalProps {
  visible: boolean;
  action: 'approve' | 'reject' | 'request_changes';
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
}

export const ReviewModal: React.FC<ReviewModalProps> = React.memo(
  ({ visible, action, onCancel, onSubmit }) => {
    const [form] = Form.useForm();

    useEffect(() => {
      if (!visible) {
        form.resetFields();
      }
    }, [visible, form]);

    const getTitle = () => {
      switch (action) {
        case 'approve':
          return '批准应用';
        case 'reject':
          return '拒绝应用';
        case 'request_changes':
          return '要求修改';
        default:
          return '审核';
      }
    };

    return (
      <Modal
        title={getTitle()}
        open={visible}
        onCancel={onCancel}
        onOk={() => form.submit()}
        okText="提交"
        cancelText="取消"
        okButtonProps={{
          danger: action === 'reject',
        }}
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          {action === 'approve' && (
            <Form.Item label="审核意见" name="comment">
              <TextArea rows={4} placeholder="可选：添加审核意见或建议" />
            </Form.Item>
          )}
          {action === 'reject' && (
            <Form.Item
              label="拒绝原因"
              name="reason"
              rules={[{ required: true, message: '请输入拒绝原因' }]}
            >
              <TextArea rows={4} placeholder="请详细说明拒绝原因，便于开发者改进" />
            </Form.Item>
          )}
          {action === 'request_changes' && (
            <Form.Item
              label="修改要求"
              name="changes"
              rules={[{ required: true, message: '请输入修改要求' }]}
            >
              <TextArea rows={4} placeholder="请详细列出需要修改的内容" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    );
  }
);

ReviewModal.displayName = 'ReviewModal';
