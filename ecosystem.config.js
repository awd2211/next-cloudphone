module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: process.env.NODE_ENV === 'production' ? 'dist/main.js' : 'pnpm',
      args: process.env.NODE_ENV === 'production' ? undefined : 'run dev',
      cwd: './backend/api-gateway',

      // 🚀 优化：开发环境也启用集群模式（验证集群兼容性）
      // 生产模式: 更多实例以充分利用多核 CPU
      instances: process.env.NODE_ENV === 'production' ? 'max' : 2, // max = CPU 核心数
      exec_mode: 'cluster', // 始终使用集群模式

      autorestart: true,
      watch: false, // 使用NestJS内置的热重载,不需要PM2监视

      // 资源限制
      max_memory_restart: '1G',
      max_restarts: 10, // 防止无限重启
      min_uptime: '10s', // 最小运行时间
      restart_delay: 4000, // 重启延迟4秒

      // 🔄 优雅重启 - 零停机部署
      // wait_ready: true,          // 等待应用发送ready信号
      // listen_timeout: 10000,     // ready超时10秒
      kill_timeout: 5000, // 强制关闭前等待5秒

      env: {
        NODE_ENV: 'development',
        PORT: 30000,
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

      // 📊 监控
      pmx: true, // 启用PM2 Plus监控
      instance_var: 'INSTANCE_ID',
    },
    {
      name: 'user-service',
      script: process.env.NODE_ENV === 'production' ? 'dist/main.js' : 'pnpm',
      args: process.env.NODE_ENV === 'production' ? undefined : 'run dev',
      cwd: './backend/user-service',

      // 🚀 优化：开发环境也启用集群模式，生产模式使用更多实例
      instances: process.env.NODE_ENV === 'production' ? 4 : 2,
      exec_mode: 'cluster', // 始终使用集群模式

      autorestart: true,
      watch: false, // 使用NestJS内置的热重载

      // 资源限制
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      // 🔄 优雅重启
      // wait_ready: true,
      // listen_timeout: 10000,
      kill_timeout: 5000,

      env: {
        NODE_ENV: 'development',
        PORT: 30001,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 30001,
        LOG_LEVEL: 'info',
      },

      error_file: './logs/user-service-error.log',
      out_file: './logs/user-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // 📊 监控
      pmx: true,
      instance_var: 'INSTANCE_ID',
    },
    {
      name: 'device-service',
      script: process.env.NODE_ENV === 'production' ? 'dist/main.js' : 'pnpm',
      args: process.env.NODE_ENV === 'production' ? undefined : 'run dev',
      cwd: './backend/device-service',

      // 🚀 优化：启用集群模式（端口管理已改为 Redis 分布式锁）
      instances: process.env.NODE_ENV === 'production' ? 3 : 2,
      exec_mode: 'cluster', // ✅ 现在支持集群模式

      autorestart: true,
      watch: false, // 使用NestJS内置的热重载

      // 资源限制
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
    {
      name: 'app-service',
      script: process.env.NODE_ENV === 'production' ? 'dist/main.js' : 'pnpm',
      args: process.env.NODE_ENV === 'production' ? undefined : 'run dev',
      cwd: './backend/app-service',

      // 📦 单实例模式（文件上传服务）
      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false, // 使用NestJS内置的热重载

      // 资源限制
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
    {
      name: 'billing-service',
      script: process.env.NODE_ENV === 'production' ? 'dist/main.js' : 'pnpm',
      args: process.env.NODE_ENV === 'production' ? undefined : 'run dev',
      cwd: './backend/billing-service',

      // 🚀 优化：启用集群模式（Saga 模式已确保事务一致性）
      instances: process.env.NODE_ENV === 'production' ? 2 : 1,
      exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',

      autorestart: true,
      watch: false, // 使用NestJS内置的热重载

      // 资源限制
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
    {
      name: 'notification-service',
      script: process.env.NODE_ENV === 'production' ? 'dist/main.js' : 'pnpm',
      args: process.env.NODE_ENV === 'production' ? undefined : 'run dev',
      cwd: './backend/notification-service',

      // 📧 单实例模式（通知服务）
      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false, // 使用NestJS内置的热重载

      // 资源限制
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
    {
      name: 'sms-receive-service',
      script: process.env.NODE_ENV === 'production' ? 'dist/main.js' : 'pnpm',
      args: process.env.NODE_ENV === 'production' ? undefined : 'run start:prod',
      cwd: './backend/sms-receive-service',

      // 📱 单实例模式（SMS接收服务 - 管理号码池和轮询状态）
      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false, // 使用NestJS内置的热重载

      // 资源限制
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
    {
      name: 'frontend-admin',
      script: 'pnpm',
      args: 'run dev',
      cwd: './frontend/admin',

      // 🎨 前端开发服务器
      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,

      // 资源限制
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
    {
      name: 'frontend-user',
      script: 'pnpm',
      args: 'run dev',
      cwd: './frontend/user',

      // 🎨 前端开发服务器
      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,

      // 资源限制
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
  ],
};
