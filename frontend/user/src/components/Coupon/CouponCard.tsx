import React from 'react';
import { Card, Tag, Space, Button } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import type { Coupon } from '@/services/activity';
import { CouponStatus } from '@/services/activity';
import { getCouponTypeConfig, statusConfig } from '@/utils/couponConfig';

interface CouponCardProps {
  coupon: Coupon;
  onShowDetail: (coupon: Coupon) => void;
  onUseCoupon: (coupon: Coupon) => void;
}

/**
 * 优惠券卡片组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 配置驱动的类型和状态显示
 * - 条件渲染水印和操作按钮
 */
export const CouponCard: React.FC<CouponCardProps> = React.memo(
  ({ coupon, onShowDetail, onUseCoupon }) => {
    const isAvailable = coupon.status === CouponStatus.AVAILABLE;
    const isUsed = coupon.status === CouponStatus.USED;

    const typeConfig = getCouponTypeConfig(coupon);
    const statusCfg = statusConfig[coupon.status];

    return (
      <Card
        hoverable={isAvailable}
        onClick={() => onShowDetail(coupon)}
        style={{
          position: 'relative',
          overflow: 'hidden',
          opacity: isAvailable ? 1 : 0.6,
        }}
      >
        {/* 已使用/已过期水印 */}
        {!isAvailable && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-30deg)',
              fontSize: 48,
              fontWeight: 'bold',
              color: isUsed ? '#52c41a' : '#ff4d4f',
              opacity: 0.2,
              zIndex: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {isUsed ? '已使用' : '已过期'}
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* 顶部标签 */}
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Tag icon={typeConfig.icon} color={typeConfig.color}>
                {typeConfig.text}
              </Tag>
              <Tag color={statusCfg.color} icon={statusCfg.icon}>
                {statusCfg.label}
              </Tag>
            </Space>
          </div>

          {/* 优惠券金额/折扣 */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 'bold',
              color: typeConfig.color,
              marginBottom: 12,
            }}
          >
            {typeConfig.valueText}
          </div>

          {/* 优惠券名称 */}
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{coupon.name}</div>

          {/* 使用条件 */}
          {coupon.minAmount && (
            <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
              满 ¥{coupon.minAmount} 可用
            </div>
          )}

          {/* 活动来源 */}
          {coupon.activityTitle && (
            <div style={{ fontSize: 12, color: '#1890ff', marginBottom: 8 }}>
              来自: {coupon.activityTitle}
            </div>
          )}

          {/* 有效期 */}
          <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {new Date(coupon.startTime).toLocaleDateString()} -{' '}
            {new Date(coupon.endTime).toLocaleDateString()}
          </div>

          {/* 优惠券码 */}
          <div
            style={{
              background: '#f5f5f5',
              padding: '8px 12px',
              borderRadius: 4,
              fontSize: 14,
              fontFamily: 'monospace',
              marginBottom: 12,
            }}
          >
            {coupon.code}
          </div>

          {/* 使用记录 */}
          {isUsed && coupon.usedAt && (
            <div style={{ fontSize: 12, color: '#52c41a' }}>
              使用时间: {new Date(coupon.usedAt).toLocaleString()}
            </div>
          )}

          {/* 操作按钮 */}
          {isAvailable && (
            <Button
              type="primary"
              block
              onClick={(e) => {
                e.stopPropagation();
                onUseCoupon(coupon);
              }}
            >
              立即使用
            </Button>
          )}
        </div>
      </Card>
    );
  }
);

CouponCard.displayName = 'CouponCard';
