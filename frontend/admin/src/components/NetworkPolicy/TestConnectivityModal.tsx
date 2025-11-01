import React from 'react';
import { Modal, Form, Input, InputNumber, Select } from 'antd';
import type { FormInstance } from 'antd';
import { TEST_PROTOCOL_OPTIONS, PORT_RANGE } from './constants';

interface TestConnectivityModalProps {
  visible: boolean;
  form: FormInstance;
  onCancel: () => void;
  onOk: () => void;
}

/**
 * 连通性测试模态框组件
 */
const TestConnectivityModal: React.FC<TestConnectivityModalProps> = React.memo(
  ({ visible, form, onCancel, onOk }) => {
    return (
      <Modal title="连通性测试" open={visible} onCancel={onCancel} onOk={onOk}>
        <Form form={form} layout="vertical">
          <Form.Item
            label="目标地址"
            name="targetIp"
            rules={[{ required: true, message: '请输入目标地址' }]}
          >
            <Input placeholder="例如: 8.8.8.8" />
          </Form.Item>

          <Form.Item label="端口" name="port">
            <InputNumber
              min={PORT_RANGE.min}
              max={PORT_RANGE.max}
              placeholder="例如: 80"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item label="协议" name="protocol" initialValue="tcp">
            <Select options={TEST_PROTOCOL_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

TestConnectivityModal.displayName = 'TestConnectivityModal';

export default TestConnectivityModal;
