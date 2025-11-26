import { memo } from 'react';
import { Modal, Form, InputNumber, Input } from 'antd';
import { NEUTRAL_LIGHT } from '@/theme';
import type { Order } from '@/types';

export interface RefundOrderModalProps {
  visible: boolean;
  order: Order | null;
  amount: number;
  reason: string;
  onAmountChange: (amount: number) => void;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 订单退款弹窗组件
 */
export const RefundOrderModal = memo<RefundOrderModalProps>(
  ({ visible, order, amount, reason, onAmountChange, onReasonChange, onConfirm, onCancel }) => {
    const getPaymentMethodText = (method: string) => {
      const map: Record<string, string> = {
        wechat: '微信支付',
        alipay: '支付宝',
        balance: '余额支付',
      };
      return map[method] || '-';
    };

    return (
      <Modal title="订单退款" open={visible} onCancel={onCancel} onOk={onConfirm}>
        <Form layout="vertical">
          <Form.Item label="订单信息">
            <div>
              <p>
                <strong>订单号：</strong>
                {order?.orderNo}
              </p>
              <p>
                <strong>订单金额：</strong>¥{order ? Number(order.amount).toFixed(2) : '0.00'}
              </p>
              <p>
                <strong>支付方式：</strong>
                {order?.paymentMethod ? getPaymentMethodText(order.paymentMethod) : '-'}
              </p>
            </div>
          </Form.Item>
          <Form.Item label="退款金额" required>
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              max={Number(order?.amount) || 0}
              precision={2}
              value={amount}
              onChange={(value) => onAmountChange(Number(value) || 0)}
              prefix="¥"
            />
            <div style={{ marginTop: 8, color: NEUTRAL_LIGHT.text.tertiary, fontSize: 12 }}>
              最多可退款 ¥{order ? Number(order.amount).toFixed(2) : '0.00'}
            </div>
          </Form.Item>
          <Form.Item label="退款原因" required>
            <Input.TextArea
              placeholder="请输入退款原因"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={4}
            />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

RefundOrderModal.displayName = 'RefundOrderModal';
