/**
 * CreateQuotaModal - 创建配额对话框组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col } from 'antd';
import type { FormInstance } from 'antd';
import type { CreateQuotaDto } from '@/types';

interface CreateQuotaModalProps {
  visible: boolean;
  form: FormInstance;
  onCancel: () => void;
  onFinish: (values: CreateQuotaDto) => void;
}

/**
 * CreateQuotaModal 组件
 * 创建配额的对话框
 */
export const CreateQuotaModal = memo<CreateQuotaModalProps>(
  ({ visible, form, onCancel, onFinish }) => {
    return (
      <Modal
        title="创建配额"
        open={visible}
        onCancel={onCancel}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="用户ID"
            name="userId"
            rules={[{ required: true, message: '请输入用户ID' }]}
          >
            <Input placeholder="输入用户ID" />
          </Form.Item>

          <Form.Item label="设备限制">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['limits', 'maxDevices']}
                  rules={[{ required: true, message: '请输入最大设备数' }]}
                >
                  <InputNumber placeholder="最大设备数" min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['limits', 'maxConcurrentDevices']}
                  rules={[{ required: true, message: '请输入最大并发设备数' }]}
                >
                  <InputNumber placeholder="最大并发设备数" min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>

          <Form.Item label="资源限制">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name={['limits', 'totalCpuCores']}
                  rules={[{ required: true, message: '请输入总CPU核数' }]}
                >
                  <InputNumber placeholder="总CPU核数" min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['limits', 'totalMemoryGB']}
                  rules={[{ required: true, message: '请输入总内存(GB)' }]}
                >
                  <InputNumber placeholder="总内存(GB)" min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['limits', 'totalStorageGB']}
                  rules={[{ required: true, message: '请输入总存储(GB)' }]}
                >
                  <InputNumber placeholder="总存储(GB)" min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>

          <Form.Item label="带宽限制">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['limits', 'maxBandwidthMbps']}
                  rules={[{ required: true, message: '请输入最大带宽(Mbps)' }]}
                >
                  <InputNumber placeholder="最大带宽(Mbps)" min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['limits', 'monthlyTrafficGB']}
                  rules={[{ required: true, message: '请输入月流量(GB)' }]}
                >
                  <InputNumber placeholder="月流量(GB)" min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

CreateQuotaModal.displayName = 'CreateQuotaModal';
