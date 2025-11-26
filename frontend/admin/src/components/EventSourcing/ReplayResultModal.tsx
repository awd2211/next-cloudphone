import { memo } from 'react';
import { Modal, Alert, Descriptions } from 'antd';
import { NEUTRAL_LIGHT } from '@/theme';

interface ReplayResultModalProps {
  visible: boolean;
  result: any;
  onClose: () => void;
}

/**
 * 重放结果Modal组件
 * 显示事件重放后的用户状态
 */
export const ReplayResultModal = memo<ReplayResultModalProps>(({ visible, result, onClose }) => {
  return (
    <Modal title="重放结果" open={visible} onCancel={onClose} footer={null} width={800}>
      {result && (
        <>
          <Alert
            message="重放成功"
            description="已通过事件重放重建用户状态"
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Descriptions bordered column={1}>
            <Descriptions.Item label="用户状态">
              <pre
                style={{
                  maxHeight: '500px',
                  overflow: 'auto',
                  background: NEUTRAL_LIGHT.bg.layout,
                  padding: '12px',
                  borderRadius: '4px',
                  margin: 0,
                }}
              >
                {JSON.stringify(result, null, 2)}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        </>
      )}
    </Modal>
  );
});

ReplayResultModal.displayName = 'ReplayResultModal';
