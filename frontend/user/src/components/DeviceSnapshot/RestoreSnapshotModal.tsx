import React from 'react';
import { Modal, Alert, Typography } from 'antd';
import { restoreSnapshotWarning, type Snapshot } from '@/utils/snapshotConfig';
import dayjs from 'dayjs';

const { Text } = Typography;

interface RestoreSnapshotModalProps {
  visible: boolean;
  snapshot: Snapshot | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * 恢复快照 Modal 组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 配置驱动的警告信息
 * - 清晰的快照信息显示
 */
export const RestoreSnapshotModal: React.FC<RestoreSnapshotModalProps> = React.memo(
  ({ visible, snapshot, onCancel, onConfirm }) => {
    return (
      <Modal
        title="恢复快照"
        open={visible}
        onCancel={onCancel}
        onOk={onConfirm}
        okText="确认恢复"
        okButtonProps={{ danger: true }}
        cancelText="取消"
      >
        <Alert
          message={restoreSnapshotWarning.message}
          description={restoreSnapshotWarning.description}
          type={restoreSnapshotWarning.type}
          showIcon
          style={{ marginBottom: 16 }}
        />
        {snapshot && (
          <div>
            <Text strong>快照信息：</Text>
            <div style={{ marginTop: 8 }}>
              <p>名称: {snapshot.name}</p>
              <p>描述: {snapshot.description || '无'}</p>
              <p>创建时间: {dayjs(snapshot.createdAt).format('YYYY-MM-DD HH:mm:ss')}</p>
            </div>
          </div>
        )}
      </Modal>
    );
  }
);

RestoreSnapshotModal.displayName = 'RestoreSnapshotModal';
