#!/usr/bin/env node

/**
 * 环境变量检查工具 (Node.js 版本)
 * 用于 NestJS 服务启动前的配置验证
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function printError(message) {
  console.error(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

function printSuccess(message) {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

function printWarning(message) {
  console.warn(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
}

function printInfo(message) {
  console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
}

/**
 * 必需的环境变量配置
 */
const REQUIRED_VARS = {
  common: ['NODE_ENV', 'PORT'],
  database: ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'],
  jwt: ['JWT_SECRET', 'JWT_EXPIRES_IN'],
  redis: ['REDIS_HOST', 'REDIS_PORT'],
};

/**
 * 服务特定的环境变量
 */
const SERVICE_VARS = {
  'api-gateway': {
    required: [
      ...REQUIRED_VARS.common,
      ...REQUIRED_VARS.database,
      ...REQUIRED_VARS.jwt,
      'USER_SERVICE_URL',
      'DEVICE_SERVICE_URL',
      'APP_SERVICE_URL',
    ],
    optional: ['CORS_ORIGIN', 'RATE_LIMIT_TTL'],
  },
  'user-service': {
    required: [...REQUIRED_VARS.common, ...REQUIRED_VARS.database, ...REQUIRED_VARS.jwt],
    optional: ['EMAIL_HOST', 'EMAIL_PORT', 'SESSION_TIMEOUT'],
  },
  'device-service': {
    required: [
      ...REQUIRED_VARS.common,
      ...REQUIRED_VARS.database,
      ...REQUIRED_VARS.jwt,
      'DOCKER_HOST',
    ],
    optional: ['REDROID_IMAGE', 'ADB_HOST', 'ADB_PORT'],
  },
  'app-service': {
    required: [
      ...REQUIRED_VARS.common,
      ...REQUIRED_VARS.database,
      ...REQUIRED_VARS.jwt,
      'MINIO_ENDPOINT',
      'MINIO_PORT',
      'MINIO_ACCESS_KEY',
      'MINIO_SECRET_KEY',
    ],
    optional: ['MAX_APK_SIZE', 'AAPT_PATH'],
  },
  'billing-service': {
    required: [
      ...REQUIRED_VARS.common,
      ...REQUIRED_VARS.database,
      ...REQUIRED_VARS.jwt,
      'DEVICE_SERVICE_URL',
    ],
    optional: ['WECHAT_APP_ID', 'ALIPAY_APP_ID', 'STRIPE_PUBLIC_KEY'],
  },
};

/**
 * 验证环境变量
 */
function validateEnvVars(serviceName) {
  printInfo(`Validating environment variables for ${serviceName}...`);
  printInfo('');

  const config = SERVICE_VARS[serviceName];
  if (!config) {
    printWarning(`No specific configuration found for service: ${serviceName}`);
    printWarning('Performing basic validation only...');
    config = {
      required: REQUIRED_VARS.common,
      optional: [],
    };
  }

  let errors = 0;
  let warnings = 0;

  // 检查必需变量
  printInfo('Checking required variables:');
  config.required.forEach((varName) => {
    if (!process.env[varName]) {
      printError(`✗ ${varName} is not set`);
      errors++;
    } else {
      printSuccess(`✓ ${varName}`);
    }
  });

  // 检查可选变量
  if (config.optional && config.optional.length > 0) {
    printInfo('');
    printInfo('Checking optional variables:');
    config.optional.forEach((varName) => {
      if (!process.env[varName]) {
        printWarning(`○ ${varName} is not set (optional)`);
        warnings++;
      } else {
        printSuccess(`✓ ${varName}`);
      }
    });
  }

  // 验证 JWT_SECRET 强度
  if (process.env.JWT_SECRET) {
    printInfo('');
    printInfo('Validating JWT_SECRET strength:');

    if (process.env.JWT_SECRET.length < 32) {
      printWarning('JWT_SECRET is too short (< 32 chars). Recommended: 64+ chars');
      warnings++;
    }

    if (process.env.JWT_SECRET.includes('your-secret-key-change-in-production')) {
      printError('JWT_SECRET is using default value. Please change it!');
      errors++;
    }

    if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.includes('dev')) {
      printError('JWT_SECRET contains "dev" in production environment');
      errors++;
    }
  }

  // 验证 NODE_ENV
  if (process.env.NODE_ENV) {
    const validEnvs = ['development', 'production', 'test'];
    if (!validEnvs.includes(process.env.NODE_ENV)) {
      printWarning(
        `NODE_ENV="${process.env.NODE_ENV}" is not standard. Expected: ${validEnvs.join(', ')}`
      );
      warnings++;
    }
  }

  // 输出结果
  printInfo('');
  printInfo('========================================');
  if (errors > 0) {
    printError(`Validation failed with ${errors} error(s) and ${warnings} warning(s)`);
    process.exit(1);
  } else if (warnings > 0) {
    printWarning(`Validation passed with ${warnings} warning(s)`);
    printInfo('========================================');
  } else {
    printSuccess('All validations passed!');
    printInfo('========================================');
  }
}

/**
 * 主函数
 */
function main() {
  const serviceName = process.argv[2] || 'unknown';

  console.log('');
  console.log('========================================');
  console.log('  Environment Variables Validation');
  console.log('========================================');
  console.log('');

  // 加载 .env 文件 (如果存在)
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    printInfo(`.env file found at: ${envPath}`);
    require('dotenv').config({ path: envPath });
  } else {
    printWarning('No .env file found, using system environment variables');
  }

  printInfo('');
  validateEnvVars(serviceName);
  console.log('');
}

// 执行
if (require.main === module) {
  main();
}

module.exports = { validateEnvVars };
