import * as Joi from 'joi';

/**
 * App Service 环境变量验证 Schema
 */
export const envValidationSchema = Joi.object({
  // ===== 运行环境 =====
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(30003),

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

  // ===== MinIO / S3 配置 =====
  MINIO_ENABLED: Joi.boolean().default(true),
  MINIO_ENDPOINT: Joi.string().when('MINIO_ENABLED', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  MINIO_PORT: Joi.number().port().default(9000),
  MINIO_USE_SSL: Joi.boolean().default(false),
  MINIO_ACCESS_KEY: Joi.string().when('MINIO_ENABLED', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  MINIO_SECRET_KEY: Joi.string().when('MINIO_ENABLED', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  MINIO_BUCKET: Joi.string().default('cloudphone-apps'),

  // ===== APK 上传配置 =====
  MAX_FILE_SIZE: Joi.number().min(1048576).default(104857600), // 100MB
  ALLOWED_FILE_TYPES: Joi.string().default('application/vnd.android.package-archive'),
  UPLOAD_TEMP_DIR: Joi.string().default('/tmp/uploads'),

  // ===== APK 解析配置 =====
  APK_PARSER_ENABLED: Joi.boolean().default(true),
  APK_SIGNATURE_VERIFICATION: Joi.boolean().default(true),

  // ===== ADB 配置 =====
  ADB_HOST: Joi.string().default('localhost'),
  ADB_PORT: Joi.number().port().default(5037),
  ADB_CONNECTION_TIMEOUT: Joi.number().default(5000),
  ADB_INSTALL_TIMEOUT: Joi.number().default(60000),

  // ===== 应用商店配置 =====
  APP_STORE_ENABLED: Joi.boolean().default(true),
  APP_REVIEW_REQUIRED: Joi.boolean().default(true),
  AUTO_APPROVE_UPDATES: Joi.boolean().default(false),

  // ===== 应用分类 =====
  ENABLE_CATEGORIES: Joi.boolean().default(true),
  DEFAULT_CATEGORY: Joi.string().default('其他'),

  // ===== RabbitMQ 配置 =====
  RABBITMQ_URL: Joi.string().uri().required(),
  RABBITMQ_EXCHANGE: Joi.string().default('cloudphone.events'),
  RABBITMQ_QUEUE_PREFIX: Joi.string().default('app-service'),

  // ===== Consul 配置 =====
  CONSUL_HOST: Joi.string().default('localhost'),
  CONSUL_PORT: Joi.number().port().default(8500),
  CONSUL_SERVICE_NAME: Joi.string().default('app-service'),
  CONSUL_SERVICE_PORT: Joi.number().port().default(30003),

  // ===== 健康检查配置 =====
  HEALTH_CHECK_ENABLED: Joi.boolean().default(true),

  // ===== 监控配置 =====
  METRICS_ENABLED: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(30003),
  METRICS_PATH: Joi.string().default('/metrics'),

  // ===== 日志配置 =====
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error', 'fatal').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'pretty').default('json'),

  // ===== 外部服务 URL =====
  DEVICE_SERVICE_URL: Joi.string().uri().optional(),
  USER_SERVICE_URL: Joi.string().uri().optional(),
  NOTIFICATION_SERVICE_URL: Joi.string().uri().optional(),

  // ===== CORS 配置 =====
  CORS_ORIGINS: Joi.string().optional(),

  // ===== 限流配置 =====
  RATE_LIMIT_TTL: Joi.number().default(60),
  RATE_LIMIT_MAX: Joi.number().default(100),
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
