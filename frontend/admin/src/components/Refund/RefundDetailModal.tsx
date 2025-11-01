import React from 'react';
import { Modal, Descriptions } from 'antd';
import dayjs from 'dayjs';
import type { PaymentDetail } from '@/services/payment-admin';
import { PaymentMethodTag } from './PaymentMethodTag';
import { PaymentStatusTag } from './PaymentStatusTag';

interface RefundDetailModalProps {
  visible: boolean;
  refund: PaymentDetail | null;
  onCancel: () => void;
}

export const RefundDetailModal: React.FC<RefundDetailModalProps> = React.memo(
  ({ visible, refund, onCancel }) => {
    if (!refund) return null;

    const currencySymbol =
      refund.currency === 'CNY' ? '¥' : refund.currency === 'USD' ? '$' : refund.currency;

    return (
      <Modal title="退款详情" open={visible} onCancel={onCancel} footer={null} width={700}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="支付单号" span={2}>
            {refund.paymentNo}
          </Descriptions.Item>
          <Descriptions.Item label="订单号" span={2}>
            {refund.order?.orderNo || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="用户ID">{refund.userId}</Descriptions.Item>
          <Descriptions.Item label="交易号">{refund.transactionId || '-'}</Descriptions.Item>
          <Descriptions.Item label="支付金额">
            {currencySymbol}
            {refund.amount.toFixed(2)}
          </Descriptions.Item>
          <Descriptions.Item label="支付方式">
            <PaymentMethodTag method={refund.method} />
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <PaymentStatusTag status={refund.status} />
          </Descriptions.Item>
          <Descriptions.Item label="客户ID">{refund.customerId || '-'}</Descriptions.Item>
          <Descriptions.Item label="支付时间" span={2}>
            {refund.paidAt ? dayjs(refund.paidAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间" span={2}>
            {dayjs(refund.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间" span={2}>
            {dayjs(refund.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          {refund.metadata && (
            <Descriptions.Item label="元数据" span={2}>
              <pre style={{ margin: 0, fontSize: '12px' }}>
                {JSON.stringify(refund.metadata, null, 2)}
              </pre>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Modal>
    );
  }
);

RefundDetailModal.displayName = 'RefundDetailModal';
