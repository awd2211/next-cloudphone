import * as Joi from 'joi';

/**
 * API Gateway 环境变量验证 Schema
 */
export const envValidationSchema = Joi.object({
  // ===== 运行环境 =====
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(30000),

  // ===== 数据库配置 =====
  // API Gateway 不需要数据库，但保留配置以防需要
  DB_HOST: Joi.string().optional(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().optional(),
  DB_PASSWORD: Joi.string().optional(),
  DB_DATABASE: Joi.string().optional(),

  // ===== Redis 配置 =====
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // ===== JWT 配置 =====
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET must be at least 32 characters for security',
    'any.required': 'JWT_SECRET is required and must match all other services',
  }),
  JWT_EXPIRES_IN: Joi.string().default('24h'),

  // ===== 微服务地址 =====
  USER_SERVICE_URL: Joi.string().uri().required().messages({
    'any.required': 'USER_SERVICE_URL is required for proxying requests',
  }),
  DEVICE_SERVICE_URL: Joi.string().uri().required().messages({
    'any.required': 'DEVICE_SERVICE_URL is required for proxying requests',
  }),
  APP_SERVICE_URL: Joi.string().uri().required().messages({
    'any.required': 'APP_SERVICE_URL is required for proxying requests',
  }),
  SCHEDULER_SERVICE_URL: Joi.string().uri().optional(),
  BILLING_SERVICE_URL: Joi.string().uri().optional(),
  MEDIA_SERVICE_URL: Joi.string().uri().optional(),

  // ===== 限流配置 =====
  RATE_LIMIT_TTL: Joi.number().min(1).default(60),
  RATE_LIMIT_MAX: Joi.number().min(1).default(100),

  // Global rate limiting (per IP)
  GLOBAL_RATE_LIMIT_ENABLED: Joi.boolean().default(true),
  GLOBAL_RATE_LIMIT_TTL: Joi.number().default(60),
  GLOBAL_RATE_LIMIT_MAX: Joi.number().default(1000),

  // Per-user rate limiting
  USER_RATE_LIMIT_ENABLED: Joi.boolean().default(true),
  USER_RATE_LIMIT_TTL: Joi.number().default(60),
  USER_RATE_LIMIT_MAX: Joi.number().default(500),

  // ===== CORS 配置 =====
  CORS_ORIGIN: Joi.string().optional(),
  CORS_CREDENTIALS: Joi.boolean().default(true),

  // ===== 代理配置 =====
  PROXY_TIMEOUT: Joi.number().min(1000).default(30000),
  PROXY_MAX_REDIRECTS: Joi.number().min(0).default(5),

  // Circuit breaker配置
  CIRCUIT_BREAKER_ENABLED: Joi.boolean().default(true),
  CIRCUIT_BREAKER_TIMEOUT: Joi.number().default(30000),
  CIRCUIT_BREAKER_ERROR_THRESHOLD: Joi.number().min(0).max(100).default(50),
  CIRCUIT_BREAKER_VOLUME_THRESHOLD: Joi.number().min(1).default(10),

  // ===== 重试配置 =====
  RETRY_ENABLED: Joi.boolean().default(true),
  RETRY_ATTEMPTS: Joi.number().min(0).max(10).default(3),
  RETRY_DELAY: Joi.number().default(1000),

  // ===== 缓存配置 =====
  RESPONSE_CACHE_ENABLED: Joi.boolean().default(false),
  RESPONSE_CACHE_TTL: Joi.number().default(60),

  // ===== 健康检查配置 =====
  HEALTH_CHECK_ENABLED: Joi.boolean().default(true),
  HEALTH_CHECK_INTERVAL: Joi.number().default(30),

  // ===== 监控配置 =====
  METRICS_ENABLED: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(30000),
  METRICS_PATH: Joi.string().default('/metrics'),

  // ===== 日志配置 =====
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error', 'fatal').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'pretty').default('json'),

  // Request logging
  LOG_REQUESTS: Joi.boolean().default(true),
  LOG_RESPONSES: Joi.boolean().default(false),
  LOG_REQUEST_BODY: Joi.boolean().default(false),
  LOG_RESPONSE_BODY: Joi.boolean().default(false),

  // ===== Consul 配置 =====
  CONSUL_HOST: Joi.string().default('localhost'),
  CONSUL_PORT: Joi.number().port().default(8500),
  CONSUL_SERVICE_NAME: Joi.string().default('api-gateway'),
  CONSUL_SERVICE_PORT: Joi.number().port().default(30000),

  // Service discovery
  SERVICE_DISCOVERY_ENABLED: Joi.boolean().default(true),
  SERVICE_DISCOVERY_INTERVAL: Joi.number().default(30),

  // ===== 安全配置 =====
  // API Key authentication
  API_KEY_ENABLED: Joi.boolean().default(false),
  API_KEY_HEADER: Joi.string().default('X-API-Key'),

  // IP filtering
  IP_FILTER_ENABLED: Joi.boolean().default(false),
  IP_WHITELIST: Joi.string().optional(),
  IP_BLACKLIST: Joi.string().optional(),

  // Request size limits
  MAX_REQUEST_SIZE: Joi.string().default('10mb'),
  MAX_JSON_SIZE: Joi.string().default('1mb'),

  // ===== 开发配置 =====
  DEV_SHOW_ERRORS: Joi.boolean().default(false),
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
