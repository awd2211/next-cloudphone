import { memo } from 'react';
import { Modal } from 'antd';
import type { Order } from '@/types';
import dayjs from 'dayjs';

export interface OrderDetailModalProps {
  visible: boolean;
  order: Order | null;
  onCancel: () => void;
}

/**
 * 订单详情弹窗组件
 */
export const OrderDetailModal = memo<OrderDetailModalProps>(({ visible, order, onCancel }) => {
  return (
    <Modal title="订单详情" open={visible} onCancel={onCancel} footer={null} width={600}>
      {order && (
        <div>
          <p>
            <strong>订单号：</strong>
            {order.orderNo}
          </p>
          <p>
            <strong>用户：</strong>
            {order.user?.username}
          </p>
          <p>
            <strong>套餐：</strong>
            {order.plan?.name}
          </p>
          <p>
            <strong>金额：</strong>¥{order.amount.toFixed(2)}
          </p>
          <p>
            <strong>支付方式：</strong>
            {order.paymentMethod || '-'}
          </p>
          <p>
            <strong>状态：</strong>
            {order.status}
          </p>
          <p>
            <strong>创建时间：</strong>
            {dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </p>
          {order.paidAt && (
            <p>
              <strong>支付时间：</strong>
              {dayjs(order.paidAt).format('YYYY-MM-DD HH:mm:ss')}
            </p>
          )}
          {order.cancelledAt && (
            <p>
              <strong>取消时间：</strong>
              {dayjs(order.cancelledAt).format('YYYY-MM-DD HH:mm:ss')}
            </p>
          )}
          {order.expiresAt && (
            <p>
              <strong>过期时间：</strong>
              {dayjs(order.expiresAt).format('YYYY-MM-DD HH:mm:ss')}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
});

OrderDetailModal.displayName = 'OrderDetailModal';
