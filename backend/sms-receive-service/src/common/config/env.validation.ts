import * as Joi from 'joi';

/**
 * SMS Receive Service 环境变量验证 Schema
 * 使用 Joi 进行环境变量验证，在应用启动时确保所有必需的配置都已正确设置
 */
export const envValidationSchema = Joi.object({
  // ===== 运行环境 =====
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(30008),
  SERVICE_NAME: Joi.string().default('sms-receive-service'),

  // ===== 数据库配置 =====
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),

  // 数据库连接池配置
  DB_POOL_MIN: Joi.number().min(1).default(2),
  DB_POOL_MAX: Joi.number().min(2).default(9),
  DB_CONNECTION_TIMEOUT: Joi.number().default(10000),
  DB_IDLE_TIMEOUT: Joi.number().default(30000),
  DB_SOFT_IDLE_TIMEOUT: Joi.number().default(60000),
  DB_STATEMENT_TIMEOUT: Joi.number().default(30000),
  DB_QUERY_TIMEOUT: Joi.number().default(30000),
  DB_MAX_LIFETIME: Joi.number().default(1800),
  DB_PREPARED_STATEMENT_CACHE_QUERIES: Joi.number().default(256),
  DB_PREPARED_STATEMENT_CACHE_SIZE: Joi.number().default(25),
  DB_SLOW_QUERY_THRESHOLD: Joi.number().default(1000),
  DB_EVICTION_RUN_INTERVAL: Joi.number().default(10000),
  DB_APPLICATION_NAME: Joi.string().default('sms-receive-service'),
  DB_SSL_REJECT_UNAUTHORIZED: Joi.boolean().default(true),

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

  // ===== RabbitMQ 配置 =====
  RABBITMQ_URL: Joi.string().uri().required(),
  RABBITMQ_EXCHANGE: Joi.string().default('cloudphone.events'),
  RABBITMQ_QUEUE_PREFIX: Joi.string().default('sms-receive-service'),

  // ===== Consul 配置 =====
  CONSUL_HOST: Joi.string().default('localhost'),
  CONSUL_PORT: Joi.number().port().default(8500),
  CONSUL_SERVICE_NAME: Joi.string().default('sms-receive-service'),
  CONSUL_SERVICE_PORT: Joi.number().port().default(30008),

  // ===== SMS 提供商配置 =====
  // SMS-Activate
  SMS_ACTIVATE_API_KEY: Joi.string().optional(),
  SMS_ACTIVATE_BASE_URL: Joi.string()
    .uri()
    .default('https://api.sms-activate.org/stubs/handler_api.php'),

  // 5sim
  FIVESIM_API_KEY: Joi.string().optional(),
  FIVESIM_BASE_URL: Joi.string().uri().default('https://5sim.net/v1'),

  // SMS-Man
  SMS_MAN_API_KEY: Joi.string().optional(),
  SMS_MAN_BASE_URL: Joi.string()
    .uri()
    .default('https://api.sms-man.com/stubs/handler_api.php'),

  // SMSPVA
  SMSPVA_API_KEY: Joi.string().optional(),
  SMSPVA_BASE_URL: Joi.string().uri().default('https://beta.smspva.com/api/'),

  // OnlineSim
  ONLINESIM_API_KEY: Joi.string().optional(),
  ONLINESIM_BASE_URL: Joi.string().uri().default('https://onlinesim.io/api/'),

  // API 密钥加密密钥（用于解密数据库中存储的 API 密钥）
  ENCRYPTION_KEY: Joi.string().min(16).default('default-key-change-in-production'),

  // ===== 号码池配置 =====
  NUMBER_POOL_MIN_SIZE: Joi.number().min(0).default(100),
  NUMBER_POOL_TARGET_SIZE: Joi.number().min(0).default(200),
  NUMBER_POOL_MAX_SIZE: Joi.number().min(0).default(500),
  NUMBER_POOL_REFRESH_INTERVAL: Joi.number().default(300000), // 5分钟

  // ===== 消息轮询配置 =====
  MESSAGE_POLLING_INTERVAL: Joi.number().default(10000), // 10秒
  MESSAGE_POLLING_TIMEOUT: Joi.number().default(5000), // 5秒
  MESSAGE_MAX_AGE: Joi.number().default(3600000), // 1小时

  // ===== 验证码配置 =====
  VERIFICATION_CODE_CACHE_TTL: Joi.number().default(600), // 10分钟（秒）
  VERIFICATION_CODE_RETRY_LIMIT: Joi.number().min(1).default(5),

  // ===== A/B 测试配置 =====
  AB_TEST_ENABLED: Joi.boolean().default(true),
  AB_TEST_TRAFFIC_SPLIT: Joi.number().min(0).max(100).default(50),

  // ===== 黑名单配置 =====
  BLACKLIST_ENABLED: Joi.boolean().default(true),
  BLACKLIST_AUTO_ADD: Joi.boolean().default(true),
  BLACKLIST_THRESHOLD: Joi.number().min(1).default(3),

  // ===== 日志配置 =====
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error', 'fatal').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'pretty').default('json'),

  // ===== 健康检查配置 =====
  HEALTH_CHECK_ENABLED: Joi.boolean().default(true),
  HEALTH_CHECK_DATABASE: Joi.boolean().default(true),
  HEALTH_CHECK_REDIS: Joi.boolean().default(true),
  HEALTH_CHECK_RABBITMQ: Joi.boolean().default(true),

  // ===== 监控配置 =====
  METRICS_ENABLED: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(30008),
  METRICS_PATH: Joi.string().default('/metrics'),
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
