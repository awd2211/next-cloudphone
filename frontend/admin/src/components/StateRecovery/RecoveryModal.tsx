import React from 'react';
import { Modal, Input, Select, Space, message } from 'antd';
import { TARGET_STATE_OPTIONS } from './constants';

interface RecoveryModalProps {
  visible: boolean;
  loading: boolean;
  deviceId: string;
  targetState: string;
  onDeviceIdChange: (value: string) => void;
  onTargetStateChange: (value: string) => void;
  onOk: () => void;
  onCancel: () => void;
}

export const RecoveryModal: React.FC<RecoveryModalProps> = React.memo(
  ({
    visible,
    loading,
    deviceId,
    targetState,
    onDeviceIdChange,
    onTargetStateChange,
    onOk,
    onCancel,
  }) => {
    const handleOk = () => {
      if (!deviceId || !targetState) {
        message.warning('请填写完整信息');
        return;
      }
      onOk();
    };

    return (
      <Modal
        title="恢复设备状态"
        open={visible}
        onOk={handleOk}
        onCancel={onCancel}
        confirmLoading={loading}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <div style={{ marginBottom: 8 }}>设备ID</div>
            <Input
              placeholder="请输入设备ID"
              value={deviceId}
              onChange={(e) => onDeviceIdChange(e.target.value)}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>目标状态</div>
            <Select
              placeholder="请选择目标状态"
              value={targetState}
              onChange={onTargetStateChange}
              style={{ width: '100%' }}
              options={TARGET_STATE_OPTIONS}
            />
          </div>
        </Space>
      </Modal>
    );
  }
);

RecoveryModal.displayName = 'RecoveryModal';
