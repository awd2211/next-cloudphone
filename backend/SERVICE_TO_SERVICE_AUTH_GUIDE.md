Service-to-Service Authentication 实现指南

**日期**: 2025-10-29
**优先级**: P1 (Important)
**状态**: ✅ 已实现基础组件

---

## 概述

服务间认证确保只有授权的服务可以调用内部 API，防止未经授权的访问和潜在的 SSRF 攻击。

### 实现的组件

1. **ServiceAuthGuard** - NestJS 守卫，验证服务 Token
2. **ServiceTokenService** - 生成和管理服务 Token
3. **ServiceTokenPayload** - Token 数据结构定义

---

## 工作原理

### 认证流程

```
┌─────────────────┐         ┌─────────────────┐
│  Device Service │         │   User Service  │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ 1. Generate Token         │
         │-------------------------→│
         │    ServiceTokenService    │
         │                           │
         │ 2. HTTP Request           │
         │    + X-Service-Token      │
         │─────────────────────────→│
         │                           │
         │                  3. Validate Token
         │                     ServiceAuthGuard
         │                           │
         │ 4. Response               │
         │←─────────────────────────│
         │                           │
```

### Token 结构

```json
{
  "service": "device-service",
  "iss": "cloudphone-platform",
  "aud": "internal-services",
  "iat": 1698765432,
  "exp": 1698769032
}
```

---

## 集成步骤

### Step 1: 在服务提供者端（被调用服务）

#### 1.1 保护内部 API 端点

```typescript
// /backend/user-service/src/quotas/quotas.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ServiceAuthGuard } from '@cloudphone/shared';

@Controller('internal/quotas') // ✅ 使用 /internal 前缀
@UseGuards(ServiceAuthGuard)   // ✅ 应用守卫
export class QuotasInternalController {
  constructor(private quotasService: QuotasService) {}

  @Get('user/:userId')
  async getUserQuota(@Param('userId') userId: string) {
    // 只有持有有效服务 Token 的调用者才能访问
    return await this.quotasService.findByUserId(userId);
  }

  @Post('user/:userId/usage')
  async reportUsage(
    @Param('userId') userId: string,
    @Body() usage: ReportUsageDto,
  ) {
    return await this.quotasService.updateUsage(userId, usage);
  }
}
```

#### 1.2 添加服务身份信息（可选）

```typescript
import { Request } from 'express';

// 扩展 Express Request 类型
declare module 'express' {
  interface Request {
    service?: {
      name: string;
      issuer: string;
      audience: string;
    };
  }
}

@Post('user/:userId/usage')
async reportUsage(
  @Param('userId') userId: string,
  @Body() usage: ReportUsageDto,
  @Req() request: Request,
) {
  const callerService = request.service?.name; // 'device-service'

  this.logger.log(`Usage reported by ${callerService} for user ${userId}`);

  return await this.quotasService.updateUsage(userId, usage);
}
```

### Step 2: 在服务消费者端（调用服务）

#### 2.1 注入 ServiceTokenService

```typescript
// /backend/device-service/src/quota/quota-client.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpClientService, ServiceTokenService } from '@cloudphone/shared';

@Injectable()
export class QuotaClientService {
  private readonly logger = new Logger(QuotaClientService.name);
  private readonly userServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly serviceTokenService: ServiceTokenService,
    configService: ConfigService,
  ) {
    this.userServiceUrl = configService.get<string>('USER_SERVICE_URL');
  }

  /**
   * 获取用户配额
   */
  async getUserQuota(userId: string): Promise<QuotaResponse> {
    // ✅ 生成服务 Token
    const token = await this.serviceTokenService.generateToken('device-service');

    try {
      const response = await this.httpClient.get<QuotaResponse>(
        `${this.userServiceUrl}/internal/quotas/user/${userId}`,
        {
          headers: {
            'X-Service-Token': token, // ✅ 添加 Token 到请求头
          },
        },
        {
          timeout: 5000,
          retries: 3,
          circuitBreaker: true,
        },
      );

      return response;
    } catch (error) {
      this.logger.error(`Failed to get user quota: ${error.message}`);
      throw error;
    }
  }

  /**
   * 上报配额使用情况
   */
  async reportUsage(
    userId: string,
    usage: ReportUsageDto,
  ): Promise<void> {
    const token = await this.serviceTokenService.generateToken('device-service');

    await this.httpClient.post(
      `${this.userServiceUrl}/internal/quotas/user/${userId}/usage`,
      usage,
      {
        headers: {
          'X-Service-Token': token,
        },
      },
      {
        timeout: 5000,
        retries: 2,
      },
    );
  }
}
```

#### 2.2 注册 ServiceTokenService

```typescript
// /backend/device-service/src/quota/quota.module.ts
import { Module } from '@nestjs/common';
import { ServiceTokenService } from '@cloudphone/shared';
import { QuotaClientService } from './quota-client.service';

@Module({
  providers: [
    QuotaClientService,
    ServiceTokenService, // ✅ 注册服务
  ],
  exports: [QuotaClientService],
})
export class QuotaModule {}
```

---

## 批量迁移计划

### 需要保护的内部 API

#### User Service
- ✅ `GET /internal/quotas/user/:userId` - 获取用户配额
- ✅ `POST /internal/quotas/user/:userId/usage` - 上报使用情况
- ✅ `GET /internal/users/:userId/roles` - 获取用户角色
- ✅ `GET /internal/users/:userId/permissions` - 获取用户权限

#### Device Service
- ✅ `POST /internal/devices/:deviceId/commands` - 执行设备命令
- ✅ `GET /internal/devices/:deviceId/status` - 获取设备状态
- ✅ `POST /internal/devices/allocate` - 分配设备

#### Billing Service
- ✅ `GET /internal/balances/user/:userId` - 获取用户余额
- ✅ `POST /internal/balances/user/:userId/charge` - 扣费
- ✅ `POST /internal/balances/user/:userId/refund` - 退款

#### App Service
- ✅ `POST /internal/apps/:appId/install` - 安装应用到设备
- ✅ `POST /internal/apps/:appId/uninstall` - 卸载应用
- ✅ `GET /internal/apps/:appId/metadata` - 获取应用元数据

### 迁移脚本

```bash
#!/bin/bash
# migrate-service-auth.sh

SERVICES=("user-service" "device-service" "billing-service" "app-service")

for SERVICE in "${SERVICES[@]}"; do
  echo "=== Migrating $SERVICE ==="

  # 1. 创建 internal 控制器目录
  mkdir -p "/backend/$SERVICE/src/internal"

  # 2. 移动内部 API 到 internal 控制器
  # (手动操作，根据每个服务的结构)

  # 3. 添加 ServiceAuthGuard 到内部控制器
  # (手动操作)

  # 4. 重启服务进行测试
  pm2 restart "$SERVICE"

  echo "$SERVICE migration complete"
  echo ""
done

echo "All services migrated successfully!"
```

---

## 测试

### 单元测试

```typescript
// /backend/user-service/src/quotas/quotas-internal.controller.spec.ts
import { Test } from '@nestjs/testing';
import { ServiceAuthGuard } from '@cloudphone/shared';
import { UnauthorizedException } from '@nestjs/common';

describe('QuotasInternalController', () => {
  let controller: QuotasInternalController;
  let guard: ServiceAuthGuard;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [QuotasInternalController],
      providers: [
        QuotasService,
        {
          provide: ServiceAuthGuard,
          useValue: {
            canActivate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(QuotasInternalController);
    guard = module.get(ServiceAuthGuard);
  });

  describe('getUserQuota', () => {
    it('should reject requests without service token', async () => {
      jest.spyOn(guard, 'canActivate').mockReturnValue(false);

      await expect(
        controller.getUserQuota('user-123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should accept requests with valid service token', async () => {
      jest.spyOn(guard, 'canActivate').mockReturnValue(true);

      const result = await controller.getUserQuota('user-123');
      expect(result).toBeDefined();
    });
  });
});
```

### 集成测试

```typescript
// /backend/device-service/test/integration/quota-client.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ServiceTokenService } from '@cloudphone/shared';

describe('QuotaClient Integration (e2e)', () => {
  let app: INestApplication;
  let serviceTokenService: ServiceTokenService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    serviceTokenService = app.get(ServiceTokenService);
  });

  it('/internal/quotas/user/:userId (GET) - with valid token', async () => {
    const token = await serviceTokenService.generateToken('device-service');

    return request(app.getHttpServer())
      .get('/internal/quotas/user/test-user-123')
      .set('X-Service-Token', token)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('maxDevices');
        expect(res.body).toHaveProperty('usedDevices');
      });
  });

  it('/internal/quotas/user/:userId (GET) - without token', async () => {
    return request(app.getHttpServer())
      .get('/internal/quotas/user/test-user-123')
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toContain('Service token is required');
      });
  });

  it('/internal/quotas/user/:userId (GET) - with invalid token', async () => {
    return request(app.getHttpServer())
      .get('/internal/quotas/user/test-user-123')
      .set('X-Service-Token', 'invalid-token')
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toContain('Invalid service token');
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

---

## 监控和日志

### 添加审计日志

```typescript
// /backend/shared/src/auth/service-auth.guard.ts
@Injectable()
export class ServiceAuthGuard implements CanActivate {
  private readonly logger = new Logger(ServiceAuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      this.logger.warn(
        `Service auth failed: No token provided for ${request.method} ${request.url}`,
      );
      throw new UnauthorizedException('Service token is required');
    }

    try {
      const decoded = this.verifyToken(token);

      // ✅ 记录成功的服务调用
      this.logger.log(
        `Service auth success: ${decoded.service} → ${request.method} ${request.url}`,
      );

      request.service = {
        name: decoded.service,
        issuer: decoded.iss,
        audience: decoded.aud,
      };

      return true;
    } catch (error) {
      // ✅ 记录失败的尝试
      this.logger.error(
        `Service auth failed: Invalid token for ${request.method} ${request.url} - ${error.message}`,
      );
      throw new UnauthorizedException(`Invalid service token: ${error.message}`);
    }
  }
}
```

### Prometheus 指标

```typescript
// /backend/shared/src/auth/service-auth.metrics.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class ServiceAuthMetrics {
  private readonly authAttempts: Counter;
  private readonly authSuccesses: Counter;
  private readonly authFailures: Counter;
  private readonly authDuration: Histogram;

  constructor() {
    this.authAttempts = new Counter({
      name: 'service_auth_attempts_total',
      help: 'Total number of service authentication attempts',
      labelNames: ['service', 'endpoint'],
    });

    this.authSuccesses = new Counter({
      name: 'service_auth_successes_total',
      help: 'Total number of successful service authentications',
      labelNames: ['service', 'endpoint'],
    });

    this.authFailures = new Counter({
      name: 'service_auth_failures_total',
      help: 'Total number of failed service authentications',
      labelNames: ['service', 'endpoint', 'reason'],
    });

    this.authDuration = new Histogram({
      name: 'service_auth_duration_seconds',
      help: 'Service authentication duration in seconds',
      labelNames: ['service'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
    });
  }

  recordAttempt(service: string, endpoint: string): void {
    this.authAttempts.labels(service, endpoint).inc();
  }

  recordSuccess(service: string, endpoint: string, duration: number): void {
    this.authSuccesses.labels(service, endpoint).inc();
    this.authDuration.labels(service).observe(duration);
  }

  recordFailure(service: string, endpoint: string, reason: string): void {
    this.authFailures.labels(service, endpoint, reason).inc();
  }
}
```

---

## 安全最佳实践

### 1. Token 有效期

```typescript
// 推荐配置
const token = await this.serviceTokenService.generateToken(
  'device-service',
  3600, // 1 小时（默认）
);

// 对于高频调用，可以适当延长
const longLivedToken = await this.serviceTokenService.generateToken(
  'device-service',
  7200, // 2 小时
);
```

### 2. Token 刷新策略

```typescript
// 自动刷新（Token 缓存机制已内置）
const token = await this.serviceTokenService.generateToken('device-service');
// 缓存会在过期前 5 分钟自动失效，下次调用自动生成新 Token
```

### 3. 紧急撤销

```typescript
// 如果怀疑 Token 泄露，立即清除缓存并重新生成
this.serviceTokenService.clearCache('device-service');

// 清除所有服务的缓存
this.serviceTokenService.clearCache();
```

### 4. 日志脱敏

```typescript
// ❌ 错误做法：记录完整 Token
this.logger.log(`Using token: ${token}`);

// ✅ 正确做法：只记录 Token 的前几位
this.logger.log(`Using token: ${token.substring(0, 10)}...`);

// ✅ 更好的做法：不记录 Token
this.logger.log(`Authenticating as device-service`);
```

---

## 常见问题

### Q1: 为什么使用 JWT 而不是 mTLS？

**A**: JWT 更容易实现和管理：
- 不需要证书管理基础设施
- 更容易在开发环境中设置
- 性能开销更小
- 可以在 Token 中携带额外信息

**未来考虑**: 在生产环境可以同时支持 JWT 和 mTLS，让运维团队选择。

### Q2: Token 缓存安全吗？

**A**: 是的，因为：
- Token 只在内存中缓存（不持久化）
- 服务重启后自动清除
- 提前 5 分钟过期，减少窗口期
- 可以手动清除缓存

### Q3: 如何处理 Token 过期？

**A**: `ServiceTokenService` 自动处理：
```typescript
// 第一次调用：生成新 Token
const token1 = await serviceTokenService.generateToken('device-service');

// 1 小时内：使用缓存的 Token
const token2 = await serviceTokenService.generateToken('device-service');
// token1 === token2 (从缓存返回)

// 55 分钟后：缓存过期（提前 5 分钟），生成新 Token
const token3 = await serviceTokenService.generateToken('device-service');
// token3 !== token2 (新生成)
```

### Q4: 如何在 Postman/curl 中测试？

```bash
# 1. 获取 JWT_SECRET
export JWT_SECRET="your-secret-here"

# 2. 生成 Token (使用 jwt.io 或命令行工具)
TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const payload = {
  service: 'test-client',
  iss: 'cloudphone-platform',
  aud: 'internal-services',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
};
console.log(jwt.sign(payload, process.env.JWT_SECRET));
")

# 3. 使用 Token 调用 API
curl -H "X-Service-Token: $TOKEN" \
     http://localhost:30001/internal/quotas/user/test-user-123
```

---

## 下一步

1. **审查此实现指南** - 确认方案可行
2. **迁移 User Service** - 作为试点服务
3. **测试和验证** - 完整的集成测试
4. **迁移其他服务** - Device, Billing, App
5. **监控和优化** - 观察性能影响

---

**创建日期**: 2025-10-29
**更新日期**: 2025-10-29
**状态**: ✅ 已实现基础组件，待集成
