import { memo } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col } from 'antd';
import type { FormInstance } from 'antd';
import type { SchedulerNode } from '@/services/scheduler';

interface NodeFormModalProps {
  visible: boolean;
  editingNode: SchedulerNode | null;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
}

export const NodeFormModal = memo<NodeFormModalProps>(
  ({ visible, editingNode, form, onOk, onCancel }) => {
    return (
      <Modal
        title={editingNode ? '编辑节点' : '添加节点'}
        open={visible}
        onCancel={onCancel}
        onOk={onOk}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="节点名称"
            name="name"
            rules={[{ required: true, message: '请输入节点名称' }]}
          >
            <Input placeholder="例如: node-01" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                label="主机地址"
                name="host"
                rules={[{ required: !editingNode, message: '请输入主机地址' }]}
              >
                <Input placeholder="192.168.1.100" disabled={!!editingNode} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="端口"
                name="port"
                rules={[{ required: !editingNode, message: '请输入端口' }]}
              >
                <InputNumber
                  min={1}
                  max={65535}
                  style={{ width: '100%' }}
                  disabled={!!editingNode}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="区域" name="region">
                <Input placeholder="例如: cn-east" disabled={!!editingNode} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="可用区" name="zone">
                <Input placeholder="例如: zone-a" disabled={!!editingNode} />
              </Form.Item>
            </Col>
          </Row>

          {!editingNode && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="CPU 容量 (核)"
                    name="cpuCapacity"
                    rules={[{ required: true, message: '请输入CPU容量' }]}
                  >
                    <InputNumber min={1} max={128} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="内存容量 (MB)"
                    name="memoryCapacity"
                    rules={[{ required: true, message: '请输入内存容量' }]}
                  >
                    <InputNumber min={1024} step={1024} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="存储容量 (MB)"
                    name="storageCapacity"
                    rules={[{ required: true, message: '请输入存储容量' }]}
                  >
                    <InputNumber min={10240} step={10240} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="最大设备数"
                    name="maxDevices"
                    rules={[{ required: true, message: '请输入最大设备数' }]}
                  >
                    <InputNumber min={1} max={1000} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
        </Form>
      </Modal>
    );
  }
);

NodeFormModal.displayName = 'NodeFormModal';
