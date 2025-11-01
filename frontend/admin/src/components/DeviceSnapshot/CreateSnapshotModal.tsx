import React, { useState } from 'react';
import { Modal, Form, Input, message, Alert, Space } from 'antd';
import { CameraOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface CreateSnapshotModalProps {
  visible: boolean;
  deviceId: string;
  deviceName: string;
  onClose: () => void;
  onSuccess?: (snapshotId: string) => void;
}

const CreateSnapshotModal: React.FC<CreateSnapshotModalProps> = ({
  visible,
  deviceId,
  deviceName,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/devices/${deviceId}/snapshots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '创建快照失败');
      }

      message.success(data.message || '快照创建成功');
      form.resetFields();
      onSuccess?.(data.data?.snapshotId);
      onClose();
    } catch (error: any) {
      message.error(error.message || '创建快照失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <CameraOutlined />
          创建设备快照 - {deviceName}
        </Space>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      okText="创建快照"
      cancelText="取消"
      width={600}
    >
      <Alert
        message="仅阿里云 ECP 设备支持"
        description="快照功能仅支持阿里云弹性云手机,可以完整备份设备状态"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Alert
        message="快照说明"
        description={
          <div>
            <div>• 快照将备份设备的完整状态 (应用、数据、配置等)</div>
            <div>• 创建快照不会影响设备当前运行状态</div>
            <div>• 建议在重要操作前创建快照以便恢复</div>
            <div>• 快照创建可能需要几分钟时间</div>
          </div>
        }
        type="warning"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="快照名称"
          rules={[
            { required: true, message: '请输入快照名称' },
            { max: 100, message: '快照名称不能超过100个字符' },
            {
              pattern: /^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/,
              message: '快照名称只能包含字母、数字、中文、下划线和连字符',
            },
          ]}
          tooltip="给快照起一个易于识别的名称"
        >
          <Input
            placeholder="例如: backup-before-upgrade"
            prefix={<CameraOutlined style={{ color: '#999' }} />}
            maxLength={100}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="快照描述"
          rules={[{ max: 500, message: '描述不能超过500个字符' }]}
          tooltip="添加快照的详细说明 (可选)"
        >
          <TextArea
            placeholder="例如: 升级应用前的完整备份,包含所有用户数据和配置"
            rows={4}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Alert
          message="快照命名建议"
          description={
            <div>
              <div>• 包含日期: backup-2025-11-01</div>
              <div>• 说明场景: before-upgrade, after-config</div>
              <div>• 版本标识: v1.2.0-snapshot</div>
            </div>
          }
          type="info"
          style={{ marginTop: 8 }}
        />
      </Form>
    </Modal>
  );
};

export default CreateSnapshotModal;
