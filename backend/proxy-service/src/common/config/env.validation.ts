import * as Joi from 'joi';

/**
 * Proxy Service 环境变量验证 Schema
 * 使用 Joi 进行环境变量验证，在应用启动时确保所有必需的配置都已正确设置
 */
export const envValidationSchema = Joi.object({
  // ===== 运行环境 =====
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(30007),
  SERVICE_NAME: Joi.string().default('proxy-service'),

  // ===== CORS 配置 =====
  CORS_ORIGIN: Joi.string().optional(),

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
  DB_APPLICATION_NAME: Joi.string().default('proxy-service'),
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
  RABBITMQ_QUEUE_PREFIX: Joi.string().default('proxy-service'),
  RABBITMQ_PREFETCH_COUNT: Joi.number().min(1).default(10),
  RABBITMQ_RETRY_ATTEMPTS: Joi.number().min(1).default(3),
  RABBITMQ_RETRY_DELAY: Joi.number().default(1000),

  // ===== Consul 配置 =====
  CONSUL_HOST: Joi.string().default('localhost'),
  CONSUL_PORT: Joi.number().port().default(8500),
  CONSUL_SERVICE_NAME: Joi.string().default('proxy-service'),
  CONSUL_SERVICE_PORT: Joi.number().port().default(30007),

  // ===== 代理池配置 =====
  POOL_MIN_SIZE: Joi.number().min(0).default(1000),
  POOL_TARGET_SIZE: Joi.number().min(0).default(2000),
  POOL_MAX_SIZE: Joi.number().min(0).default(5000),
  POOL_REFRESH_INTERVAL: Joi.number().default(600000),

  // ===== 健康检查配置 =====
  HEALTH_CHECK_INTERVAL: Joi.number().default(120000),
  HEALTH_CHECK_TIMEOUT: Joi.number().default(10000),
  HEALTH_CHECK_RETRIES: Joi.number().min(1).default(3),

  // ===== 成本控制配置 =====
  MONTHLY_BUDGET: Joi.number().min(0).default(3000),
  COST_ALERT_THRESHOLD: Joi.number().min(0).max(1).default(0.8),
  COST_PROTECTION_THRESHOLD: Joi.number().min(0).max(1).default(0.95),

  // ===== IPRoyal 配置 =====
  IPROYAL_USERNAME: Joi.string().allow('').optional(),
  IPROYAL_PASSWORD: Joi.string().allow('').optional(),
  IPROYAL_API_KEY: Joi.string().allow('').optional(),
  IPROYAL_API_URL: Joi.string().uri().allow('').default('https://resi-api.iproyal.com/v1'),

  // ===== Bright Data 配置 =====
  BRIGHTDATA_API_KEY: Joi.string().allow('').optional(),
  BRIGHTDATA_ZONE: Joi.string().allow('').default('residential'),
  BRIGHTDATA_USERNAME: Joi.string().allow('').optional(),
  BRIGHTDATA_PASSWORD: Joi.string().allow('').optional(),
  BRIGHTDATA_API_URL: Joi.string().uri().allow('').default('https://api.brightdata.com'),
  BRIGHTDATA_COST_PER_GB: Joi.number().min(0).default(10),

  // ===== Oxylabs 配置 =====
  OXYLABS_USERNAME: Joi.string().allow('').optional(),
  OXYLABS_PASSWORD: Joi.string().allow('').optional(),
  OXYLABS_API_URL: Joi.string().uri().allow('').default('https://api.oxylabs.io'),
  OXYLABS_PROXY_TYPE: Joi.string().valid('residential', 'datacenter').default('residential'),
  OXYLABS_COST_PER_GB: Joi.number().min(0).default(12),

  // ===== IPIDEA 配置 =====
  IPIDEA_API_KEY: Joi.string().allow('').optional(),
  IPIDEA_USERNAME: Joi.string().allow('').optional(),
  IPIDEA_PASSWORD: Joi.string().allow('').optional(),
  IPIDEA_API_URL: Joi.string().uri().allow('').default('https://api.ipidea.net'),
  IPIDEA_PROXY_TYPE: Joi.string()
    .valid('residential', 'datacenter', 'mobile', 'isp')
    .default('residential'),
  IPIDEA_COST_PER_GB: Joi.number().min(0).default(3),
  IPIDEA_GATEWAY: Joi.string().allow('').optional(),
  IPIDEA_PORT: Joi.number().port().default(2336),

  // ===== Kookeey 配置 =====
  KOOKEEY_API_KEY: Joi.string().allow('').optional(),
  KOOKEEY_USERNAME: Joi.string().allow('').optional(),
  KOOKEEY_PASSWORD: Joi.string().allow('').optional(),
  KOOKEEY_API_URL: Joi.string().uri().allow('').optional(),
  KOOKEEY_COST_PER_GB: Joi.number().min(0).default(5),

  // ===== SmartProxy 配置 =====
  SMARTPROXY_USERNAME: Joi.string().allow('').optional(),
  SMARTPROXY_PASSWORD: Joi.string().allow('').optional(),
  SMARTPROXY_API_URL: Joi.string().uri().allow('').optional(),
  SMARTPROXY_COST_PER_GB: Joi.number().min(0).default(4),

  // ===== 日志配置 =====
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error', 'fatal').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'pretty').default('json'),

  // ===== 监控配置 =====
  METRICS_ENABLED: Joi.boolean().default(true),
  PROMETHEUS_PORT: Joi.number().port().default(30008),
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
