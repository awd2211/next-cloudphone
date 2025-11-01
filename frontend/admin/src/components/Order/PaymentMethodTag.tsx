/**
 * 支付方式标签组件（Memo 优化）
 *
 * 优化原理：
 * 1. 使用 React.memo 避免不必要的重渲染
 * 2. 支付方式映射在模块级别定义（只创建一次）
 * 3. 只在 method 变化时重渲染
 */
import { memo } from 'react';

type PaymentMethod = 'wechat' | 'alipay' | 'balance';

interface PaymentMethodTagProps {
  method: PaymentMethod;
}

// ✅ 支付方式映射在模块级别定义（避免每次渲染都创建）
// 导出供其他组件使用（如导出数据）
export const PAYMENT_METHOD_MAP = {
  wechat: '微信支付',
  alipay: '支付宝',
  balance: '余额支付',
} as const;

export const PaymentMethodTag = memo<PaymentMethodTagProps>(({ method }) => {
  return <span>{PAYMENT_METHOD_MAP[method] || '-'}</span>;
});

PaymentMethodTag.displayName = 'PaymentMethodTag';
