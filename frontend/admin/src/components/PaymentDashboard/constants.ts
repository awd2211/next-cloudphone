/**
 * Payment Dashboard 常量和工具函数
 */

export interface PaymentMethodStat {
  method: string;
  count: number;
  percentage: string;
  totalAmount: string;
  amountPercentage: string;
}

export const METHOD_NAME_MAP: Record<string, string> = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  paddle: 'Paddle',
  wechat: '微信支付',
  alipay: '支付宝',
  balance: '余额支付',
};

export const METHOD_CONFIG: Record<string, { color: string; text: string }> = {
  stripe: { color: 'purple', text: 'Stripe' },
  paypal: { color: 'blue', text: 'PayPal' },
  paddle: { color: 'cyan', text: 'Paddle' },
  wechat: { color: 'green', text: '微信支付' },
  alipay: { color: 'blue', text: '支付宝' },
  balance: { color: 'orange', text: '余额支付' },
};

/**
 * 获取支付方式名称
 */
export const getMethodName = (method: string): string => {
  return METHOD_NAME_MAP[method] || method;
};

/**
 * 获取支付方式配置
 */
export const getMethodConfig = (method: string) => {
  return METHOD_CONFIG[method] || { color: 'default', text: method };
};
