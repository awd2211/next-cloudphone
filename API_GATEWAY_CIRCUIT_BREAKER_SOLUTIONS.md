# API Gateway 熔断保护方案对比

**当前问题**: API Gateway 直接使用 axios 调用，无熔断保护
**当前代码**: `proxy.service.ts:160` - `await this.httpService.axiosRef.request(config)`

---

## 🚨 当前风险

```typescript
// 当前实现（第159-161行）
try {
  const response = await this.httpService.axiosRef.request(config);
  return response.data;
} catch (error: any) {
  // 仅记录日志，没有熔断保护
}
```

**风险场景**:
```
设备服务突然挂掉：
  请求1: 等待10s超时 ❌
  请求2: 等待10s超时 ❌  
  请求3: 等待10s超时 ❌
  ...持续拖垮 API Gateway
  
结果：
  - 线程/连接池耗尽
  - 其他正常服务也受影响
  - 整个系统不可用
```

---

## 🎯 方案对比

| 方案 | 实现难度 | 工作量 | 功能完整度 | 推荐度 |
|------|---------|--------|-----------|--------|
| **方案1：基础熔断** | ⭐ 简单 | 1-2小时 | ⭐⭐⭐ | ⭐⭐⭐ 快速见效 |
| **方案2：智能降级** | ⭐⭐ 中等 | 半天 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ 推荐 |
| **方案3：自适应熔断** | ⭐⭐⭐ 复杂 | 1天 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ 高级 |
| **方案4：企业级方案** | ⭐⭐⭐⭐ 很复杂 | 2-3天 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ 完美 |

---

## 方案 1：基础熔断（快速方案）⚡

**使用 shared 的 HttpClientService**

### 实现方式

```typescript
// 修改 proxy.service.ts

import { HttpClientService } from '@cloudphone/shared/http';

@Injectable()
export class ProxyService {
  constructor(
    private readonly httpService: HttpService,
    private readonly httpClient: HttpClientService, // ✅ 新增
    private readonly configService: ConfigService,
    private readonly consulService: ConsulService,
  ) {}

  private async proxyRequestAsync(
    serviceName: string,
    path: string,
    method: string,
    data?: any,
    headers?: any,
    params?: any,
  ): Promise<any> {
    const serviceUrl = await this.getServiceUrl(serviceName);
    const url = `${serviceUrl}${path}`;
    const timeout = this.serviceConfigs.get(serviceName)?.timeout || 10000;

    // ✅ 使用熔断器保护
    return this.httpClient.requestWithCircuitBreaker(
      serviceName, // 熔断器 key
      async () => {
        const config: AxiosRequestConfig = {
          method: method as any,
          url,
          headers: this.sanitizeHeaders(headers),
          timeout,
          params,
          data: ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) ? data : undefined,
        };

        const response = await this.httpService.axiosRef.request(config);
        return response.data;
      },
      {
        timeout,
        errorThresholdPercentage: 50,  // 50%失败率触发熔断
        resetTimeout: 30000,            // 30秒后尝试恢复
        volumeThreshold: 10,            // 至少10个请求
      }
    );
  }
}
```

### 配置模块

```typescript
// proxy.module.ts
import { HttpClientModule } from '@cloudphone/shared/http';

@Module({
  imports: [
    HttpModule.register({ timeout: 30000 }),
    HttpClientModule, // ✅ 导入熔断器模块
    ConfigModule,
  ],
  controllers: [ProxyController],
  providers: [ProxyService],
})
export class ProxyModule {}
```

### 优点 ✅

- ✅ 实现简单（修改 1 个文件）
- ✅ 1-2 小时完成
- ✅ 立即防止级联故障
- ✅ 自动恢复机制
- ✅ 复用现有代码

### 缺点 ❌

- ❌ 无降级策略（熔断后直接报错）
- ❌ 无缓存 fallback
- ❌ 熔断参数固定

### 适用场景

- 快速上线
- 紧急修复
- 最小改动

---

## 方案 2：智能降级（推荐方案）⭐⭐⭐⭐

**熔断器 + 降级策略 + 缓存 Fallback**

### 架构设计

```
请求流程：
  1. 尝试调用服务 
     ↓ 失败
  2. 检查熔断器状态
     ↓ 已熔断
  3. 执行降级策略
     ├─ 优先：返回缓存数据
     ├─ 次选：返回默认数据
     └─ 兜底：友好错误提示
```

### 完整实现

```typescript
// ============================================
// 1. 创建降级策略服务
// backend/api-gateway/src/proxy/fallback-strategy.service.ts
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '@cloudphone/shared/cache'; // 假设有缓存服务

export interface FallbackResponse {
  success: boolean;
  message: string;
  data: any;
  fromCache?: boolean;
  timestamp: string;
}

@Injectable()
export class FallbackStrategyService {
  private readonly logger = new Logger(FallbackStrategyService.name);

  // 降级策略配置
  private readonly strategies = new Map<string, Map<string, () => Promise<FallbackResponse>>>([
    // ========== Device Service ==========
    ['devices', new Map([
      ['GET /devices', async () => ({
        success: false,
        message: '设备服务暂时不可用，请稍后重试',
        data: [],
        timestamp: new Date().toISOString(),
      })],
      
      ['GET /devices/:id', async () => ({
        success: false,
        message: '无法获取设备详情，请稍后重试',
        data: null,
        timestamp: new Date().toISOString(),
      })],
      
      ['GET /devices/templates', async () => ({
        success: true,
        message: '使用缓存的设备模板',
        data: await this.getCachedTemplates(), // 从缓存获取
        fromCache: true,
        timestamp: new Date().toISOString(),
      })],
    ])],

    // ========== Billing Service ==========
    ['billing', new Map([
      ['GET /plans', async () => ({
        success: true,
        message: '使用缓存的套餐列表',
        data: await this.getCachedPlans(),
        fromCache: true,
        timestamp: new Date().toISOString(),
      })],
      
      ['POST /orders', async () => ({
        success: false,
        message: '计费服务暂时不可用，订单已保存，稍后将自动处理',
        data: { orderId: null, status: 'pending' },
        timestamp: new Date().toISOString(),
      })],
    ])],

    // ========== User Service ==========
    ['users', new Map([
      ['GET /users/me', async () => ({
        success: false,
        message: '用户服务暂时不可用，请刷新页面重试',
        data: null,
        timestamp: new Date().toISOString(),
      })],
    ])],
  ]);

  /**
   * 获取降级响应
   */
  async getFallbackResponse(
    serviceName: string,
    method: string,
    path: string,
  ): Promise<FallbackResponse> {
    const serviceStrategies = this.strategies.get(serviceName);
    
    if (!serviceStrategies) {
      return this.getDefaultFallback(serviceName);
    }

    // 尝试精确匹配
    const exactKey = `${method} ${path}`;
    let strategy = serviceStrategies.get(exactKey);

    // 尝试模糊匹配（处理动态路由参数）
    if (!strategy) {
      for (const [key, value] of serviceStrategies.entries()) {
        if (this.matchRoute(key, exactKey)) {
          strategy = value;
          break;
        }
      }
    }

    if (strategy) {
      this.logger.warn(`Using fallback strategy for ${serviceName} ${method} ${path}`);
      return strategy();
    }

    return this.getDefaultFallback(serviceName);
  }

  /**
   * 默认降级响应
   */
  private getDefaultFallback(serviceName: string): FallbackResponse {
    return {
      success: false,
      message: `${serviceName} 服务暂时不可用，请稍后重试`,
      data: null,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 路由匹配（支持参数）
   */
  private matchRoute(pattern: string, actual: string): boolean {
    const patternParts = pattern.split(' ');
    const actualParts = actual.split(' ');

    if (patternParts.length !== 2 || actualParts.length !== 2) {
      return false;
    }

    // 方法必须匹配
    if (patternParts[0] !== actualParts[0]) {
      return false;
    }

    // 路径匹配（支持 :id 参数）
    const patternPath = patternParts[1].split('/');
    const actualPath = actualParts[1].split('/');

    if (patternPath.length !== actualPath.length) {
      return false;
    }

    return patternPath.every((part, i) => 
      part.startsWith(':') || part === actualPath[i]
    );
  }

  /**
   * 获取缓存的设备模板（示例）
   */
  private async getCachedTemplates(): Promise<any[]> {
    // 这里可以从 Redis 或内存缓存获取
    return [
      { id: '1', name: 'Android 12', specs: { cpu: '4核', memory: '4GB' } },
      { id: '2', name: 'Android 13', specs: { cpu: '8核', memory: '8GB' } },
    ];
  }

  /**
   * 获取缓存的套餐列表（示例）
   */
  private async getCachedPlans(): Promise<any[]> {
    return [
      { id: '1', name: '基础套餐', price: 99 },
      { id: '2', name: '高级套餐', price: 299 },
    ];
  }
}
```

```typescript
// ============================================
// 2. 升级 ProxyService
// backend/api-gateway/src/proxy/proxy.service.ts
// ============================================

import { HttpClientService } from '@cloudphone/shared/http';
import { FallbackStrategyService } from './fallback-strategy.service';

@Injectable()
export class ProxyService {
  constructor(
    private readonly httpService: HttpService,
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
    private readonly consulService: ConsulService,
    private readonly fallbackStrategy: FallbackStrategyService, // ✅ 新增
  ) {}

  private async proxyRequestAsync(
    serviceName: string,
    path: string,
    method: string,
    data?: any,
    headers?: any,
    params?: any,
  ): Promise<any> {
    const serviceUrl = await this.getServiceUrl(serviceName);
    const url = `${serviceUrl}${path}`;
    const timeout = this.serviceConfigs.get(serviceName)?.timeout || 10000;

    try {
      // ✅ 使用熔断器 + 降级策略
      return await this.httpClient.requestWithCircuitBreaker(
        serviceName,
        async () => {
          const config: AxiosRequestConfig = {
            method: method as any,
            url,
            headers: this.sanitizeHeaders(headers),
            timeout,
            params,
            data: ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) ? data : undefined,
          };

          const response = await this.httpService.axiosRef.request(config);
          return response.data;
        },
        {
          timeout,
          errorThresholdPercentage: 50,
          resetTimeout: 30000,
          volumeThreshold: 10,
        }
      );
    } catch (error) {
      // ✅ 熔断器打开时，执行降级策略
      this.logger.warn(
        `Service ${serviceName} failed, executing fallback strategy`,
        error.message
      );

      // 返回降级响应
      return this.fallbackStrategy.getFallbackResponse(serviceName, method, path);
    }
  }
}
```

```typescript
// ============================================
// 3. 更新模块配置
// backend/api-gateway/src/proxy/proxy.module.ts
// ============================================

import { HttpClientModule } from '@cloudphone/shared/http';
import { FallbackStrategyService } from './fallback-strategy.service';

@Module({
  imports: [
    HttpModule.register({ timeout: 30000 }),
    HttpClientModule,
    ConfigModule,
  ],
  controllers: [ProxyController],
  providers: [
    ProxyService,
    FallbackStrategyService, // ✅ 注册降级服务
  ],
  exports: [ProxyService],
})
export class ProxyModule {}
```

### 效果演示

```typescript
// 场景1：设备列表查询
// Device Service 正常
GET /api/devices
→ 返回: { success: true, data: [设备1, 设备2...] }

// Device Service 熔断
GET /api/devices
→ 返回: { success: false, message: "设备服务暂时不可用", data: [] }


// 场景2：套餐列表查询（有缓存）
// Billing Service 熔断
GET /api/billing/plans
→ 返回: { 
  success: true, 
  message: "使用缓存的套餐列表",
  data: [套餐1, 套餐2...],
  fromCache: true 
}
```

### 优点 ✅

- ✅ 智能降级，不同接口不同策略
- ✅ 支持缓存 fallback
- ✅ 友好的错误提示
- ✅ 路由参数匹配（支持 `/devices/:id`）
- ✅ 可配置化

### 缺点 ❌

- ⚠️ 需要维护降级策略配置
- ⚠️ 缓存数据可能过期

### 适用场景

- 生产环境（推荐）
- 对用户体验要求高
- 需要优雅降级

---

## 方案 3：自适应熔断（高级方案）

**基于健康检查的动态熔断参数**

### 核心思想

```
传统熔断器：固定参数（50%失败率、30秒重置）
          ↓
自适应熔断：根据服务健康状态动态调整

服务健康 → 宽松熔断（80%失败率、60秒重置）
服务一般 → 标准熔断（50%失败率、30秒重置）
服务不稳 → 严格熔断（30%失败率、10秒重置）
```

### 实现代码

```typescript
// ============================================
// 创建自适应熔断器服务
// backend/api-gateway/src/proxy/adaptive-breaker.service.ts
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';

export interface ServiceHealth {
  name: string;
  healthy: boolean;
  responseTime: number;  // 毫秒
  errorRate: number;     // 0-1
  lastCheck: Date;
}

export interface BreakerConfig {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  volumeThreshold: number;
}

@Injectable()
export class AdaptiveBreakerService {
  private readonly logger = new Logger(AdaptiveBreakerService.name);
  private serviceHealthMap = new Map<string, ServiceHealth>();

  constructor(private httpService: HttpService) {}

  /**
   * 每30秒检查一次服务健康状态
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkServicesHealth() {
    const services = [
      { name: 'user-service', url: 'http://localhost:30001/health' },
      { name: 'device-service', url: 'http://localhost:30002/health' },
      { name: 'billing-service', url: 'http://localhost:30005/health' },
    ];

    for (const service of services) {
      const health = await this.checkServiceHealth(service.name, service.url);
      this.serviceHealthMap.set(service.name, health);
      
      this.logger.debug(
        `Service ${service.name}: healthy=${health.healthy}, ` +
        `responseTime=${health.responseTime}ms, errorRate=${health.errorRate}`
      );
    }
  }

  /**
   * 检查单个服务健康状态
   */
  private async checkServiceHealth(name: string, url: string): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      await this.httpService.axiosRef.get(url, { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      return {
        name,
        healthy: true,
        responseTime,
        errorRate: 0,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        name,
        healthy: false,
        responseTime: Date.now() - startTime,
        errorRate: 1,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * 根据服务健康状态获取自适应熔断配置
   */
  getAdaptiveConfig(serviceName: string, baseTimeout: number): BreakerConfig {
    const health = this.serviceHealthMap.get(serviceName);

    if (!health) {
      // 没有健康数据，使用标准配置
      return {
        timeout: baseTimeout,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        volumeThreshold: 10,
      };
    }

    // 服务健康 → 宽松熔断
    if (health.healthy && health.responseTime < 1000) {
      return {
        timeout: baseTimeout,
        errorThresholdPercentage: 80,  // 80%失败才熔断
        resetTimeout: 60000,           // 60秒后恢复
        volumeThreshold: 20,           // 更多样本
      };
    }

    // 服务响应慢 → 收紧超时
    if (health.responseTime > 3000) {
      return {
        timeout: Math.max(baseTimeout * 0.5, 3000), // 减少超时时间
        errorThresholdPercentage: 40,
        resetTimeout: 20000,
        volumeThreshold: 10,
      };
    }

    // 服务不稳定 → 严格熔断
    if (!health.healthy || health.errorRate > 0.3) {
      return {
        timeout: baseTimeout,
        errorThresholdPercentage: 30,  // 30%就熔断
        resetTimeout: 10000,           // 10秒后尝试
        volumeThreshold: 5,            // 少量样本
      };
    }

    // 默认标准配置
    return {
      timeout: baseTimeout,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      volumeThreshold: 10,
    };
  }

  /**
   * 获取所有服务健康状态
   */
  getAllServicesHealth(): Map<string, ServiceHealth> {
    return this.serviceHealthMap;
  }
}
```

```typescript
// 在 ProxyService 中使用自适应配置

private async proxyRequestAsync(...) {
  const serviceUrl = await this.getServiceUrl(serviceName);
  const url = `${serviceUrl}${path}`;
  const baseTimeout = this.serviceConfigs.get(serviceName)?.timeout || 10000;

  // ✅ 获取自适应熔断配置
  const breakerConfig = this.adaptiveBreakerService.getAdaptiveConfig(
    serviceName,
    baseTimeout
  );

  this.logger.debug(
    `Adaptive breaker config for ${serviceName}: ` +
    `errorThreshold=${breakerConfig.errorThresholdPercentage}%, ` +
    `resetTimeout=${breakerConfig.resetTimeout}ms`
  );

  try {
    return await this.httpClient.requestWithCircuitBreaker(
      serviceName,
      async () => { /* ... */ },
      breakerConfig // ✅ 使用自适应配置
    );
  } catch (error) {
    return this.fallbackStrategy.getFallbackResponse(serviceName, method, path);
  }
}
```

### 优点 ✅

- ✅ 动态调整熔断参数
- ✅ 根据服务状态优化
- ✅ 减少误熔断
- ✅ 更快恢复

### 缺点 ❌

- ⚠️ 实现复杂
- ⚠️ 需要定时任务
- ⚠️ 调试困难

---

## 方案 4：企业级完整方案（终极版）

**熔断 + 限流 + 降级 + 缓存 + 监控**

### 架构图

```
┌─────────────────────────────────────────────────────┐
│                   API Gateway                        │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │          请求进入                             │  │
│  └──────────────┬───────────────────────────────┘  │
│                 ↓                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │   1. 限流检查 (Rate Limiting)                 │  │
│  │   - 全局限流: 1000 RPS                        │  │
│  │   - 单服务限流: 200 RPS                       │  │
│  │   - 单用户限流: 10 RPS                        │  │
│  └──────────────┬───────────────────────────────┘  │
│                 ↓                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │   2. 缓存检查 (Cache Layer)                   │  │
│  │   - L1: 内存缓存 (hot data)                   │  │
│  │   - L2: Redis 缓存                            │  │
│  └──────────────┬───────────────────────────────┘  │
│                 ↓ Cache Miss                        │
│  ┌──────────────────────────────────────────────┐  │
│  │   3. 熔断器检查 (Circuit Breaker)             │  │
│  │   - 自适应参数调整                            │  │
│  │   - 健康状态监控                              │  │
│  └──────────────┬───────────────────────────────┘  │
│                 ↓ Closed                            │
│  ┌──────────────────────────────────────────────┐  │
│  │   4. 调用下游服务                             │  │
│  │   - 超时控制                                  │  │
│  │   - 重试机制                                  │  │
│  └──────────────┬───────────────────────────────┘  │
│                 ↓ Success                           │
│  ┌──────────────────────────────────────────────┐  │
│  │   5. 写入缓存                                 │  │
│  └──────────────┬───────────────────────────────┘  │
│                 ↓                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │   6. 返回响应                                 │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  任何环节失败 → 降级策略 (Fallback)                  │
│  所有操作 → 监控指标 (Metrics)                       │
└─────────────────────────────────────────────────────┘
```

### 核心代码（框架）

```typescript
// ============================================
// 企业级代理服务
// backend/api-gateway/src/proxy/enterprise-proxy.service.ts
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { HttpClientService } from '@cloudphone/shared/http';
import { CacheService } from '@cloudphone/shared/cache';
import { RateLimiterService } from './rate-limiter.service';
import { FallbackStrategyService } from './fallback-strategy.service';
import { AdaptiveBreakerService } from './adaptive-breaker.service';
import { MetricsService } from './metrics.service';

@Injectable()
export class EnterpriseProxyService {
  private readonly logger = new Logger(EnterpriseProxyService.name);

  constructor(
    private httpClient: HttpClientService,
    private cache: CacheService,
    private rateLimiter: RateLimiterService,
    private fallbackStrategy: FallbackStrategyService,
    private adaptiveBreaker: AdaptiveBreakerService,
    private metrics: MetricsService,
  ) {}

  async proxyRequest(
    serviceName: string,
    path: string,
    method: string,
    data?: any,
    headers?: any,
    userId?: string,
  ): Promise<any> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // ========== 1. 限流检查 ==========
      await this.checkRateLimit(serviceName, userId, requestId);

      // ========== 2. 缓存检查 ==========
      const cached = await this.checkCache(serviceName, method, path);
      if (cached) {
        this.metrics.recordCacheHit(serviceName);
        return cached;
      }

      // ========== 3. 熔断器 + 调用服务 ==========
      const result = await this.callServiceWithBreaker(
        serviceName,
        path,
        method,
        data,
        headers,
        requestId,
      );

      // ========== 4. 写入缓存 ==========
      await this.writeCache(serviceName, method, path, result);

      // ========== 5. 记录指标 ==========
      const duration = Date.now() - startTime;
      this.metrics.recordSuccess(serviceName, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.recordFailure(serviceName, duration, error);

      // ========== 6. 降级策略 ==========
      this.logger.error(
        `Request failed for ${serviceName} ${method} ${path}`,
        error.stack
      );

      return this.fallbackStrategy.getFallbackResponse(serviceName, method, path);
    }
  }

  /**
   * 限流检查
   */
  private async checkRateLimit(
    serviceName: string,
    userId: string | undefined,
    requestId: string,
  ): Promise<void> {
    // 全局限流
    if (!await this.rateLimiter.checkGlobalLimit()) {
      throw new Error('全局请求频率超限');
    }

    // 服务级限流
    if (!await this.rateLimiter.checkServiceLimit(serviceName)) {
      throw new Error(`服务 ${serviceName} 请求频率超限`);
    }

    // 用户级限流
    if (userId && !await this.rateLimiter.checkUserLimit(userId)) {
      throw new Error('用户请求频率超限');
    }

    this.logger.debug(`Rate limit passed for request ${requestId}`);
  }

  /**
   * 缓存检查
   */
  private async checkCache(
    serviceName: string,
    method: string,
    path: string,
  ): Promise<any | null> {
    // 只缓存 GET 请求
    if (method.toUpperCase() !== 'GET') {
      return null;
    }

    const cacheKey = `gateway:${serviceName}:${path}`;
    return this.cache.get(cacheKey);
  }

  /**
   * 写入缓存
   */
  private async writeCache(
    serviceName: string,
    method: string,
    path: string,
    data: any,
  ): Promise<void> {
    if (method.toUpperCase() !== 'GET') {
      return;
    }

    const cacheKey = `gateway:${serviceName}:${path}`;
    const ttl = this.getCacheTTL(serviceName, path);
    
    await this.cache.set(cacheKey, data, ttl);
  }

  /**
   * 带熔断器的服务调用
   */
  private async callServiceWithBreaker(
    serviceName: string,
    path: string,
    method: string,
    data: any,
    headers: any,
    requestId: string,
  ): Promise<any> {
    const serviceUrl = await this.getServiceUrl(serviceName);
    const url = `${serviceUrl}${path}`;

    // 获取自适应熔断配置
    const breakerConfig = this.adaptiveBreaker.getAdaptiveConfig(
      serviceName,
      10000
    );

    return this.httpClient.requestWithCircuitBreaker(
      serviceName,
      async () => {
        const response = await this.httpClient.request({
          method,
          url,
          data,
          headers,
          timeout: breakerConfig.timeout,
        });
        return response;
      },
      breakerConfig
    );
  }

  /**
   * 获取缓存TTL
   */
  private getCacheTTL(serviceName: string, path: string): number {
    // 根据路径返回不同的TTL
    if (path.includes('/templates')) return 0; // 永久缓存
    if (path.includes('/plans')) return 600;   // 10分钟
    if (path.includes('/balance')) return 30;   // 30秒
    return 300; // 默认5分钟
  }

  // ... 其他辅助方法
}
```

### 包含的功能

1. **限流** (Rate Limiting)
   - 全局限流
   - 服务级限流
   - 用户级限流

2. **多层缓存**
   - L1 内存缓存
   - L2 Redis 缓存
   - 智能 TTL

3. **熔断保护**
   - 自适应参数
   - 健康检查
   - 自动恢复

4. **降级策略**
   - 缓存 fallback
   - 友好错误
   - 路由匹配

5. **监控指标**
   - 请求量统计
   - 响应时间
   - 成功率/失败率
   - 缓存命中率

### 优点 ✅

- ✅ 生产级完整方案
- ✅ 高可用、高性能
- ✅ 全面监控
- ✅ 可扩展

### 缺点 ❌

- ⚠️ 实现复杂
- ⚠️ 工作量大（2-3天）
- ⚠️ 需要多个依赖

---

## 🎯 推荐选择

### 根据你的情况选择

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| **紧急修复** | 方案1 | 1-2小时快速上线 |
| **生产环境** | 方案2 ⭐⭐⭐⭐ | 功能完整、工作量适中 |
| **高可用要求** | 方案3 | 自适应优化 |
| **大型系统** | 方案4 | 企业级完整方案 |

### 💡 我的建议

**分阶段实施**：

```
第1步（今天）：方案1 - 基础熔断
  - 1-2小时
  - 立即防止级联故障
  - 验证效果

第2步（本周）：方案2 - 智能降级
  - 增加降级策略
  - 缓存 fallback
  - 提升用户体验

第3步（下周）：方案3 - 自适应熔断
  - 健康检查
  - 动态参数
  - 优化熔断策略

第4步（下月）：方案4 - 完整方案
  - 限流
  - 多层缓存
  - 完整监控
```

---

## ⚡ Quick Win - 立即可做

### 最简单的实现（10分钟）

```typescript
// 修改 proxy.service.ts，仅改3行代码

// 1. 导入
import { HttpClientService } from '@cloudphone/shared/http';

// 2. 构造函数注入
constructor(
  private readonly httpClient: HttpClientService, // ✅ 新增
  // ... 其他依赖
) {}

// 3. 替换直接调用（第160行）
// 原来：
// const response = await this.httpService.axiosRef.request(config);
// return response.data;

// 改为：
return this.httpClient.requestWithCircuitBreaker(
  serviceName,
  async () => {
    const response = await this.httpService.axiosRef.request(config);
    return response.data;
  },
  { timeout, errorThresholdPercentage: 50, resetTimeout: 30000 }
);

// 4. 更新 proxy.module.ts
import { HttpClientModule } from '@cloudphone/shared/http';

imports: [
  HttpClientModule, // ✅ 新增
  // ... 其他
]
```

**立即效果**:
- ✅ 防止级联故障
- ✅ 自动熔断恢复
- ✅ 零风险改动

---

## 📊 方案对比总结

| 方案 | 代码改动 | 工作量 | 防护能力 | 用户体验 | 推荐度 |
|------|---------|--------|---------|---------|--------|
| 方案1 | 3行 | 1-2小时 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 方案2 | +1个文件 | 半天 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 方案3 | +2个文件 | 1天 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 方案4 | +5个文件 | 2-3天 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

**需要我现在就帮你实现哪个方案？**

我建议：
1. **现在（10分钟）**：实现方案1，立即见效
2. **本周**：升级到方案2，完善降级策略
3. **后续**：按需升级到方案3或4

选一个，我立即开始编码！🚀

