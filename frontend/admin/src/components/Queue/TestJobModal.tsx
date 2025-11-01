import { memo } from 'react';
import { Modal, Form, Input, Select } from 'antd';
import type { FormInstance } from 'antd';

interface TestJobModalProps {
  visible: boolean;
  testType: 'email' | 'sms' | 'device';
  form: FormInstance;
  onTestTypeChange: (type: 'email' | 'sms' | 'device') => void;
  onOk: () => void;
  onCancel: () => void;
}

export const TestJobModal = memo<TestJobModalProps>(({
  visible,
  testType,
  form,
  onTestTypeChange,
  onOk,
  onCancel,
}) => {
  return (
    <Modal
      title="创建测试任务"
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      okText="创建"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Form.Item label="任务类型">
          <Select value={testType} onChange={onTestTypeChange}>
            <Select.Option value="email">发送邮件</Select.Option>
            <Select.Option value="sms">发送短信</Select.Option>
            <Select.Option value="device">启动设备</Select.Option>
          </Select>
        </Form.Item>

        {testType === 'email' && (
          <>
            <Form.Item name="to" label="收件人邮箱" rules={[{ required: true }]}>
              <Input placeholder="test@example.com" />
            </Form.Item>
            <Form.Item name="subject" label="邮件主题" rules={[{ required: true }]}>
              <Input placeholder="测试邮件" />
            </Form.Item>
            <Form.Item name="html" label="邮件内容" rules={[{ required: true }]}>
              <Input.TextArea rows={4} placeholder="<h1>测试邮件</h1>" />
            </Form.Item>
          </>
        )}

        {testType === 'sms' && (
          <>
            <Form.Item name="phone" label="手机号" rules={[{ required: true }]}>
              <Input placeholder="13800138000" />
            </Form.Item>
            <Form.Item name="message" label="短信内容" rules={[{ required: true }]}>
              <Input.TextArea rows={3} placeholder="这是一条测试短信" />
            </Form.Item>
          </>
        )}

        {testType === 'device' && (
          <>
            <Form.Item name="deviceId" label="设备ID" rules={[{ required: true }]}>
              <Input placeholder="device-uuid" />
            </Form.Item>
            <Form.Item name="userId" label="用户ID (可选)">
              <Input placeholder="user-uuid" />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
});

TestJobModal.displayName = 'TestJobModal';
