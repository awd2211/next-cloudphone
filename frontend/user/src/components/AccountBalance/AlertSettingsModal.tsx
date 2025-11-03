import { memo } from 'react';
import { Modal, Form, Switch, InputNumber, Select, Alert } from 'antd';
import type { FormInstance } from 'antd';

interface AlertSettingsModalProps {
  visible: boolean;
  form: FormInstance;
  onSave: () => void;
  onClose: () => void;
}

export const AlertSettingsModal = memo<AlertSettingsModalProps>(
  ({ visible, form, onSave, onClose }) => {
    return (
      <Modal
        title="余额预警设置"
        open={visible}
        onOk={onSave}
        onCancel={onClose}
        width={500}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="enabled" label="启用余额预警" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            name="threshold"
            label="预警阈值"
            rules={[{ required: true, message: '请设置预警阈值' }]}
            extra="当余额低于此金额时会发送预警通知"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={10000}
              step={50}
              prefix="¥"
              placeholder="例如：100"
            />
          </Form.Item>

          <Form.Item
            name="notifyMethod"
            label="通知方式"
            rules={[{ required: true, message: '请选择通知方式' }]}
          >
            <Select
              mode="multiple"
              placeholder="选择通知方式"
              options={[
                { label: '站内消息', value: 'message' },
                { label: '邮件通知', value: 'email' },
                { label: '短信通知', value: 'sms' },
              ]}
            />
          </Form.Item>

          <Alert
            message="温馨提示"
            description="为保障服务不中断，建议设置合理的预警阈值并开启多种通知方式。"
            type="info"
            showIcon
            style={{ marginTop: 8 }}
          />
        </Form>
      </Modal>
    );
  }
);

AlertSettingsModal.displayName = 'AlertSettingsModal';
