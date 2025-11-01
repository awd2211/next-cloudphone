import React, { useState } from 'react';
import { Modal, Form, Input, message, Alert, Space } from 'antd';
import { RollbackOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

interface RestoreSnapshotModalProps {
  visible: boolean;
  deviceId: string;
  deviceName: string;
  snapshotId?: string;
  snapshotName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const RestoreSnapshotModal: React.FC<RestoreSnapshotModalProps> = ({
  visible,
  deviceId,
  deviceName,
  snapshotId,
  snapshotName,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/devices/${deviceId}/snapshots/restore`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ snapshotId: values.snapshotId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '恢复快照失败');
      }

      message.success(data.message || '快照恢复成功，设备将重启');
      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (error: any) {
      message.error(error.message || '恢复快照失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <RollbackOutlined />
          恢复设备快照 - {deviceName}
        </Space>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      okText="确认恢复"
      cancelText="取消"
      okButtonProps={{ danger: true }}
      width={600}
    >
      <Alert
        message="重要警告"
        description={
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
              恢复快照将会:
            </div>
            <div>• ⚠️ 覆盖设备当前的所有数据和配置</div>
            <div>• ⚠️ 导致设备自动重启</div>
            <div>• ⚠️ 丢失快照创建后的所有变更</div>
            <div style={{ marginTop: 8, color: '#ff4d4f' }}>
              ⚠️ 此操作不可撤销,请谨慎操作!
            </div>
          </div>
        }
        type="error"
        showIcon
        icon={<ExclamationCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Alert
        message="操作说明"
        description={
          <div>
            <div>1. 确保当前设备的重要数据已备份</div>
            <div>2. 恢复过程中设备将重启,大约需要 3-5 分钟</div>
            <div>3. 恢复完成后,设备将回到快照创建时的状态</div>
            <div>4. 所有在快照之后安装的应用和数据将被删除</div>
          </div>
        }
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical" initialValues={{ snapshotId }}>
        <Form.Item
          name="snapshotId"
          label="快照 ID"
          rules={[{ required: true, message: '请输入快照 ID' }]}
          tooltip="快照的唯一标识符"
        >
          <Input
            placeholder="例如: snapshot-123456"
            prefix={<RollbackOutlined style={{ color: '#999' }} />}
            disabled={!!snapshotId}
          />
        </Form.Item>

        {snapshotName && (
          <Alert
            message={`快照名称: ${snapshotName}`}
            type="info"
            style={{ marginBottom: 16 }}
          />
        )}

        <Alert
          message="恢复后的操作建议"
          description={
            <div>
              <div>• 验证设备功能是否正常</div>
              <div>• 检查关键应用的数据完整性</div>
              <div>• 如有问题,可以再次创建新快照或恢复其他快照</div>
            </div>
          }
          type="info"
        />
      </Form>
    </Modal>
  );
};

export default RestoreSnapshotModal;
