import React, { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';
import type { PaymentDetail } from '@/services/payment-admin';

interface RefundApproveModalProps {
  visible: boolean;
  refund: PaymentDetail | null;
  onCancel: () => void;
  onSubmit: (values: { adminNote?: string }) => Promise<void>;
}

export const RefundApproveModal: React.FC<RefundApproveModalProps> = React.memo(
  ({ visible, refund, onCancel, onSubmit }) => {
    const [form] = Form.useForm();

    useEffect(() => {
      if (!visible) {
        form.resetFields();
      }
    }, [visible, form]);

    const handleOk = () => {
      form.submit();
    };

    const currencySymbol = refund
      ? refund.currency === 'CNY'
        ? '¥'
        : refund.currency === 'USD'
          ? '$'
          : refund.currency
      : '';

    return (
      <Modal title="批准退款" open={visible} onCancel={onCancel} onOk={handleOk}>
        <Form form={form} onFinish={onSubmit} layout="vertical">
          <Form.Item label="支付单号">
            <Input value={refund?.paymentNo} disabled />
          </Form.Item>

          <Form.Item label="退款金额">
            <Input
              value={refund ? `${currencySymbol}${refund.amount.toFixed(2)}` : ''}
              disabled
            />
          </Form.Item>

          <Form.Item label="管理员备注" name="adminNote">
            <Input.TextArea rows={3} placeholder="可选的管理员备注（批准原因、处理说明等）" />
          </Form.Item>

          <div style={{ color: '#999', fontSize: '12px' }}>
            ⚠️ 批准后将立即向支付平台发起退款请求，请确认无误后操作。
          </div>
        </Form>
      </Modal>
    );
  }
);

RefundApproveModal.displayName = 'RefundApproveModal';
