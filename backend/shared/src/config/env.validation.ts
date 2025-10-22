import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 验证必需的环境变量
 */
export function validateRequiredEnvVars(requiredVars: string[]): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 验证可选的环境变量
 */
export function validateOptionalEnvVars(optionalVars: string[]): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const varName of optionalVars) {
    if (!process.env[varName]) {
      warnings.push(`Optional environment variable not set: ${varName}`);
    }
  }

  return {
    isValid: true,
    errors,
    warnings,
  };
}

/**
 * 验证数据库配置
 */
export function validateDatabaseConfig(): EnvValidationResult {
  const required = ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'];
  return validateRequiredEnvVars(required);
}

/**
 * 验证Redis配置
 */
export function validateRedisConfig(): EnvValidationResult {
  const required = ['REDIS_HOST', 'REDIS_PORT'];
  return validateRequiredEnvVars(required);
}

/**
 * 验证RabbitMQ配置
 */
export function validateRabbitMQConfig(): EnvValidationResult {
  const result = validateOptionalEnvVars(['RABBITMQ_URL']);
  
  if (!process.env.RABBITMQ_URL) {
    result.warnings.push('RabbitMQ not configured, EventBus features will not work');
  }

  return result;
}

/**
 * 验证SMTP配置
 */
export function validateSMTPConfig(): EnvValidationResult {
  const result = validateOptionalEnvVars(['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']);
  
  if (!process.env.SMTP_HOST) {
    result.warnings.push('SMTP not configured, email features will use mock mode');
  }

  return result;
}

/**
 * 验证短信配置
 */
export function validateSMSConfig(): EnvValidationResult {
  const warnings: string[] = [];

  // 检查腾讯云短信
  const hasTencent = process.env.TENCENT_SMS_SECRET_ID && process.env.TENCENT_SMS_SECRET_KEY;
  if (!hasTencent) {
    warnings.push('Tencent SMS not configured');
  }

  // 检查阿里云短信
  const hasAliyun = process.env.ALIYUN_SMS_ACCESS_KEY_ID && process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;
  if (!hasAliyun) {
    warnings.push('Aliyun SMS not configured');
  }

  if (!hasTencent && !hasAliyun) {
    warnings.push('No SMS provider configured, SMS features will use mock mode');
  }

  return {
    isValid: true,
    errors: [],
    warnings,
  };
}

/**
 * 验证所有配置
 */
export function validateAllEnvVars(): EnvValidationResult {
  const results = [
    validateDatabaseConfig(),
    validateRedisConfig(),
    validateRabbitMQConfig(),
    validateSMTPConfig(),
    validateSMSConfig(),
  ];

  const errors = results.flatMap(r => r.errors);
  const warnings = results.flatMap(r => r.warnings);

  // 输出验证结果
  if (errors.length > 0) {
    logger.error('❌ Environment validation failed:');
    errors.forEach(err => logger.error(`  - ${err}`));
  }

  if (warnings.length > 0) {
    logger.warn('⚠️ Environment validation warnings:');
    warnings.forEach(warn => logger.warn(`  - ${warn}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    logger.log('✅ All environment variables validated successfully');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

