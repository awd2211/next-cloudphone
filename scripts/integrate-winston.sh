#!/bin/bash
# 为其他 NestJS 服务集成 Winston 日志
set -e

SERVICES=("device-service" "app-service" "billing-service")

for SERVICE in "${SERVICES[@]}"; do
  echo "=== Integrating Winston into $SERVICE ==="

  cd /home/eric/next-cloudphone/backend/$SERVICE

  # 备份原文件
  cp src/app.module.ts src/app.module.ts.bak 2>/dev/null || true
  cp src/main.ts src/main.ts.bak 2>/dev/null || true

  # 检查app.module.ts是否已经导入WinstonModule
  if ! grep -q "WinstonModule" src/app.module.ts; then
    echo "  - Updating app.module.ts"
    # 在imports数组前添加WinstonModule导入
    sed -i "/^import.*@nestjs\/typeorm/a import { WinstonModule } from 'nest-winston';\nimport { winstonConfig } from './config/winston.config';" src/app.module.ts

    # 在ConfigModule.forRoot后添加WinstonModule.forRoot
    sed -i "/ConfigModule\.forRoot/,/}),/a\\
\\    // Winston 日志模块\\
\\    WinstonModule.forRoot(winstonConfig)," src/app.module.ts
  fi

  # 检查main.ts是否已经使用Winston
  if ! grep -q "WINSTON_MODULE_NEST_PROVIDER" src/main.ts; then
    echo "  - Updating main.ts"
    # 在导入部分添加Winston相关导入
    sed -i "/^import.*@nestjs\/common/a import { WINSTON_MODULE_NEST_PROVIDER, WINSTON_MODULE_PROVIDER } from 'nest-winston';\nimport { LoggingInterceptor } from './common/interceptors/logging.interceptor';\nimport { AllExceptionsFilter } from './common/filters/all-exceptions.filter';" src/main.ts

    # 在bootstrap函数中添加Winston配置
    sed -i "/const app = await NestFactory.create(AppModule);/a\\
\\  // 使用 Winston 作为应用的 Logger\\
\\  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));\\
\\  // 启用全局异常过滤器（使用Winston）\\
\\  app.useGlobalFilters(new AllExceptionsFilter(app.get(WINSTON_MODULE_PROVIDER)));\\
\\  // 启用全局日志拦截器\\
\\  app.useGlobalInterceptors(new LoggingInterceptor(app.get(WINSTON_MODULE_PROVIDER)));" src/main.ts
  fi

  echo "  ✓ $SERVICE Winston integration complete"
done

echo ""
echo "=== All services updated! ==="
echo "To verify, rebuild and restart the services:"
echo "  docker compose -f docker-compose.dev.yml restart api-gateway device-service app-service billing-service"
