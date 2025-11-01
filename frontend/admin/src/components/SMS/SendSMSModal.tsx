import { memo } from 'react';
import { Modal, Form, Input, Select } from 'antd';
import type { FormInstance } from 'antd';
import { PROVIDER_OPTIONS } from './constants';

export interface SendSMSModalProps {
  visible: boolean;
  loading: boolean;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
}

/**
 * 发送短信弹窗组件
 */
export const SendSMSModal = memo<SendSMSModalProps>(
  ({ visible, loading, form, onOk, onCancel }) => {
    return (
      <Modal
        title="发送短信"
        open={visible}
        onOk={onOk}
        onCancel={onCancel}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item
            label="短信内容"
            name="content"
            rules={[{ required: true, message: '请输入短信内容' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入短信内容" />
          </Form.Item>
          <Form.Item label="供应商" name="provider" initialValue="aliyun">
            <Select options={PROVIDER_OPTIONS} />
          </Form.Item>
          <Form.Item label="模板代码" name="templateCode">
            <Input placeholder="可选，使用模板时填写" />
          </Form.Item>
        </Form>
      </Modal>
    );
  },
);

SendSMSModal.displayName = 'SendSMSModal';
