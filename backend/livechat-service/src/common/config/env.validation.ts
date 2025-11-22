import * as Joi from 'joi';

export function validate(config: Record<string, unknown>) {
  const schema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(30010),

    // Database
    DB_HOST: Joi.string().default('localhost'),
    DB_PORT: Joi.number().default(5432),
    DB_USERNAME: Joi.string().default('postgres'),
    DB_PASSWORD: Joi.string().default('postgres'),
    DB_DATABASE: Joi.string().default('cloudphone_livechat'),

    // Redis
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().allow('').default(''),
    REDIS_DB: Joi.number().default(0),

    // RabbitMQ
    RABBITMQ_URL: Joi.string().default('amqp://admin:admin123@localhost:5672/cloudphone'),

    // JWT
    JWT_SECRET: Joi.string().required(),
    JWT_EXPIRES_IN: Joi.string().default('7d'),

    // Consul
    CONSUL_HOST: Joi.string().default('localhost'),
    CONSUL_PORT: Joi.number().default(8500),

    // MinIO
    MINIO_ENDPOINT: Joi.string().default('localhost'),
    MINIO_PORT: Joi.number().default(9000),
    MINIO_ACCESS_KEY: Joi.string().default('minioadmin'),
    MINIO_SECRET_KEY: Joi.string().default('minioadmin'),
    MINIO_BUCKET: Joi.string().default('livechat-media'),
    MINIO_USE_SSL: Joi.boolean().default(false),

    // AI
    AI_ENABLED: Joi.boolean().default(true),
    AI_PROVIDER: Joi.string().valid('openai', 'azure', 'local').default('openai'),
    OPENAI_API_KEY: Joi.string().allow('').default(''),
    OPENAI_MODEL: Joi.string().default('gpt-4o-mini'),
    OPENAI_BASE_URL: Joi.string().default('https://api.openai.com/v1'),

    // Encryption
    ENCRYPTION_ENABLED: Joi.boolean().default(true),
    ENCRYPTION_KEY: Joi.string().min(32).default('your-32-character-encryption-key!'),
    ENCRYPTION_ALGORITHM: Joi.string().default('aes-256-gcm'),

    // Queue
    QUEUE_MAX_WAIT_TIME: Joi.number().default(300),
    QUEUE_DEFAULT_PRIORITY: Joi.string().default('normal'),

    // Session
    SESSION_IDLE_TIMEOUT: Joi.number().default(600),
    SESSION_MAX_DURATION: Joi.number().default(3600),
    AUTO_CLOSE_RESOLVED: Joi.boolean().default(true),

    // Quality
    QUALITY_CHECK_ENABLED: Joi.boolean().default(true),
    SENSITIVE_WORDS_CHECK: Joi.boolean().default(true),

    // Archive
    ARCHIVE_ENABLED: Joi.boolean().default(true),
    ARCHIVE_AFTER_DAYS: Joi.number().default(90),
    ARCHIVE_DELETE_AFTER_DAYS: Joi.number().default(365),

    // Tracing
    OTEL_ENABLED: Joi.boolean().default(true),
    JAEGER_ENDPOINT: Joi.string().default('http://localhost:4318/v1/traces'),

    // Logging
    LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').default('debug'),
  });

  const { error, value } = schema.validate(config, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }

  return value;
}
