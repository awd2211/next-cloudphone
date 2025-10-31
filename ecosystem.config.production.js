module.exports = {
  apps: [
    // ===== API Gateway - 集群模式 =====
    {
      name: 'api-gateway',
      script: 'dist/main.js',
      cwd: './backend/api-gateway',

      // 🚀 集群模式配置
      instances: 4, // 使用 4 个核心（或 'max' 自动检测）
      exec_mode: 'cluster', // 启用集群模式

      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      // 优雅重启配置
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,

      env: {
        NODE_ENV: 'production',
        PORT: 30000,
      },

      error_file: './logs/api-gateway-error.log',
      out_file: './logs/api-gateway-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ===== User Service - 2实例集群 =====
    {
      name: 'user-service',
      script: 'dist/main.js',
      cwd: './backend/user-service',

      // 🚀 适度集群
      instances: 2,
      exec_mode: 'cluster',

      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,

      env: {
        NODE_ENV: 'production',
        PORT: 30001,
      },

      error_file: './logs/user-service-error.log',
      out_file: './logs/user-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ===== Device Service - 单实例 =====
    // ⚠️ 必须单实例：端口管理使用内存缓存，集群模式会导致端口冲突
    {
      name: 'device-service',
      script: 'dist/main.js',
      cwd: './backend/device-service',

      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      env: {
        NODE_ENV: 'production',
        PORT: 30002,
      },

      error_file: './logs/device-service-error.log',
      out_file: './logs/device-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ===== App Service - 单实例 =====
    {
      name: 'app-service',
      script: 'dist/main.js',
      cwd: './backend/app-service',

      // 文件上传服务，保持单实例
      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      env: {
        NODE_ENV: 'production',
        PORT: 30003,
      },

      error_file: './logs/app-service-error.log',
      out_file: './logs/app-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ===== Billing Service - 单实例 =====
    {
      name: 'billing-service',
      script: 'dist/main.js',
      cwd: './backend/billing-service',

      // 计费服务，保持单实例避免并发问题
      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      env: {
        NODE_ENV: 'production',
        PORT: 30005,
      },

      error_file: './logs/billing-service-error.log',
      out_file: './logs/billing-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ===== Notification Service - 单实例 =====
    {
      name: 'notification-service',
      script: 'dist/main.js',
      cwd: './backend/notification-service',

      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      env: {
        NODE_ENV: 'production',
        PORT: 30006,
      },

      error_file: './logs/notification-service-error.log',
      out_file: './logs/notification-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
