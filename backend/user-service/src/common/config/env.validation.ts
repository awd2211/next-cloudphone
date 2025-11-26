import * as Joi from 'joi';

/**
 * 环境变量验证 Schema
 * 使用 Joi 进行环境变量验证，在应用启动时确保所有必需的配置都已正确设置
 */
export const envValidationSchema = Joi.object({
  // ===== 运行环境 =====
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(30001),

  // ===== 数据库配置 =====
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),

  // 数据库连接池配置
  DB_POOL_MIN: Joi.number().min(1).default(2),
  DB_POOL_MAX: Joi.number().min(2).default(20),
  DB_CONNECTION_TIMEOUT: Joi.number().default(10000),
  DB_IDLE_TIMEOUT: Joi.number().default(30000),
  DB_STATEMENT_TIMEOUT: Joi.number().default(30000),

  // ===== Redis 配置 =====
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().min(0).max(15).default(0),
  REDIS_CACHE_DB: Joi.number().min(0).max(15).default(1),

  // ===== JWT 配置 =====
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET must be at least 32 characters for security',
    'any.required': 'JWT_SECRET is required',
  }),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // ===== CORS 配置 =====
  CORS_ORIGINS: Joi.string().optional(),

  // ===== RabbitMQ 配置 =====
  RABBITMQ_URL: Joi.string().uri({ scheme: ['amqp', 'amqps'] }).required(),
  RABBITMQ_EXCHANGE: Joi.string().default('cloudphone.events'),
  RABBITMQ_QUEUE_PREFIX: Joi.string().default('user-service'),

  // ===== Consul 配置 =====
  CONSUL_HOST: Joi.string().default('localhost'),
  CONSUL_PORT: Joi.number().port().default(8500),
  CONSUL_SERVICE_NAME: Joi.string().default('user-service'),
  CONSUL_SERVICE_PORT: Joi.number().port().default(30001),

  // ===== 限流配置 =====
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
  PUBLIC_THROTTLE_TTL: Joi.number().default(60),
  PUBLIC_THROTTLE_LIMIT: Joi.number().default(500),
  STRICT_THROTTLE_TTL: Joi.number().default(60),
  STRICT_THROTTLE_LIMIT: Joi.number().default(10),

  // ===== 用户配置 =====
  PASSWORD_MIN_LENGTH: Joi.number().min(6).max(128).default(8),
  PASSWORD_REQUIRE_UPPERCASE: Joi.boolean().default(true),
  PASSWORD_REQUIRE_LOWERCASE: Joi.boolean().default(true),
  PASSWORD_REQUIRE_NUMBER: Joi.boolean().default(true),
  PASSWORD_REQUIRE_SPECIAL: Joi.boolean().default(false),

  MAX_LOGIN_ATTEMPTS: Joi.number().min(1).default(5),
  LOGIN_LOCK_DURATION: Joi.number().default(900),

  SESSION_TIMEOUT: Joi.number().default(1800),
  SESSION_ABSOLUTE_TIMEOUT: Joi.number().default(86400),

  // ===== 多租户配置 =====
  MULTI_TENANCY_ENABLED: Joi.boolean().default(true),
  DEFAULT_TENANT_ID: Joi.string().default('default'),

  // ===== 配额配置 =====
  DEFAULT_MAX_DEVICES: Joi.number().min(0).default(10),
  DEFAULT_MAX_STORAGE_GB: Joi.number().min(0).default(100),
  DEFAULT_MAX_TRAFFIC_GB: Joi.number().min(0).default(1000),
  DEFAULT_MAX_CPU_CORES: Joi.number().min(0).default(20),
  DEFAULT_MAX_MEMORY_GB: Joi.number().min(0).default(40),

  // ===== 邮件配置 =====
  SMTP_ENABLED: Joi.boolean().default(true),
  SMTP_HOST: Joi.string().when('SMTP_ENABLED', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().when('SMTP_ENABLED', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_PASS: Joi.string().when('SMTP_ENABLED', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_FROM: Joi.string().email().optional(),

  // ===== 验证码配置 =====
  CAPTCHA_ENABLED: Joi.boolean().default(true),
  CAPTCHA_LENGTH: Joi.number().min(4).max(8).default(4),
  CAPTCHA_EXPIRY: Joi.number().default(300),

  // ===== API Keys 配置 =====
  API_KEY_PREFIX: Joi.string().default('cp_'),
  API_KEY_LENGTH: Joi.number().min(16).max(64).default(32),
  API_KEY_EXPIRY_DAYS: Joi.number().min(1).default(365),

  // ===== 审计日志配置 =====
  AUDIT_LOG_ENABLED: Joi.boolean().default(true),
  AUDIT_LOG_RETENTION_DAYS: Joi.number().min(1).default(90),

  // ===== 事件溯源配置 =====
  EVENT_SOURCING_ENABLED: Joi.boolean().default(true),
  SNAPSHOT_INTERVAL: Joi.number().min(1).default(10),
  SNAPSHOT_RETENTION: Joi.number().min(1).default(100),

  // ===== 缓存配置 =====
  CACHE_ENABLED: Joi.boolean().default(true),
  CACHE_TTL: Joi.number().default(300),
  CACHE_WARMUP_ON_START: Joi.boolean().default(true),
  CACHE_WARMUP_USER_LIMIT: Joi.number().min(1).max(1000).default(100),

  // ===== 熔断器配置 =====
  CIRCUIT_BREAKER_TIMEOUT: Joi.number().default(30000),
  CIRCUIT_BREAKER_ERROR_THRESHOLD: Joi.number().min(0).max(100).default(50),
  CIRCUIT_BREAKER_VOLUME_THRESHOLD: Joi.number().min(1).default(10),

  // ===== 健康检查配置 =====
  HEALTH_CHECK_ENABLED: Joi.boolean().default(true),
  HEALTH_CHECK_DATABASE: Joi.boolean().default(true),
  HEALTH_CHECK_REDIS: Joi.boolean().default(true),
  HEALTH_CHECK_RABBITMQ: Joi.boolean().default(true),

  DB_POOL_WARNING_THRESHOLD: Joi.number().min(0).max(100).default(70),
  DB_POOL_CRITICAL_THRESHOLD: Joi.number().min(0).max(100).default(90),

  // ===== 监控配置 =====
  METRICS_ENABLED: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(30001),
  METRICS_PATH: Joi.string().default('/metrics'),

  // ===== 分布式追踪配置 =====
  TRACING_ENABLED: Joi.boolean().default(true),
  JAEGER_AGENT_HOST: Joi.string().default('localhost'),
  JAEGER_AGENT_PORT: Joi.number().port().default(6831),
  JAEGER_SAMPLER_TYPE: Joi.string()
    .valid('const', 'probabilistic', 'ratelimiting', 'remote')
    .default('const'),
  JAEGER_SAMPLER_PARAM: Joi.number().min(0).max(1).default(1),

  // ===== 日志配置 =====
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error', 'fatal').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'pretty').default('json'),
  LOG_FILE_ENABLED: Joi.boolean().default(false),
  LOG_FILE_PATH: Joi.string().optional(),

  // ===== 外部服务 URL =====
  DEVICE_SERVICE_URL: Joi.string().uri().optional(),
  BILLING_SERVICE_URL: Joi.string().uri().optional(),
  NOTIFICATION_SERVICE_URL: Joi.string().uri().optional(),
  APP_SERVICE_URL: Joi.string().uri().optional(),
  API_GATEWAY_URL: Joi.string().uri().optional(),

  // ===== IP 过滤配置 =====
  IP_FILTER_ENABLED: Joi.boolean().default(false),
  IP_WHITELIST: Joi.string().optional(),
  IP_BLACKLIST: Joi.string().optional(),

  // ===== 安全配置 =====
  CSRF_ENABLED: Joi.boolean().default(false),
  CSRF_COOKIE_NAME: Joi.string().default('XSRF-TOKEN'),

  COOKIE_SECRET: Joi.string().min(16).optional(),
  COOKIE_SECURE: Joi.boolean().default(false),
  COOKIE_HTTP_ONLY: Joi.boolean().default(true),
  COOKIE_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),

  // ===== 2FA 配置 =====
  TWO_FACTOR_ENABLED: Joi.boolean().default(false),
  TWO_FACTOR_ISSUER: Joi.string().default('CloudPhone Platform'),

  // ===== 工单系统配置 =====
  TICKET_AUTO_ASSIGN: Joi.boolean().default(true),
  TICKET_CLOSE_AFTER_DAYS: Joi.number().min(1).default(30),

  // ===== Bull 队列配置 =====
  BULL_REDIS_HOST: Joi.string().default('localhost'),
  BULL_REDIS_PORT: Joi.number().port().default(6379),
  BULL_REDIS_DB: Joi.number().min(0).max(15).default(2),

  // ===== 性能优化 =====
  SLOW_QUERY_LOG_ENABLED: Joi.boolean().default(true),
  SLOW_QUERY_THRESHOLD_MS: Joi.number().min(0).default(1000),

  REQUEST_LOG_ENABLED: Joi.boolean().default(true),
  REQUEST_LOG_BODY: Joi.boolean().default(false),

  // ===== 开发配置 =====
  DEV_AUTO_SEED: Joi.boolean().default(false),
  DEV_RESET_DB: Joi.boolean().default(false),
}).messages({
  'any.required': '{{#label}} is required',
  'string.uri': '{{#label}} must be a valid URI',
  'number.port': '{{#label}} must be a valid port number',
});

/**
 * 验证环境变量
 * @param config 环境变量对象
 * @returns 验证后的环境变量
 */
export function validate(config: Record<string, unknown>) {
  const { error, value } = envValidationSchema.validate(config, {
    abortEarly: false, // 返回所有错误
    allowUnknown: true, // 允许未知的环境变量
    stripUnknown: false, // 不删除未知的环境变量
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message).join('\n');
    throw new Error(`❌ Environment variable validation failed:\n${errorMessages}`);
  }

  return value;
}
