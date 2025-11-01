import { memo } from 'react';
import { Modal, Form, Input, Select, InputNumber } from 'antd';
import type { FormInstance } from 'antd';
import type { CreateDeviceDto } from '@/types';

interface CreateDeviceModalProps {
  visible: boolean;
  form: FormInstance;
  loading: boolean;
  onOk: () => void;
  onCancel: () => void;
  onFinish: (values: CreateDeviceDto) => void;
}

/**
 * 创建设备弹窗组件
 * 包含设备名称、模板选择、CPU、内存、存储配置
 */
export const CreateDeviceModal = memo<CreateDeviceModalProps>(
  ({ visible, form, loading, onOk, onCancel, onFinish }) => {
    return (
      <Modal
        title="创建设备"
        open={visible}
        onCancel={onCancel}
        onOk={onOk}
        confirmLoading={loading}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="设备名称"
            name="name"
            rules={[{ required: true, message: '请输入设备名称' }]}
          >
            <Input placeholder="例如: MyDevice-001" />
          </Form.Item>

          <Form.Item
            label="模板"
            name="template"
            rules={[{ required: true, message: '请选择模板' }]}
          >
            <Select
              placeholder="选择Android版本模板"
              options={[
                { label: 'Android 12', value: 'android-12' },
                { label: 'Android 13', value: 'android-13' },
                { label: 'Android 14', value: 'android-14' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="CPU 核心数"
            name="cpuCores"
            initialValue={2}
            rules={[{ required: true, message: '请输入CPU核心数' }]}
          >
            <InputNumber min={1} max={16} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="内存 (MB)"
            name="memoryMB"
            initialValue={4096}
            rules={[{ required: true, message: '请输入内存大小' }]}
          >
            <InputNumber min={1024} max={32768} step={1024} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="存储 (MB)"
            name="storageMB"
            initialValue={10240}
            rules={[{ required: true, message: '请输入存储大小' }]}
          >
            <InputNumber min={2048} max={102400} step={1024} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

CreateDeviceModal.displayName = 'CreateDeviceModal';
