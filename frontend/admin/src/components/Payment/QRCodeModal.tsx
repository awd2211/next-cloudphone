import { memo } from 'react';
import { Modal, Image } from 'antd';
import type { PaymentDetail } from '@/services/payment-admin';

export interface QRCodeModalProps {
  visible: boolean;
  payment: PaymentDetail | null;
  onCancel: () => void;
}

/**
 * 支付二维码对话框组件
 */
export const QRCodeModal = memo<QRCodeModalProps>(({ visible, payment, onCancel }) => {
  return (
    <Modal title="支付二维码" open={visible} onCancel={onCancel} footer={null}>
      {payment?.paymentUrl && (
        <div style={{ textAlign: 'center' }}>
          <Image
            src={payment.paymentUrl}
            alt="支付二维码"
            width={300}
            height={300}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          />
          <p style={{ marginTop: 16 }}>
            请使用{payment.method === 'wechat' ? '微信' : '支付宝'}扫码支付
          </p>
          <p>金额: ¥{payment.amount.toFixed(2)}</p>
        </div>
      )}
    </Modal>
  );
});

QRCodeModal.displayName = 'QRCodeModal';
