module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: 'dist/main.js',
      cwd: './backend/api-gateway',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 30000,
      },
    },
    {
      name: 'user-service',
      script: 'dist/main.js',
      cwd: './backend/user-service',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 30001,
      },
    },
    {
      name: 'device-service',
      script: 'dist/main.js',
      cwd: './backend/device-service',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 30002,
      },
    },
    {
      name: 'app-service',
      script: 'dist/main.js',
      cwd: './backend/app-service',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 30003,
      },
    },
    {
      name: 'billing-service',
      script: 'dist/main.js',
      cwd: './backend/billing-service',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 30005,
      },
    },
    {
      name: 'notification-service',
      script: 'dist/main.js',
      cwd: './backend/notification-service',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 30006,
      },
    },
  ],
};
