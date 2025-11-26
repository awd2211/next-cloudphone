/**
 * PM2 Ecosystem Configuration
 *
 * 开发环境优化：
 * - 所有 NestJS 服务使用 fork 模式 + pnpm run dev (支持热更新)
 * - 单实例运行，方便调试
 *
 * 生产环境优化：
 * - 关键服务使用 cluster 模式 + dist/main.js (高性能)
 * - 多实例运行，提供冗余和负载均衡
 */

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  apps: [
    // ==================== API Gateway ====================
    {
      name: 'api-gateway',
      version: '1.0.0',
      // 开发模式: pnpm run dev (支持热更新)
      // 生产模式: dist/main.js (高性能)
      script: isDev ? 'pnpm' : 'dist/main.js',
      args: isDev ? 'run dev' : undefined,
      cwd: './backend/api-gateway',

      node_args: '--max-http-header-size=32768',

      // 开发: fork 模式 (支持热更新)
      // 生产: cluster 模式 (高性能)
      instances: isDev ? 1 : 'max',
      exec_mode: isDev ? 'fork' : 'cluster',

      autorestart: true,
      watch: false, // NestJS --watch 已内置热更新

      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,

      env: {
        NODE_ENV: 'development',
        PORT: 30000,
        APP_VERSION: '1.0.0',
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 30000,
        LOG_LEVEL: 'info',
      },

      error_file: './logs/api-gateway-error.log',
      out_file: './logs/api-gateway-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      pmx: true,
      instance_var: 'INSTANCE_ID',
    },

    // ==================== User Service ====================
    {
      name: 'user-service',
      version: '1.0.0',
      script: isDev ? 'pnpm' : 'dist/main.js',
      args: isDev ? 'run dev' : undefined,
      cwd: './backend/user-service',

      node_args: '--max-http-header-size=32768',

      instances: isDev ? 1 : 4,
      exec_mode: isDev ? 'fork' : 'cluster',

      autorestart: true,
      watch: false,

      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,

      env: {
        NODE_ENV: 'development',
        PORT: 30001,
        APP_VERSION: '1.0.0',
        DB_DATABASE: 'cloudphone_user',
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 30001,
        LOG_LEVEL: 'info',
        DB_DATABASE: 'cloudphone_user',
      },

      error_file: './logs/user-service-error.log',
      out_file: './logs/user-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      pmx: true,
      instance_var: 'INSTANCE_ID',
    },

    // ==================== Device Service ====================
    {
      name: 'device-service',
      version: '1.0.0',
      script: isDev ? 'pnpm' : 'dist/main.js',
      args: isDev ? 'run dev' : undefined,
      cwd: './backend/device-service',

      node_args: '--max-http-header-size=32768',

      instances: isDev ? 1 : 3,
      exec_mode: isDev ? 'fork' : 'cluster',

      autorestart: true,
      watch: false,

      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      env: {
        NODE_ENV: 'development',
        PORT: 30002,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 30002,
        LOG_LEVEL: 'info',
      },

      error_file: './logs/device-service-error.log',
      out_file: './logs/device-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ==================== App Service ====================
    {
      name: 'app-service',
      version: '1.0.0',
      script: isDev ? 'pnpm' : 'dist/main.js',
      args: isDev ? 'run dev' : undefined,
      cwd: './backend/app-service',

      node_args: '--max-http-header-size=32768',

      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,

      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      env: {
        NODE_ENV: 'development',
        PORT: 30003,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 30003,
        LOG_LEVEL: 'info',
      },

      error_file: './logs/app-service-error.log',
      out_file: './logs/app-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ==================== Billing Service ====================
    {
      name: 'billing-service',
      version: '1.0.0',
      script: isDev ? 'pnpm' : 'dist/main.js',
      args: isDev ? 'run dev' : undefined,
      cwd: './backend/billing-service',

      node_args: '--max-http-header-size=32768',

      instances: isDev ? 1 : 2,
      exec_mode: isDev ? 'fork' : 'cluster',

      autorestart: true,
      watch: false,

      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      env: {
        NODE_ENV: 'development',
        PORT: 30005,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 30005,
        LOG_LEVEL: 'info',
      },

      error_file: './logs/billing-service-error.log',
      out_file: './logs/billing-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ==================== Notification Service ====================
    {
      name: 'notification-service',
      version: '1.0.0',
      script: isDev ? 'pnpm' : 'dist/main.js',
      args: isDev ? 'run dev' : undefined,
      cwd: './backend/notification-service',

      node_args: '--max-http-header-size=32768',

      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,

      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      env: {
        NODE_ENV: 'development',
        PORT: 30006,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 30006,
        LOG_LEVEL: 'info',
      },

      error_file: './logs/notification-service-error.log',
      out_file: './logs/notification-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ==================== SMS Receive Service ====================
    {
      name: 'sms-receive-service',
      version: '1.0.0',
      script: isDev ? 'pnpm' : 'dist/main.js',
      args: isDev ? 'run dev' : undefined,
      cwd: './backend/sms-receive-service',

      node_args: '--max-http-header-size=32768',

      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,

      max_memory_restart: '512M',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      env: {
        NODE_ENV: 'development',
        PORT: 30008,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 30008,
        LOG_LEVEL: 'info',
      },

      error_file: './logs/sms-receive-service-error.log',
      out_file: './logs/sms-receive-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ==================== Proxy Service ====================
    {
      name: 'proxy-service',
      version: '1.0.0',
      script: isDev ? 'pnpm' : 'dist/proxy-service/src/main.js',
      args: isDev ? 'run dev' : undefined,
      cwd: './backend/proxy-service',

      node_args: '--max-http-header-size=32768',

      instances: isDev ? 1 : 2,
      exec_mode: isDev ? 'fork' : 'cluster',

      autorestart: true,
      watch: false,

      max_memory_restart: '512M',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,

      env: {
        NODE_ENV: 'development',
        PORT: 30007,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 30007,
        LOG_LEVEL: 'info',
      },

      error_file: './logs/proxy-service-error.log',
      out_file: './logs/proxy-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      pmx: true,
      instance_var: 'INSTANCE_ID',
    },

    // ==================== LiveChat Service ====================
    {
      name: 'livechat-service',
      version: '1.0.0',
      script: isDev ? 'pnpm' : 'dist/main.js',
      args: isDev ? 'run dev' : undefined,
      cwd: './backend/livechat-service',

      node_args: '--max-http-header-size=32768',

      instances: isDev ? 1 : 2,
      exec_mode: isDev ? 'fork' : 'cluster',

      autorestart: true,
      watch: false,

      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,

      env: {
        NODE_ENV: 'development',
        PORT: 30010,
        DB_DATABASE: 'cloudphone_livechat',
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 30010,
        LOG_LEVEL: 'info',
        DB_DATABASE: 'cloudphone_livechat',
      },

      error_file: './logs/livechat-service-error.log',
      out_file: './logs/livechat-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      pmx: true,
      instance_var: 'INSTANCE_ID',
    },

    // ==================== Frontend Admin ====================
    {
      name: 'frontend-admin',
      version: '1.0.0',
      script: 'pnpm',
      args: 'run dev',
      cwd: './frontend/admin',

      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,

      max_memory_restart: '512M',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      env: {
        NODE_ENV: 'development',
        PORT: 5173,
      },

      error_file: './logs/frontend-admin-error.log',
      out_file: './logs/frontend-admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ==================== Frontend User ====================
    {
      name: 'frontend-user',
      version: '1.0.0',
      script: 'pnpm',
      args: 'run dev',
      cwd: './frontend/user',

      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,

      max_memory_restart: '512M',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      env: {
        NODE_ENV: 'development',
        PORT: 5174,
      },

      error_file: './logs/frontend-user-error.log',
      out_file: './logs/frontend-user-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ==================== Frontend GV (政府演示平台) ====================
    {
      name: 'frontend-gv',
      version: '1.0.0',
      script: 'pnpm',
      args: 'run dev',
      cwd: './frontend/gv',

      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,

      max_memory_restart: '512M',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      env: {
        NODE_ENV: 'development',
        PORT: 50405,
      },

      error_file: './logs/frontend-gv-error.log',
      out_file: './logs/frontend-gv-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ==================== Media Service (Go) ====================
    {
      name: 'media-service',
      version: '1.0.0',
      // 开发模式: 使用 Air 热重载
      // 生产模式: 直接运行编译好的二进制文件
      script: isDev ? process.env.HOME + '/go/bin/air' : './media-service',
      cwd: './backend/media-service',

      instances: 1,
      exec_mode: 'fork',

      autorestart: !isDev, // 开发模式下 Air 自己管理重启
      watch: false,

      max_memory_restart: '512M',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      env: {
        NODE_ENV: 'development',
        PORT: 30009,
        GIN_MODE: 'debug',
        JWT_SECRET: 'dev-secret-key-change-in-production',
        JAEGER_ENDPOINT: 'localhost:4318',
        TRACING_ENABLED: 'true',
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 30009,
        GIN_MODE: 'release',
        LOG_LEVEL: 'info',
      },

      error_file: './logs/media-service-error.log',
      out_file: './logs/media-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ==================== AlertManager Telegram Bot ====================
    {
      name: 'alertmanager-telegram-bot',
      version: '1.0.0',
      script: 'dist/server.js',
      cwd: './infrastructure/monitoring/alertmanager-telegram-bot',

      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,

      max_memory_restart: '256M',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      env: {
        NODE_ENV: 'development',
        PORT: 30012,
        LOG_LEVEL: 'info',
        NODE_PATH: '/home/eric/next-cloudphone/node_modules',
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 30012,
        LOG_LEVEL: 'warn',
        NODE_PATH: '/home/eric/next-cloudphone/node_modules',
      },

      error_file: './logs/alertmanager-telegram-bot-error.log',
      out_file: './logs/alertmanager-telegram-bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ==================== AlertManager Lark Webhook ====================
    {
      name: 'alertmanager-lark-webhook',
      version: '1.0.0',
      script: 'dist/server.js',
      cwd: './infrastructure/monitoring/alertmanager-lark-webhook',

      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,

      max_memory_restart: '256M',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      env: {
        NODE_ENV: 'development',
        PORT: 30011,
        LOG_LEVEL: 'info',
        NODE_PATH: '/home/eric/next-cloudphone/node_modules',
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 30011,
        LOG_LEVEL: 'warn',
        NODE_PATH: '/home/eric/next-cloudphone/node_modules',
      },

      error_file: './logs/alertmanager-lark-webhook-error.log',
      out_file: './logs/alertmanager-lark-webhook-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
