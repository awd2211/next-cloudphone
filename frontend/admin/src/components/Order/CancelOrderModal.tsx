import { memo } from 'react';
import { Modal, Input } from 'antd';
import type { Order } from '@/types';

export interface CancelOrderModalProps {
  visible: boolean;
  order: Order | null;
  reason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 取消订单弹窗组件
 */
export const CancelOrderModal = memo<CancelOrderModalProps>(
  ({ visible, order, reason, onReasonChange, onConfirm, onCancel }) => {
    return (
      <Modal title="取消订单" open={visible} onCancel={onCancel} onOk={onConfirm}>
        <p>确定要取消订单 {order?.orderNo} 吗？</p>
        <Input.TextArea
          placeholder="取消原因（可选）"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={3}
        />
      </Modal>
    );
  }
);

CancelOrderModal.displayName = 'CancelOrderModal';
