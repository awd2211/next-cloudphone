import React from 'react';
import { Modal, Space, Alert, Input, message } from 'antd';

interface TriggerFailoverModalProps {
  visible: boolean;
  loading: boolean;
  deviceId: string;
  onDeviceIdChange: (value: string) => void;
  onOk: () => void;
  onCancel: () => void;
}

export const TriggerFailoverModal: React.FC<TriggerFailoverModalProps> = React.memo(
  ({ visible, loading, deviceId, onDeviceIdChange, onOk, onCancel }) => {
    const handleOk = () => {
      if (!deviceId) {
        message.warning('请输入设备ID');
        return;
      }
      onOk();
    };

    return (
      <Modal
        title="触发故障转移"
        open={visible}
        onOk={handleOk}
        onCancel={onCancel}
        confirmLoading={loading}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message="警告"
            description="手动触发故障转移会导致设备短暂不可用，请谨慎操作。"
            type="warning"
            showIcon
          />
          <Input
            placeholder="请输入设备ID"
            value={deviceId}
            onChange={(e) => onDeviceIdChange(e.target.value)}
          />
        </Space>
      </Modal>
    );
  }
);

TriggerFailoverModal.displayName = 'TriggerFailoverModal';
