/**
 * EditQuotaModal - 编辑配额对话框组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Modal, Form, InputNumber, Row, Col } from 'antd';
import type { FormInstance } from 'antd';
import type { UpdateQuotaDto } from '@/types';

interface EditQuotaModalProps {
  visible: boolean;
  form: FormInstance;
  onCancel: () => void;
  onFinish: (values: UpdateQuotaDto) => void;
}

/**
 * EditQuotaModal 组件
 * 编辑配额的对话框
 */
export const EditQuotaModal = memo<EditQuotaModalProps>(({ visible, form, onCancel, onFinish }) => {
  return (
    <Modal
      title="编辑配额"
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={700}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item label="设备限制">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name={['limits', 'maxDevices']}>
                <InputNumber placeholder="最大设备数" min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['limits', 'maxConcurrentDevices']}>
                <InputNumber placeholder="最大并发设备数" min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form.Item>

        <Form.Item label="资源限制">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name={['limits', 'totalCpuCores']}>
                <InputNumber placeholder="总CPU核数" min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['limits', 'totalMemoryGB']}>
                <InputNumber placeholder="总内存(GB)" min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['limits', 'totalStorageGB']}>
                <InputNumber placeholder="总存储(GB)" min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    </Modal>
  );
});

EditQuotaModal.displayName = 'EditQuotaModal';
