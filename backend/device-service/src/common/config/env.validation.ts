import * as Joi from "joi";

/**
 * Device Service 环境变量验证 Schema
 * 使用 Joi 进行环境变量验证，在应用启动时确保所有必需的配置都已正确设置
 */
export const envValidationSchema = Joi.object({
  // ===== 运行环境 =====
  NODE_ENV: Joi.string()
    .valid("development", "production", "test", "staging")
    .default("development"),
  PORT: Joi.number().port().default(30002),

  // ===== 数据库配置 =====
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),

  // ===== Redis 配置 =====
  REDIS_HOST: Joi.string().default("localhost"),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow("").optional(),

  // ===== JWT 配置 =====
  JWT_SECRET: Joi.string().min(32).required().messages({
    "string.min": "JWT_SECRET must be at least 32 characters for security",
    "any.required": "JWT_SECRET is required",
  }),
  JWT_EXPIRES_IN: Joi.string().default("24h"),

  // ===== Docker 配置 =====
  DOCKER_HOST: Joi.string().default("/var/run/docker.sock"),
  DOCKER_NETWORK: Joi.string().default("cloudphone_network"),
  DOCKER_STORAGE_DRIVER: Joi.string().default("overlay2"),
  DOCKER_DATA_ROOT: Joi.string().default("/var/lib/docker"),

  // ===== Redroid 配置 =====
  REDROID_IMAGE: Joi.string().allow("").optional(),
  DEFAULT_ANDROID_VERSION: Joi.number().valid(11, 12, 13, 14).default(11),
  REDROID_ENABLE_GPU: Joi.boolean().default(false),
  REDROID_GPU_MODE: Joi.string().valid("guest", "host").default("guest"),
  REDROID_GPU_DRIVER: Joi.string().valid("virgl", "angle").default("virgl"),
  REDROID_ENABLE_AUDIO: Joi.boolean().default(false),

  // ===== 端口范围配置 =====
  ADB_PORT_START: Joi.number().port().default(5555),
  ADB_PORT_END: Joi.number().port().default(6554),
  WEBRTC_PORT_START: Joi.number().port().default(8080),
  WEBRTC_PORT_END: Joi.number().port().default(9079),
  SCRCPY_PORT_START: Joi.number().port().default(27183),
  SCRCPY_PORT_END: Joi.number().port().default(28182),

  // ===== 设备资源默认配置 =====
  DEFAULT_CPU_CORES: Joi.number().min(1).max(64).default(2),
  DEFAULT_MEMORY_MB: Joi.number().min(512).max(65536).default(4096),
  DEFAULT_STORAGE_MB: Joi.number().min(1024).max(1048576).default(10240),
  DEFAULT_RESOLUTION: Joi.string()
    .pattern(/^\d+x\d+$/)
    .default("1080x1920"),
  DEFAULT_DPI: Joi.number().min(120).max(640).default(320),

  // ===== ADB 配置 =====
  ADB_HOST: Joi.string().default("localhost"),
  ADB_PORT: Joi.number().port().default(5037),
  ADB_CONNECTION_TIMEOUT: Joi.number().default(5000),
  ADB_COMMAND_TIMEOUT: Joi.number().default(30000),
  SCREENSHOT_DIR: Joi.string().default("/tmp/screenshots"),

  // ===== 健康检查配置 =====
  HEALTH_CHECK_INTERVAL: Joi.number().min(10).default(30),
  DEVICE_HEARTBEAT_TIMEOUT: Joi.number().min(30).default(60),
  CONTAINER_START_TIMEOUT: Joi.number().min(30).default(120),
  ANDROID_BOOT_TIMEOUT: Joi.number().min(30).default(60),
  DEVICE_AUTO_RECOVERY: Joi.boolean().default(true),
  AUTO_RECOVERY_MAX_RETRIES: Joi.number().min(1).max(10).default(3),

  // ===== 微服务地址 =====
  SCHEDULER_SERVICE_URL: Joi.string().uri().optional(),
  MEDIA_SERVICE_URL: Joi.string().uri().optional(),
  USER_SERVICE_URL: Joi.string().uri().optional(),
  BILLING_SERVICE_URL: Joi.string().uri().optional(),
  NOTIFICATION_SERVICE_URL: Joi.string().uri().optional(),

  // ===== 日志配置 =====
  LOG_LEVEL: Joi.string()
    .valid("debug", "info", "warn", "error", "fatal")
    .default("info"),
  LOG_FORMAT: Joi.string().valid("json", "pretty").default("json"),
  ENABLE_FILE_LOGGING: Joi.boolean().default(true),

  // ===== 生命周期自动化配置 =====
  LIFECYCLE_CLEANUP_ENABLED: Joi.boolean().default(true),
  LIFECYCLE_IDLE_THRESHOLD_HOURS: Joi.number().min(1).default(24),
  LIFECYCLE_ERROR_RETENTION_HOURS: Joi.number().min(0).default(1),
  LIFECYCLE_STOPPED_RETENTION_DAYS: Joi.number().min(1).default(7),
  LIFECYCLE_RECOVERY_MAX_ATTEMPTS: Joi.number().min(1).default(3),

  // ===== 自动扩缩容配置 =====
  AUTOSCALING_ENABLED: Joi.boolean().default(true),
  AUTOSCALING_MIN_DEVICES: Joi.number().min(0).default(0),
  AUTOSCALING_MAX_DEVICES: Joi.number().min(1).default(100),
  AUTOSCALING_TARGET_CPU: Joi.number().min(10).max(100).default(70),
  AUTOSCALING_SCALE_UP_THRESHOLD: Joi.number().min(10).max(100).default(80),
  AUTOSCALING_SCALE_DOWN_THRESHOLD: Joi.number().min(10).max(100).default(30),
  AUTOSCALING_COOLDOWN_MINUTES: Joi.number().min(1).default(10),

  // ===== 自动备份配置 =====
  BACKUP_SCHEDULE_ENABLED: Joi.boolean().default(true),
  BACKUP_INTERVAL_HOURS: Joi.number().min(1).default(24),
  BACKUP_RETENTION_DAYS: Joi.number().min(1).default(30),
  MAX_BACKUPS_PER_DEVICE: Joi.number().min(1).default(10),
  SNAPSHOT_DIR: Joi.string().default("/data/snapshots"),

  // ===== 故障转移配置 =====
  FAILOVER_ENABLED: Joi.boolean().default(true),
  FAILOVER_HEARTBEAT_TIMEOUT_MINUTES: Joi.number().min(1).default(10),
  FAILOVER_MAX_CONSECUTIVE_FAILURES: Joi.number().min(1).default(3),
  FAILOVER_AUTO_RECREATE_ENABLED: Joi.boolean().default(true),
  FAILOVER_SNAPSHOT_RECOVERY_ENABLED: Joi.boolean().default(true),
  FAILOVER_MAX_RECOVERY_ATTEMPTS: Joi.number().min(1).default(3),
  FAILOVER_COOLDOWN_MINUTES: Joi.number().min(1).default(15),

  // ===== 状态恢复配置 =====
  STATE_RECOVERY_ENABLED: Joi.boolean().default(true),
  STATE_RECOVERY_AUTO_HEAL_ENABLED: Joi.boolean().default(true),
  STATE_RECOVERY_RECORD_OPERATIONS: Joi.boolean().default(true),
  STATE_RECOVERY_MAX_OPERATION_HISTORY: Joi.number().min(100).default(1000),
  STATE_RECOVERY_CHECK_INTERVAL_MINUTES: Joi.number().min(5).default(15),

  // ===== 监控和指标配置 =====
  METRICS_ENABLED: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(30002),
  METRICS_PATH: Joi.string().default("/metrics"),

  // ===== RabbitMQ 配置 =====
  RABBITMQ_URL: Joi.string().uri().required(),
  RABBITMQ_EXCHANGE: Joi.string().default("cloudphone.events"),
  RABBITMQ_QUEUE_PREFIX: Joi.string().default("device-service"),

  // ===== Consul 配置 =====
  CONSUL_HOST: Joi.string().default("localhost"),
  CONSUL_PORT: Joi.number().port().default(8500),
  CONSUL_SERVICE_NAME: Joi.string().default("device-service"),
  CONSUL_SERVICE_PORT: Joi.number().port().default(30002),

  // ===== CORS 配置 =====
  CORS_ORIGINS: Joi.string().optional(),
}).messages({
  "any.required": "{{#label}} is required",
  "string.uri": "{{#label}} must be a valid URI",
  "number.port": "{{#label}} must be a valid port number",
});

/**
 * 验证环境变量
 * @param config 环境变量对象
 * @returns 验证后的环境变量
 */
export function validate(config: Record<string, unknown>) {
  const { error, value } = envValidationSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false,
  });

  if (error) {
    const errorMessages = error.details
      .map((detail) => detail.message)
      .join("\n");
    throw new Error(
      `❌ Environment variable validation failed:\n${errorMessages}`,
    );
  }

  return value;
}
