import { memo } from 'react';
import { Modal, Form, Input, InputNumber } from 'antd';
import type { FormInstance } from 'antd';
import type { PaymentDetail } from '@/services/payment-admin';

export interface RefundModalProps {
  visible: boolean;
  loading: boolean;
  form: FormInstance;
  payment: PaymentDetail | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * 退款对话框组件
 */
export const RefundModal = memo<RefundModalProps>(
  ({ visible, loading, form, payment, onCancel, onConfirm }) => {
    return (
      <Modal
        title="手动退款"
        open={visible}
        onCancel={onCancel}
        onOk={onConfirm}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="支付单号">
            <Input value={payment?.paymentNo} disabled />
          </Form.Item>

          <Form.Item label="支付金额">
            <Input
              value={
                payment
                  ? `${payment.currency === 'CNY' ? '¥' : payment.currency === 'USD' ? '$' : payment.currency}${payment.amount.toFixed(2)}`
                  : ''
              }
              disabled
            />
          </Form.Item>

          <Form.Item
            label="退款金额（留空则全额退款）"
            name="amount"
            rules={[
              {
                validator: (_, value) => {
                  if (value && payment && value > payment.amount) {
                    return Promise.reject('退款金额不能大于支付金额');
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              min={0.01}
              max={payment?.amount}
              precision={2}
              style={{ width: '100%' }}
              placeholder="不填写则全额退款"
            />
          </Form.Item>

          <Form.Item
            label="退款原因"
            name="reason"
            rules={[{ required: true, message: '请输入退款原因' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入退款原因" />
          </Form.Item>

          <Form.Item label="管理员备注" name="adminNote">
            <Input.TextArea rows={2} placeholder="可选的管理员备注" />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

RefundModal.displayName = 'RefundModal';
