import { memo } from 'react';
import { Modal, Alert, Form, Select, Input } from 'antd';
import type { Device } from '@/types';

const { TextArea } = Input;

export interface CreateSnapshotModalProps {
  visible: boolean;
  loading: boolean;
  devices: Device[];
  form: any;
  onOk: () => void;
  onCancel: () => void;
  onFinish: (values: any) => void;
}

/**
 * 创建快照模态框组件
 */
export const CreateSnapshotModal = memo<CreateSnapshotModalProps>(
  ({ visible, loading, devices, form, onOk, onCancel, onFinish }) => {
    const deviceOptions = devices.map((device) => ({
      label: `${device.name || device.id} - ${device.status}`,
      value: device.id,
    }));

    return (
      <Modal
        title="创建设备快照"
        open={visible}
        onCancel={onCancel}
        onOk={onOk}
        confirmLoading={loading}
        width={600}
      >
        <Alert
          message="提示"
          description="创建快照可能需要几分钟时间，具体取决于设备的存储使用情况。在创建快照期间，建议停止设备以确保数据一致性。"
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item
            label="选择设备"
            name="deviceId"
            rules={[{ required: true, message: '请选择设备' }]}
          >
            <Select
              showSearch
              placeholder="请选择要创建快照的设备"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={deviceOptions}
            />
          </Form.Item>
          <Form.Item
            label="快照名称"
            name="name"
            rules={[{ required: true, message: '请输入快照名称' }]}
          >
            <Input placeholder="例如：系统备份_v1.0" />
          </Form.Item>
          <Form.Item label="快照描述" name="description">
            <TextArea rows={3} placeholder="记录快照的用途或包含的重要变更" />
          </Form.Item>
        </Form>
      </Modal>
    );
  },
);

CreateSnapshotModal.displayName = 'CreateSnapshotModal';
