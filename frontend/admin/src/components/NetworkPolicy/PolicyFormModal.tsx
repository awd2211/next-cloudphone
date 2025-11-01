import React from 'react';
import { Modal, Form, Input, Select, InputNumber, Switch, Row, Col } from 'antd';
import type { FormInstance } from 'antd';
import type { NetworkPolicy, PolicyFormValues } from './types';
import {
  DIRECTION_OPTIONS,
  PROTOCOL_OPTIONS,
  ACTION_OPTIONS,
  PRIORITY_RANGE,
  BANDWIDTH_RANGE,
} from './constants';

const { TextArea } = Input;

interface PolicyFormModalProps {
  visible: boolean;
  editingPolicy: NetworkPolicy | null;
  form: FormInstance;
  onCancel: () => void;
  onOk: () => void;
}

/**
 * 策略表单模态框组件
 */
const PolicyFormModal: React.FC<PolicyFormModalProps> = React.memo(
  ({ visible, editingPolicy, form, onCancel, onOk }) => {
    return (
      <Modal
        title={editingPolicy ? '编辑策略' : '创建策略'}
        open={visible}
        onCancel={onCancel}
        onOk={onOk}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="策略名称"
            name="name"
            rules={[{ required: true, message: '请输入策略名称' }]}
          >
            <Input placeholder="例如: 允许HTTP访问" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <TextArea rows={2} placeholder="策略说明" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="方向" name="direction">
                <Select options={DIRECTION_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="协议" name="protocol">
                <Select options={PROTOCOL_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="动作" name="action">
                <Select options={ACTION_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="源IP (CIDR)" name="sourceIp">
                <Input placeholder="例如: 0.0.0.0/0 或留空表示任意" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="目标IP (CIDR)" name="destIp">
                <Input placeholder="例如: 192.168.1.0/24" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="目标端口" name="destPort">
                <Input placeholder="例如: 80 或 8000-9000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="优先级" name="priority">
                <InputNumber
                  min={PRIORITY_RANGE.min}
                  max={PRIORITY_RANGE.max}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="带宽限制 (Mbps)" name="bandwidthLimit">
            <InputNumber
              min={BANDWIDTH_RANGE.min}
              max={BANDWIDTH_RANGE.max}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item label="启用策略" name="isEnabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

PolicyFormModal.displayName = 'PolicyFormModal';

export default PolicyFormModal;
