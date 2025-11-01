import { memo } from 'react';
import { Modal, Alert, Form, Select } from 'antd';
import type { GPUDevice } from '@/services/gpu';

const { Option } = Select;

export interface AllocateGPUModalProps {
  visible: boolean;
  gpu: GPUDevice | null;
  form: any;
  onCancel: () => void;
  onOk: () => void;
}

/**
 * GPU 分配模态框组件
 */
export const AllocateGPUModal = memo<AllocateGPUModalProps>(
  ({ visible, gpu, form, onCancel, onOk }) => {
    return (
      <Modal title="分配 GPU" open={visible} onCancel={onCancel} onOk={onOk}>
        {gpu && (
          <>
            <Alert
              message={`将分配 GPU: ${gpu.name} (${gpu.model})`}
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <Form form={form} layout="vertical">
              <Form.Item
                label="目标设备 ID"
                name="deviceId"
                rules={[{ required: true, message: '请输入设备 ID' }]}
              >
                <Select showSearch placeholder="选择或输入设备 ID">
                  {/* 实际应用中，这里应该从设备列表 API 获取 */}
                </Select>
              </Form.Item>
              <Form.Item label="分配模式" name="mode" initialValue="exclusive">
                <Select>
                  <Option value="exclusive">独占模式</Option>
                  <Option value="shared">共享模式</Option>
                </Select>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    );
  },
);

AllocateGPUModal.displayName = 'AllocateGPUModal';
