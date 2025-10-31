import * as Joi from 'joi';

/**
 * Billing Service 环境变量验证 Schema
 */
export const envValidationSchema = Joi.object({
  // ===== 运行环境 =====
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(30005),

  // ===== 数据库配置 =====
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),

  // ===== Redis 配置 =====
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // ===== JWT 配置 =====
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),

  // ===== 计费配置 =====
  BILLING_CURRENCY: Joi.string().valid('CNY', 'USD', 'EUR').default('CNY'),
  BILLING_CYCLE: Joi.string().valid('hourly', 'daily', 'monthly').default('hourly'),
  PRICE_PER_HOUR: Joi.number().min(0).default(1.0),
  PRICE_PER_GB_STORAGE: Joi.number().min(0).default(0.1),
  PRICE_PER_GB_TRAFFIC: Joi.number().min(0).default(0.5),

  // ===== 套餐配置 =====
  ENABLE_PACKAGE_PLANS: Joi.boolean().default(true),
  FREE_TRIAL_DURATION: Joi.number().min(0).default(72),
  FREE_TRIAL_CREDITS: Joi.number().min(0).default(100),

  // ===== 订单配置 =====
  ORDER_TIMEOUT: Joi.number().min(60).default(1800),
  ORDER_AUTO_CANCEL: Joi.boolean().default(true),
  INVOICE_GENERATION: Joi.boolean().default(true),

  // ===== 微信支付 =====
  WECHAT_PAY_ENABLED: Joi.boolean().default(false),
  WECHAT_APP_ID: Joi.string().optional(),
  WECHAT_MCH_ID: Joi.string().optional(),
  WECHAT_SERIAL_NO: Joi.string().optional(),
  WECHAT_API_V3_KEY: Joi.string().optional(),

  // ===== 支付宝 =====
  ALIPAY_ENABLED: Joi.boolean().default(false),
  ALIPAY_APP_ID: Joi.string().optional(),
  ALIPAY_PRIVATE_KEY: Joi.string().optional(),
  ALIPAY_PUBLIC_KEY: Joi.string().optional(),
  ALIPAY_GATEWAY: Joi.string().uri().default('https://openapi.alipay.com/gateway.do'),

  // ===== PayPal =====
  PAYPAL_ENABLED: Joi.boolean().default(true),
  PAYPAL_MODE: Joi.string().valid('sandbox', 'production').default('sandbox'),
  PAYPAL_SANDBOX_CLIENT_ID: Joi.string().optional(),
  PAYPAL_SANDBOX_SECRET: Joi.string().optional(),
  PAYPAL_LIVE_CLIENT_ID: Joi.string().optional(),
  PAYPAL_LIVE_SECRET: Joi.string().optional(),
  PAYPAL_WEBHOOK_ID: Joi.string().optional(),

  // ===== Paddle =====
  PADDLE_ENABLED: Joi.boolean().default(true),
  PADDLE_ENVIRONMENT: Joi.string().valid('sandbox', 'production').default('sandbox'),
  PADDLE_API_KEY: Joi.string().optional(),
  PADDLE_WEBHOOK_SECRET: Joi.string().optional(),

  // ===== Stripe =====
  STRIPE_ENABLED: Joi.boolean().default(true),
  STRIPE_MODE: Joi.string().valid('test', 'live').default('test'),
  STRIPE_TEST_PUBLIC_KEY: Joi.string().optional(),
  STRIPE_TEST_SECRET_KEY: Joi.string().optional(),
  STRIPE_LIVE_PUBLIC_KEY: Joi.string().optional(),
  STRIPE_LIVE_SECRET_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),

  // ===== 账单配置 =====
  INVOICE_EMAIL_ENABLED: Joi.boolean().default(true),
  INVOICE_AUTO_SEND: Joi.boolean().default(true),
  INVOICE_GENERATION_DAY: Joi.number().min(1).max(31).default(1),

  // ===== 欠费处理 =====
  ENABLE_OVERDUE_CHECK: Joi.boolean().default(true),
  OVERDUE_GRACE_PERIOD: Joi.number().min(0).default(3),
  OVERDUE_SUSPEND_DEVICES: Joi.boolean().default(true),

  // ===== 汇率 API =====
  EXCHANGE_RATE_API_KEY: Joi.string().allow('').optional(),

  // ===== 前端 URL =====
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
  API_GATEWAY_URL: Joi.string().uri().default('http://localhost:30000'),

  // ===== 服务地址 =====
  DEVICE_SERVICE_URL: Joi.string().uri().optional(),
  USER_SERVICE_URL: Joi.string().uri().optional(),

  // ===== 日志配置 =====
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'dev', 'pretty').default('json'),

  // ===== RabbitMQ 配置 =====
  RABBITMQ_URL: Joi.string().uri().optional(),
  RABBITMQ_EXCHANGE: Joi.string().default('cloudphone.events'),

  // ===== Consul 配置 =====
  CONSUL_HOST: Joi.string().default('localhost'),
  CONSUL_PORT: Joi.number().port().default(8500),
}).messages({
  'any.required': '{{#label}} is required',
  'string.uri': '{{#label}} must be a valid URI',
  'number.port': '{{#label}} must be a valid port number',
});

export function validate(config: Record<string, unknown>) {
  const { error, value } = envValidationSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false,
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message).join('\n');
    throw new Error(`❌ Environment variable validation failed:\n${errorMessages}`);
  }

  return value;
}
