import React from 'react';
import { Row, Col } from 'antd';
import type { Coupon } from '@/services/activity';
import { CouponCard } from './CouponCard';

interface CouponGridProps {
  coupons: Coupon[];
  onShowDetail: (coupon: Coupon) => void;
  onUseCoupon: (coupon: Coupon) => void;
}

/**
 * 优惠券网格布局组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 响应式网格布局
 */
export const CouponGrid: React.FC<CouponGridProps> = React.memo(
  ({ coupons, onShowDetail, onUseCoupon }) => {
    return (
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {coupons.map((coupon) => (
          <Col xs={24} sm={12} lg={8} key={coupon.id}>
            <CouponCard coupon={coupon} onShowDetail={onShowDetail} onUseCoupon={onUseCoupon} />
          </Col>
        ))}
      </Row>
    );
  }
);

CouponGrid.displayName = 'CouponGrid';
