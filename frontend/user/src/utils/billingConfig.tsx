import { BillType, BillStatus, PaymentMethod } from '@/services/billing';

/**
 * 账单配置文件
 * 集中管理账单类型、状态、支付方式的显示配置
 */

// 账单类型配置
export const billTypeConfig: Record<BillType, { label: string; color: string }> = {
  [BillType.SUBSCRIPTION]: { label: '订阅费', color: 'blue' },
  [BillType.USAGE]: { label: '使用费', color: 'cyan' },
  [BillType.RECHARGE]: { label: '充值', color: 'green' },
  [BillType.REFUND]: { label: '退款', color: 'orange' },
  [BillType.PENALTY]: { label: '违约金', color: 'red' },
  [BillType.DISCOUNT]: { label: '折扣', color: 'purple' },
  [BillType.COUPON]: { label: '优惠券', color: 'magenta' },
  [BillType.COMMISSION]: { label: '佣金', color: 'gold' },
};

// 状态配置
export const statusConfig: Record<BillStatus, { label: string; color: string }> = {
  [BillStatus.PENDING]: { label: '待支付', color: 'warning' },
  [BillStatus.PAID]: { label: '已支付', color: 'success' },
  [BillStatus.CANCELLED]: { label: '已取消', color: 'default' },
  [BillStatus.REFUNDED]: { label: '已退款', color: 'processing' },
  [BillStatus.OVERDUE]: { label: '已逾期', color: 'error' },
  [BillStatus.PARTIAL]: { label: '部分支付', color: 'warning' },
};

// 支付方式配置
export const paymentMethodConfig: Record<PaymentMethod, { label: string; color: string }> = {
  [PaymentMethod.BALANCE]: { label: '余额支付', color: 'blue' },
  [PaymentMethod.ALIPAY]: { label: '支付宝', color: 'cyan' },
  [PaymentMethod.WECHAT]: { label: '微信支付', color: 'green' },
  [PaymentMethod.CREDIT_CARD]: { label: '信用卡', color: 'gold' },
  [PaymentMethod.PAYPAL]: { label: 'PayPal', color: 'geekblue' },
};

/**
 * 获取状态步骤索引
 */
export const getStatusStep = (status: BillStatus): number => {
  const statusMap: Record<BillStatus, number> = {
    [BillStatus.PENDING]: 0,
    [BillStatus.OVERDUE]: 0,
    [BillStatus.PAID]: 1,
    [BillStatus.CANCELLED]: -1,
    [BillStatus.REFUNDED]: 2,
    [BillStatus.PARTIAL]: 0,
  };
  return statusMap[status] >= 0 ? statusMap[status] : 0;
};
