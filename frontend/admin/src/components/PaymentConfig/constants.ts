export const PAYMENT_METHODS = [
  'stripe',
  'paypal',
  'paddle',
  'wechat',
  'alipay',
  'balance',
] as const;

export const SUPPORTED_CURRENCIES = [
  'CNY',
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'AUD',
  'CAD',
  'CHF',
  'HKD',
  'SGD',
  'INR',
  'KRW',
] as const;

export const PROVIDER_NAME_MAP: Record<string, string> = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  paddle: 'Paddle',
  wechat: '微信支付',
  alipay: '支付宝',
};

export const METHOD_NAME_MAP: Record<string, string> = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  paddle: 'Paddle',
  wechat: '微信支付',
  alipay: '支付宝',
  balance: '余额支付',
};

export const CURRENCY_NAME_MAP: Record<string, string> = {
  CNY: '人民币 (CNY)',
  USD: '美元 (USD)',
  EUR: '欧元 (EUR)',
  GBP: '英镑 (GBP)',
  JPY: '日元 (JPY)',
  AUD: '澳元 (AUD)',
  CAD: '加元 (CAD)',
  CHF: '瑞士法郎 (CHF)',
  HKD: '港币 (HKD)',
  SGD: '新加坡元 (SGD)',
  INR: '印度卢比 (INR)',
  KRW: '韩元 (KRW)',
};

export const getProviderName = (provider: string): string => {
  return PROVIDER_NAME_MAP[provider] || provider;
};

export const getMethodName = (method: string): string => {
  return METHOD_NAME_MAP[method] || method;
};

export const getCurrencyName = (currency: string): string => {
  return CURRENCY_NAME_MAP[currency] || currency;
};

export const CONFIG_INFO_TEXTS = {
  envConfig: {
    title: '环境配置',
    description:
      '支付提供商的 API 密钥、模式等配置需要在后端环境变量中设置。请查看 backend/billing-service/.env 文件中的配置项。',
  },
  testMode: {
    title: '测试模式',
    description:
      '在测试模式下，支付不会实际扣款，仅用于功能测试。切换到生产模式前，请确保已配置正确的生产环境密钥。',
  },
  connectionTest: {
    title: '连接测试',
    description:
      '点击"测试连接"按钮可以验证支付提供商的配置是否正确。如果测试失败，请检查环境变量配置和网络连接。',
  },
};
