import React, { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';
import type { PaymentDetail } from '@/services/payment-admin';

interface RefundRejectModalProps {
  visible: boolean;
  refund: PaymentDetail | null;
  onCancel: () => void;
  onSubmit: (values: { reason: string; adminNote?: string }) => Promise<void>;
}

export const RefundRejectModal: React.FC<RefundRejectModalProps> = React.memo(
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
      <Modal title="拒绝退款" open={visible} onCancel={onCancel} onOk={handleOk}>
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

          <Form.Item
            label="拒绝原因"
            name="reason"
            rules={[{ required: true, message: '请输入拒绝原因' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入拒绝退款的原因（将通知用户）" />
          </Form.Item>

          <Form.Item label="管理员备注" name="adminNote">
            <Input.TextArea rows={2} placeholder="可选的管理员内部备注" />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

RefundRejectModal.displayName = 'RefundRejectModal';
