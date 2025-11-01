import React from 'react';
import { Modal, Button } from 'antd';
import type { Coupon } from '@/services/activity';
import { CouponStatus } from '@/services/activity';

interface CouponDetailModalProps {
  coupon: Coupon | null;
  onClose: () => void;
  onUseCoupon: (coupon: Coupon) => void;
}

/**
 * 优惠券详情弹窗组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 条件渲染底部按钮（可用时显示"立即使用"）
 */
export const CouponDetailModal: React.FC<CouponDetailModalProps> = React.memo(
  ({ coupon, onClose, onUseCoupon }) => {
    if (!coupon) return null;

    const isAvailable = coupon.status === CouponStatus.AVAILABLE;

    return (
      <Modal
        title="优惠券详情"
        open={!!coupon}
        onCancel={onClose}
        footer={
          isAvailable
            ? [
                <Button key="cancel" onClick={onClose}>
                  关闭
                </Button>,
                <Button
                  key="use"
                  type="primary"
                  onClick={() => {
                    onUseCoupon(coupon);
                    onClose();
                  }}
                >
                  立即使用
                </Button>,
              ]
            : [
                <Button key="close" onClick={onClose}>
                  关闭
                </Button>,
              ]
        }
      >
        <div>
          <p>
            <strong>优惠券名称:</strong> {coupon.name}
          </p>
          <p>
            <strong>优惠券码:</strong>{' '}
            <code style={{ background: '#f5f5f5', padding: '2px 8px' }}>{coupon.code}</code>
          </p>
          <p>
            <strong>类型:</strong>{' '}
            {
              {
                discount: '折扣券',
                cash: '代金券',
                gift: '礼品券',
                full_discount: '满减券',
              }[coupon.type]
            }
          </p>
          <p>
            <strong>面额:</strong>{' '}
            {coupon.type === 'discount' ? `${coupon.value}折` : `¥${coupon.value}`}
          </p>
          {coupon.minAmount && (
            <p>
              <strong>使用条件:</strong> 满 ¥{coupon.minAmount} 可用
            </p>
          )}
          <p>
            <strong>有效期:</strong> {new Date(coupon.startTime).toLocaleDateString()} -{' '}
            {new Date(coupon.endTime).toLocaleDateString()}
          </p>
          {coupon.activityTitle && (
            <p>
              <strong>活动来源:</strong> {coupon.activityTitle}
            </p>
          )}
          {coupon.usedAt && (
            <p>
              <strong>使用时间:</strong> {new Date(coupon.usedAt).toLocaleString()}
            </p>
          )}
        </div>
      </Modal>
    );
  }
);

CouponDetailModal.displayName = 'CouponDetailModal';
