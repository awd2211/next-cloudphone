import * as Joi from 'joi';

/**
 * Notification Service 环境变量验证 Schema
 */
export const envValidationSchema = Joi.object({
  // ===== 运行环境 =====
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(30006),

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
  REDIS_DB: Joi.number().min(0).max(15).default(0),
  REDIS_CACHE_DB: Joi.number().min(0).max(15).default(1),

  // ===== JWT 配置 =====
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),

  // ===== CORS 配置 =====
  CORS_ORIGINS: Joi.string().optional(),

  // ===== RabbitMQ 配置 =====
  RABBITMQ_URL: Joi.string().uri().required(),
  RABBITMQ_EXCHANGE: Joi.string().default('cloudphone.events'),
  RABBITMQ_QUEUE_PREFIX: Joi.string().default('notification-service'),
  RABBITMQ_PREFETCH_COUNT: Joi.number().min(1).default(10),
  RABBITMQ_RETRY_ATTEMPTS: Joi.number().min(1).default(3),
  RABBITMQ_RETRY_DELAY: Joi.number().default(1000),
  RABBITMQ_DLX_EXCHANGE: Joi.string().default('cloudphone.notifications.dlx'),
  RABBITMQ_DLX_QUEUE: Joi.string().default('notification-service.dlx'),

  // ===== Consul 配置 =====
  CONSUL_HOST: Joi.string().default('localhost'),
  CONSUL_PORT: Joi.number().port().default(8500),
  CONSUL_SERVICE_NAME: Joi.string().default('notification-service'),
  CONSUL_SERVICE_PORT: Joi.number().port().default(30006),

  // ===== WebSocket 配置 =====
  WS_ENABLED: Joi.boolean().default(true),
  WS_PORT: Joi.number().port().default(30006),
  WS_PATH: Joi.string().default('/ws'),
  WS_CORS_ENABLED: Joi.boolean().default(true),
  WS_HEARTBEAT_INTERVAL: Joi.number().default(30000),
  WS_HEARTBEAT_TIMEOUT: Joi.number().default(90000),
  WS_MAX_CONNECTIONS: Joi.number().min(1).default(10000),
  WS_AUTH_REQUIRED: Joi.boolean().default(true),
  WS_AUTH_TIMEOUT: Joi.number().default(5000),

  // ===== 邮件配置 =====
  EMAIL_ENABLED: Joi.boolean().default(true),
  SMTP_HOST: Joi.string().when('EMAIL_ENABLED', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().when('EMAIL_ENABLED', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_PASS: Joi.string().when('EMAIL_ENABLED', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  EMAIL_FROM: Joi.string().email().optional(),
  EMAIL_FROM_NAME: Joi.string().default('CloudPhone Platform'),
  EMAIL_TEMPLATE_DIR: Joi.string().default('./src/email/templates'),
  EMAIL_DEFAULT_LOCALE: Joi.string().default('zh-CN'),
  EMAIL_RATE_LIMIT: Joi.number().min(1).default(100),
  EMAIL_RETRY_ATTEMPTS: Joi.number().min(1).default(3),
  EMAIL_RETRY_DELAY: Joi.number().default(5000),

  // ===== SMS 配置 =====
  SMS_ENABLED: Joi.boolean().default(false),
  ALIYUN_SMS_ACCESS_KEY_ID: Joi.string().optional(),
  ALIYUN_SMS_ACCESS_KEY_SECRET: Joi.string().optional(),
  ALIYUN_SMS_SIGN_NAME: Joi.string().default('云手机平台'),
  ALIYUN_SMS_REGION: Joi.string().default('cn-hangzhou'),

  // ===== 推送通知配置 =====
  FCM_ENABLED: Joi.boolean().default(false),
  FCM_SERVER_KEY: Joi.string().optional(),
  FCM_PROJECT_ID: Joi.string().optional(),
  APNS_ENABLED: Joi.boolean().default(false),
  APNS_PRODUCTION: Joi.boolean().default(false),

  // ===== 通知模板配置 =====
  TEMPLATE_STORAGE: Joi.string().valid('database', 'file').default('database'),
  TEMPLATE_CACHE_ENABLED: Joi.boolean().default(true),
  TEMPLATE_CACHE_TTL: Joi.number().default(3600),
  TEMPLATE_VALIDATE_VARIABLES: Joi.boolean().default(true),

  // ===== 通知配置 =====
  NOTIFICATION_DEDUP_ENABLED: Joi.boolean().default(true),
  NOTIFICATION_DEDUP_WINDOW: Joi.number().default(300),
  NOTIFICATION_PRIORITY_HIGH_DELAY: Joi.number().default(0),
  NOTIFICATION_PRIORITY_NORMAL_DELAY: Joi.number().default(5000),
  NOTIFICATION_PRIORITY_LOW_DELAY: Joi.number().default(30000),
  NOTIFICATION_RETENTION_DAYS: Joi.number().min(1).default(90),
  NOTIFICATION_BATCH_SIZE: Joi.number().min(1).default(100),
  NOTIFICATION_BATCH_DELAY: Joi.number().default(1000),

  // ===== 事件消费者配置 =====
  CONSUME_DEVICE_EVENTS: Joi.boolean().default(true),
  CONSUME_USER_EVENTS: Joi.boolean().default(true),
  CONSUME_BILLING_EVENTS: Joi.boolean().default(true),
  CONSUME_APP_EVENTS: Joi.boolean().default(true),
  CONSUME_SYSTEM_EVENTS: Joi.boolean().default(true),
  CONSUME_MEDIA_EVENTS: Joi.boolean().default(true),
  CONSUME_SCHEDULER_EVENTS: Joi.boolean().default(true),

  // ===== 通知渠道优先级 =====
  NOTIFICATION_CHANNEL_PRIORITY: Joi.string().default('websocket,email,sms,push'),
  NOTIFICATION_FALLBACK_ENABLED: Joi.boolean().default(true),

  // ===== 健康检查配置 =====
  HEALTH_CHECK_ENABLED: Joi.boolean().default(true),
  HEALTH_CHECK_DATABASE: Joi.boolean().default(true),
  HEALTH_CHECK_REDIS: Joi.boolean().default(true),
  HEALTH_CHECK_RABBITMQ: Joi.boolean().default(true),
  HEALTH_CHECK_SMTP: Joi.boolean().default(true),

  // ===== 监控配置 =====
  METRICS_ENABLED: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(30006),
  METRICS_PATH: Joi.string().default('/metrics'),
  METRICS_TRACK_SEND_RATE: Joi.boolean().default(true),
  METRICS_TRACK_DELIVERY_RATE: Joi.boolean().default(true),
  METRICS_TRACK_CHANNEL_USAGE: Joi.boolean().default(true),

  // ===== 日志配置 =====
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error', 'fatal').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'pretty').default('json'),
  LOG_FILE_ENABLED: Joi.boolean().default(false),
  LOG_FILE_PATH: Joi.string().optional(),
  LOG_MASK_EMAIL: Joi.boolean().default(true),
  LOG_MASK_PHONE: Joi.boolean().default(true),

  // ===== 外部服务 URL =====
  USER_SERVICE_URL: Joi.string().uri().optional(),
  DEVICE_SERVICE_URL: Joi.string().uri().optional(),
  BILLING_SERVICE_URL: Joi.string().uri().optional(),
  API_GATEWAY_URL: Joi.string().uri().optional(),

  // ===== 限流配置 =====
  RATE_LIMIT_TTL: Joi.number().default(60),
  RATE_LIMIT_MAX: Joi.number().default(100),
  USER_NOTIFICATION_LIMIT: Joi.number().default(50),
  USER_EMAIL_LIMIT: Joi.number().default(20),
  USER_SMS_LIMIT: Joi.number().default(10),

  // ===== 安全配置 =====
  COOKIE_SECRET: Joi.string().min(16).optional(),
  COOKIE_SECURE: Joi.boolean().default(false),
  COOKIE_HTTP_ONLY: Joi.boolean().default(true),

  // ===== 性能优化 =====
  EMAIL_POOL_SIZE: Joi.number().min(1).default(5),
  SMS_POOL_SIZE: Joi.number().min(1).default(10),
  NOTIFICATION_QUEUE_CONCURRENCY: Joi.number().min(1).default(10),
  DB_QUERY_CACHE_ENABLED: Joi.boolean().default(true),
  DB_QUERY_CACHE_TTL: Joi.number().default(60),

  // ===== Webhook 配置 =====
  WEBHOOK_ENABLED: Joi.boolean().default(false),
  WEBHOOK_URL: Joi.string().uri().optional(),
  WEBHOOK_SECRET: Joi.string().optional(),
  WEBHOOK_RETRY_ATTEMPTS: Joi.number().min(1).default(3),

  // ===== 开发配置 =====
  DEV_AUTO_SEED_TEMPLATES: Joi.boolean().default(false),
  DEV_MOCK_EMAIL: Joi.boolean().default(false),
  DEV_MOCK_SMS: Joi.boolean().default(false),
  DEV_LOG_EMAIL_CONTENT: Joi.boolean().default(true),
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
