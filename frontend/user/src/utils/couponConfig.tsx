import {
  GiftOutlined,
  PercentageOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { Coupon } from '@/services/activity';
import { CouponStatus } from '@/services/activity';

/**
 * 优惠券类型配置
 */
export const couponTypeConfig = {
  discount: {
    icon: <PercentageOutlined />,
    color: '#ff4d4f',
    text: '折扣券',
    getValueText: (value: number) => `${value}折`,
  },
  cash: {
    icon: <DollarOutlined />,
    color: '#faad14',
    text: '代金券',
    getValueText: (value: number) => `¥${value}`,
  },
  gift: {
    icon: <GiftOutlined />,
    color: '#52c41a',
    text: '礼品券',
    getValueText: (_value: number, name: string) => name,
  },
  full_discount: {
    icon: <PercentageOutlined />,
    color: '#1890ff',
    text: '满减券',
    getValueText: (value: number) => `¥${value}`,
  },
} as const;

/**
 * 优惠券状态配置
 */
export const statusConfig: Record<
  CouponStatus,
  {
    label: string;
    color: 'success' | 'default' | 'error';
    icon: React.ReactNode;
  }
> = {
  [CouponStatus.AVAILABLE]: {
    label: '可用',
    color: 'success',
    icon: <CheckCircleOutlined />,
  },
  [CouponStatus.USED]: {
    label: '已使用',
    color: 'default',
    icon: <CheckCircleOutlined />,
  },
  [CouponStatus.EXPIRED]: {
    label: '已过期',
    color: 'error',
    icon: <CloseCircleOutlined />,
  },
};

/**
 * 获取优惠券类型配置
 */
export const getCouponTypeConfig = (coupon: Coupon) => {
  const config = couponTypeConfig[coupon.type as keyof typeof couponTypeConfig];
  return {
    ...config,
    valueText: config.getValueText(coupon.value, coupon.name),
  };
};

/**
 * 获取优惠券使用跳转路由
 */
export const getUsageRoute = (coupon: Coupon): { path: string; state: any } => {
  const couponType = coupon.type;

  if (couponType === 'discount') {
    // 折扣券：跳转到套餐购买页面
    return {
      path: '/plans',
      state: { selectedCoupon: coupon.id },
    };
  } else if (couponType === 'cash') {
    // 代金券：跳转到充值页面
    return {
      path: '/billing/recharge',
      state: { selectedCoupon: coupon.id },
    };
  } else {
    // 其他类型：跳转到套餐页面
    return {
      path: '/plans',
      state: { selectedCoupon: coupon.id },
    };
  }
};

/**
 * 获取优惠券使用提示消息
 */
export const getUsageMessage = (coupon: Coupon): string => {
  const couponType = coupon.type;

  if (couponType === 'discount') {
    return '已选择优惠券，请选择套餐完成购买';
  } else if (couponType === 'cash') {
    return '已选择优惠券，请完成充值';
  } else {
    return '请选择套餐使用优惠券';
  }
};
