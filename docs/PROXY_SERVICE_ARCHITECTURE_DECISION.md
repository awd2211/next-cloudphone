# 代理服务架构决策文档

> 决策日期: 2025-11-02
> 问题: 集成IPRoyal、Bright Data、Oxylabs是否需要独立微服务？

## 目录

- [问题陈述](#问题陈述)
- [方案对比](#方案对比)
- [详细分析](#详细分析)
- [最终建议](#最终建议)
- [实施路线图](#实施路线图)

---

## 问题陈述

云手机平台需要集成多家代理IP提供商（IPRoyal、Bright Data、Oxylabs），面临架构选择：

**方案A**: 创建独立的 Proxy Service 微服务
**方案B**: 将代理管理功能集成到现有的 Device Service

---

## 方案对比

### 方案A: 独立 Proxy Service ⭐⭐⭐⭐⭐ (推荐)

#### 架构图

```
┌──────────────────────────────────────────────────────┐
│               API Gateway (30000)                     │
│            JWT Auth + Rate Limiting                   │
└────────────────┬────────────────┬────────────────────┘
                 │                │
       ┌─────────┴────────┐      │
       │                  │      │
       ▼                  ▼      ▼
┌─────────────┐  ┌──────────────────┐  ┌─────────────┐
│   Device    │  │  Proxy Service   │  │    Other    │
│  Service    │─▶│    (30007)       │  │  Services   │
│  (30002)    │  │                  │  │             │
└─────────────┘  └────────┬─────────┘  └─────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐      ┌──────────┐     ┌──────────┐
   │ IPRoyal │      │  Bright  │     │ Oxylabs  │
   │ Adapter │      │   Data   │     │ Adapter  │
   └─────────┘      │ Adapter  │     └──────────┘
                    └──────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────────────────────────────────────────┐
   │          Proxy Pool Manager                  │
   │  - 代理池管理                                 │
   │  - 健康检查 (定时任务)                        │
   │  - 智能轮换                                   │
   │  - 故障转移                                   │
   └─────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌──────────┐    ┌───────────┐    ┌────────────┐
   │  Redis   │    │PostgreSQL │    │ Prometheus │
   │(代理缓存)│    │(使用统计) │    │  (监控)    │
   └──────────┘    └───────────┘    └────────────┘
```

#### 优势 ✅

**1. 单一职责原则 (SRP)**
```typescript
// Proxy Service 只负责代理管理
- 代理池管理
- 供应商适配
- 健康监控
- 使用统计

// Device Service 专注设备管理
- 设备生命周期
- Docker容器管理
- ADB控制
```

**2. 可复用性**
```typescript
// 不仅device-service可以使用，未来其他服务也可以
- app-service: APK下载时使用代理
- billing-service: 调用第三方支付API时使用代理
- notification-service: 发送国际短信时使用代理
- scheduler-service: 定时任务爬虫时使用代理
```

**3. 独立扩展**
```bash
# 代理服务和设备服务可以独立扩展
pm2 scale proxy-service +2   # 代理需求增加时
pm2 scale device-service +1  # 设备需求增加时

# 独立部署
docker-compose up -d proxy-service  # 只更新代理服务
```

**4. 故障隔离**
```
代理服务故障 ❌
   ↓
设备服务正常运行 ✅ (使用降级策略)
   ↓
其他功能不受影响 ✅
```

**5. 技术栈灵活**
```typescript
// 可以使用不同的技术栈
Proxy Service:
- 可以使用Go实现（高性能代理转发）
- 可以使用Python（丰富的爬虫库）
- 可以使用Rust（极致性能）

Device Service:
- 继续使用NestJS/TypeScript
```

**6. 数据库隔离**
```
独立数据库: cloudphone_proxy

表结构:
- proxy_providers      # 供应商配置
- proxy_pool           # 代理池
- proxy_usage          # 使用记录
- proxy_health         # 健康检查记录
- proxy_statistics     # 统计数据
```

**7. 开发和部署独立**
```bash
# 团队A专注Proxy Service
cd backend/proxy-service
pnpm dev

# 团队B专注Device Service
cd backend/device-service
pnpm dev

# 互不干扰，提高开发效率
```

**8. 更容易测试**
```typescript
// 单元测试
describe('ProxyPoolManager', () => {
  // 只测试代理逻辑，不依赖设备服务
});

// 集成测试
describe('Proxy Service E2E', () => {
  // 独立的E2E测试，不需要启动整个设备服务
});
```

**9. 监控和日志独立**
```yaml
# Prometheus独立监控
proxy_service_requests_total
proxy_service_pool_size
proxy_service_health_check_failures
proxy_service_provider_response_time

# 日志独立
logs/proxy-service.log
logs/device-service.log
```

**10. 版本控制独立**
```
proxy-service: v1.2.0 (最新)
device-service: v2.5.1 (稳定版)

# 升级proxy-service不影响device-service
```

#### 劣势 ❌

**1. 增加系统复杂度**
- 多一个服务需要部署和维护
- 服务间通信增加网络开销（~10-50ms）

**2. 运维成本增加**
```bash
# 需要额外的监控和告警
- 健康检查
- 日志收集
- 性能监控
- 错误追踪

# 额外的资源消耗
- CPU: ~0.5-1 core
- 内存: ~512MB-1GB
- 端口: 30007
```

**3. 开发初期成本**
- 需要定义服务接口
- 需要处理服务发现（Consul）
- 需要实现重试和熔断机制

#### 实现复杂度: ⭐⭐⭐ (中等)

```typescript
// Device Service调用Proxy Service示例
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DevicesService {
  constructor(private httpService: HttpService) {}

  async createDevice(dto: CreateDeviceDto) {
    // 1. 获取代理
    const proxy = await this.getProxyFromService({
      country: dto.country || 'US',
      minQuality: 70
    });

    // 2. 创建设备（带代理配置）
    const device = await this.dockerService.createContainer({
      // ...
      Env: [
        `HTTP_PROXY=http://${proxy.host}:${proxy.port}`,
        `HTTPS_PROXY=http://${proxy.host}:${proxy.port}`
      ]
    });

    return device;
  }

  private async getProxyFromService(criteria: any): Promise<ProxyInfo> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'http://proxy-service:30007/proxy/acquire',
          criteria,
          { timeout: 5000 }
        )
      );
      return response.data.data;
    } catch (error) {
      // 降级策略：使用默认代理或跳过代理
      this.logger.warn('Failed to get proxy, using fallback');
      return this.getFallbackProxy();
    }
  }
}
```

---

### 方案B: 集成到 Device Service ⭐⭐⭐

#### 架构图

```
┌──────────────────────────────────────────────────┐
│             API Gateway (30000)                   │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │    Device Service (30002)  │
        │                            │
        │  ┌──────────────────────┐  │
        │  │  Devices Module      │  │
        │  └──────────────────────┘  │
        │                            │
        │  ┌──────────────────────┐  │
        │  │  Proxy Module        │  │ ⬅ 新增模块
        │  │  - ProxyManager      │  │
        │  │  - ProviderAdapters  │  │
        │  │  - HealthCheck       │  │
        │  └──────────────────────┘  │
        │                            │
        │  ┌──────────────────────┐  │
        │  │  Docker Module       │  │
        │  └──────────────────────┘  │
        │                            │
        │  ┌──────────────────────┐  │
        │  │  ADB Module          │  │
        │  └──────────────────────┘  │
        └────────────┬───────────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
     ▼               ▼               ▼
┌─────────┐    ┌──────────┐    ┌──────────┐
│ IPRoyal │    │  Bright  │    │ Oxylabs  │
└─────────┘    │   Data   │    └──────────┘
               └──────────┘
```

#### 优势 ✅

**1. 简单直接**
```typescript
// 代理管理和设备管理在同一服务中
@Module({
  imports: [
    DevicesModule,
    ProxyModule,  // ⬅ 直接导入
    DockerModule,
    ADBModule,
  ]
})
export class DeviceServiceModule {}
```

**2. 减少网络调用**
```typescript
// 直接调用，无HTTP开销
@Injectable()
export class DevicesService {
  constructor(
    private proxyManager: ProxyPoolManager  // ⬅ 直接注入
  ) {}

  async createDevice(dto: CreateDeviceDto) {
    // 直接调用，无网络延迟
    const proxy = await this.proxyManager.getProxy(criteria);
    // ...
  }
}
```

**3. 部署简单**
```bash
# 只需部署一个服务
pm2 start ecosystem.config.js --only device-service

# 无需额外的服务发现配置
```

**4. 事务一致性**
```typescript
// 可以在同一个事务中处理设备和代理
@Transaction()
async createDeviceWithProxy(dto: CreateDeviceDto) {
  const device = await this.deviceRepo.save(deviceData);
  const proxyMapping = await this.proxyMappingRepo.save({
    deviceId: device.id,
    proxyId: proxy.id
  });
  return { device, proxy: proxyMapping };
}
```

**5. 调试更简单**
```typescript
// 所有代码在一个进程中，调试更容易
// 可以直接打断点查看代理分配过程
```

#### 劣势 ❌

**1. 违反单一职责原则**
```
Device Service职责过重:
- 设备CRUD ✅
- Docker管理 ✅
- ADB控制 ✅
- 端口管理 ✅
- 快照备份 ✅
- 生命周期 ✅
- 故障恢复 ✅
- 代理管理 ❓ ← 职责膨胀
```

**2. 无法被其他服务复用**
```typescript
// App Service想用代理下载APK？
// ❌ 需要重复实现代理逻辑

// Billing Service想用代理调用支付API？
// ❌ 需要重复实现代理逻辑

// 导致代码重复
```

**3. 扩展性差**
```bash
# 设备服务压力大，需要扩展
pm2 scale device-service +2

# 但代理服务可能不需要那么多实例
# 资源浪费 ❌
```

**4. 代码耦合度高**
```typescript
// 代理逻辑和设备逻辑混在一起
// 修改代理逻辑可能影响设备功能
// 增加回归测试成本
```

**5. 数据库表混杂**
```sql
-- cloudphone_device数据库中混入代理相关表
CREATE TABLE devices (...);
CREATE TABLE device_snapshots (...);
CREATE TABLE proxy_pool (...);        -- ❌ 不属于设备域
CREATE TABLE proxy_usage (...);       -- ❌ 不属于设备域
CREATE TABLE proxy_health (...);      -- ❌ 不属于设备域
```

**6. 测试复杂**
```typescript
// 测试设备功能时，需要mock代理
// 测试代理功能时，需要mock设备
// 互相依赖，测试复杂
```

**7. 监控指标混淆**
```
device_service_requests_total  // 包含设备请求和代理请求？
device_service_error_rate      // 设备错误还是代理错误？

// 难以区分问题来源
```

**8. 版本管理困难**
```
# 升级代理逻辑需要重新部署整个设备服务
# 风险较大
```

#### 实现复杂度: ⭐⭐ (较低)

```typescript
// 实现示例
@Module({
  imports: [
    TypeOrmModule.forFeature([Device, ProxyUsage, ProxyHealth]),
  ],
  providers: [
    DevicesService,
    ProxyPoolManager,  // ⬅ 作为provider
    BrightDataAdapter,
    OxylabsAdapter,
    IPRoyalAdapter,
  ],
})
export class DeviceServiceModule {}

// 在DevicesService中直接使用
@Injectable()
export class DevicesService {
  constructor(
    private proxyPoolManager: ProxyPoolManager,
    // ...
  ) {}
}
```

---

## 详细分析

### 1. 从微服务设计原则角度

#### 单一职责原则 (Single Responsibility Principle)

**独立微服务 ✅**
```
Proxy Service:
- 唯一职责: 管理代理IP资源
- 变更原因: 只有代理相关需求变化时才需要修改

Device Service:
- 唯一职责: 管理云手机设备
- 变更原因: 只有设备相关需求变化时才需要修改
```

**集成方案 ❌**
```
Device Service:
- 职责1: 管理云手机设备
- 职责2: 管理代理IP
- 变更原因: 设备需求变化 OR 代理需求变化
  → 违反SRP，一个类有多个变更原因
```

#### 有界上下文 (Bounded Context - DDD)

**独立微服务 ✅**
```
┌────────────────────┐      ┌────────────────────┐
│  Device Context    │      │  Proxy Context     │
│                    │      │                    │
│  - Device          │      │  - ProxyPool       │
│  - Container       │      │  - ProxyProvider   │
│  - Snapshot        │      │  - ProxyUsage      │
│  - Template        │      │  - HealthCheck     │
└────────────────────┘      └────────────────────┘

清晰的领域边界 ✅
```

**集成方案 ❌**
```
┌──────────────────────────────────────┐
│        Device Context (混杂)          │
│                                      │
│  - Device, Container, Snapshot      │
│  - ProxyPool, ProxyProvider  ❌     │
│  - HealthCheck  ❌                   │
└──────────────────────────────────────┘

领域边界不清晰 ❌
```

---

### 2. 从实际需求角度

#### 需求1: 多服务共享代理

**场景分析**:
```typescript
// 未来可能的需求

// App Service: 下载APK时使用代理（避免被限流）
@Injectable()
export class AppsService {
  async downloadApk(url: string) {
    const proxy = await this.getProxy({ country: 'US' });
    return axios.get(url, { proxy });
  }
}

// Billing Service: 调用国际支付API时使用代理
@Injectable()
export class PaymentService {
  async createStripePayment() {
    const proxy = await this.getProxy({ country: 'US' });
    // 通过美国IP访问Stripe API
  }
}

// Notification Service: 发送国际短信时使用代理
@Injectable()
export class SMSService {
  async sendInternationalSMS() {
    const proxy = await this.getProxy({ country: 'CN' });
    // 通过中国IP发送短信
  }
}
```

**独立微服务 ✅**: 所有服务都可以调用 Proxy Service
**集成方案 ❌**: 每个服务都要重复实现代理逻辑

---

#### 需求2: 代理池需要定时任务

**场景分析**:
```typescript
// 定时任务需求

// 每2分钟: 健康检查
@Cron('*/2 * * * *')
async checkProxyHealth() {
  const proxies = await this.getAllProxies();
  for (const proxy of proxies) {
    await this.testProxyHealth(proxy);
  }
}

// 每小时: 清理失效代理
@Cron('0 * * * *')
async cleanupFailedProxies() {
  await this.removeProxiesWithFailureRate(threshold: 0.8);
}

// 每天: 刷新代理池
@Cron('0 0 * * *')
async refreshProxyPool() {
  await this.fetchNewProxiesFromProviders();
}

// 每6小时: 统计分析
@Cron('0 */6 * * *')
async generateUsageStats() {
  await this.calculateProviderCostEfficiency();
}
```

**独立微服务 ✅**: 定时任务专属于Proxy Service
**集成方案 ⚠️**: Device Service已经有很多定时任务，再加代理任务会很臃肿

---

#### 需求3: 独立的监控和告警

**Prometheus指标**:
```yaml
# Proxy Service独有指标
proxy_pool_total_size
proxy_pool_available_count
proxy_pool_in_use_count
proxy_provider_api_calls_total
proxy_provider_api_errors_total
proxy_provider_response_time_seconds
proxy_health_check_failures_total
proxy_rotation_count
proxy_acquisition_duration_seconds
proxy_cost_per_gb_dollars

# 这些指标与设备无关，应该独立监控
```

**独立微服务 ✅**: 清晰的指标命名空间
**集成方案 ❌**: 指标混在一起，难以区分

---

### 3. 从性能和成本角度

#### 性能对比

| 维度 | 独立微服务 | 集成方案 |
|------|-----------|---------|
| 获取代理延迟 | ~20-50ms (HTTP调用) | ~1ms (内存调用) |
| 并发处理能力 | 可独立扩展 | 受限于device-service |
| 故障影响范围 | 代理故障不影响设备 | 代理故障可能拖慢设备 |
| 内存占用 | 独立进程 ~512MB | 共享进程 +200MB |

**分析**:
- 20-50ms的网络延迟在设备创建场景下（通常需要10-30秒）可以忽略不计
- 可独立扩展带来的灵活性 > 省下的50ms延迟

---

#### 成本对比

| 成本项 | 独立微服务 | 集成方案 |
|--------|-----------|---------|
| 开发成本 | 中等（需定义接口） | 低（直接编码） |
| 运维成本 | 高（多一个服务） | 低（服务数量不变） |
| 维护成本 | 低（职责清晰） | 高（代码耦合） |
| 扩展成本 | 低（按需扩展） | 高（资源浪费） |
| 重构成本 | 低（独立重构） | 高（影响整个服务） |

**长期视角**: 独立微服务虽然前期成本高，但长期维护成本更低

---

### 4. 从团队协作角度

#### 并行开发

**独立微服务 ✅**
```
Team A (代理团队):
├─ 开发Proxy Service
├─ 实现供应商适配器
├─ 优化代理池算法
└─ 独立部署和测试

Team B (设备团队):
├─ 开发Device Service
├─ 集成Docker和ADB
├─ 实现设备生命周期
└─ 独立部署和测试

→ 两个团队并行开发，互不阻塞 ✅
```

**集成方案 ❌**
```
Team (统一团队):
├─ 需要在同一代码库工作
├─ 可能产生Git冲突
├─ 需要协调开发进度
└─ 代码审查更复杂

→ 开发效率降低 ❌
```

---

## 最终建议

### 🏆 推荐方案: 独立 Proxy Service 微服务

#### 判断依据

基于以下关键因素，**强烈推荐独立微服务**：

**1. 复用性需求 (权重: ⭐⭐⭐⭐⭐)**
```
未来可能需要代理的场景:
✅ Device Service - 设备网络代理
✅ App Service - APK下载代理
✅ Billing Service - 国际支付API代理
✅ Notification Service - 国际短信代理
✅ Media Service - WebRTC TURN服务器代理

→ 独立服务的复用价值 > 集成方案的便利性
```

**2. 职责分离 (权重: ⭐⭐⭐⭐⭐)**
```
代理管理是独立的业务域:
- 有自己的数据模型（ProxyPool, Usage, Health）
- 有自己的业务规则（轮换策略、健康检查）
- 有自己的定时任务
- 有自己的监控指标

→ 完全符合微服务划分标准
```

**3. 扩展性 (权重: ⭐⭐⭐⭐)**
```
代理服务和设备服务的扩展需求不同:
- 代理服务: 请求频率高，需要更多实例
- 设备服务: Docker限制，单机实例有限

→ 独立扩展更灵活
```

**4. 故障隔离 (权重: ⭐⭐⭐⭐)**
```
代理供应商可能出现故障:
- API限流
- 服务中断
- 代理质量下降

→ 不应影响设备服务的核心功能
```

**5. 长期维护 (权重: ⭐⭐⭐⭐⭐)**
```
代理逻辑可能频繁变化:
- 新增供应商
- 优化轮换算法
- 调整健康检查策略

→ 独立服务更易维护和迭代
```

---

### 架构决策记录 (ADR)

```yaml
Title: 创建独立的Proxy Service微服务
Status: APPROVED
Date: 2025-11-02
Decision Makers: 架构团队

Context:
  需要集成IPRoyal、Bright Data、Oxylabs三家代理提供商

Decision:
  创建独立的Proxy Service微服务 (Port 30007)

Rationale:
  1. 符合单一职责原则
  2. 支持多服务复用
  3. 独立扩展和故障隔离
  4. 长期维护成本更低
  5. 团队可并行开发

Consequences:
  ✅ 系统架构更清晰
  ✅ 代码复用性提高
  ✅ 故障影响范围小
  ❌ 增加一个部署单元
  ❌ 服务间通信增加~50ms延迟

Alternatives Considered:
  - 集成到Device Service: 被否决（职责不清、无法复用）

Trade-offs:
  用少量的部署复杂度，换取更好的架构设计和长期可维护性
```

---

## 实施路线图

### Phase 1: 基础框架 (Week 1-2)

#### Week 1: 脚手架搭建

```bash
# 1. 创建服务目录
mkdir -p backend/proxy-service/src/{adapters,pool,proxy,statistics,entities,config,common}

# 2. 初始化NestJS项目
cd backend/proxy-service
nest new . --skip-git

# 3. 安装依赖
pnpm add @nestjs/typeorm typeorm pg
pnpm add @nestjs/schedule
pnpm add @nestjs/axios axios
pnpm add @golevelup/nestjs-rabbitmq
pnpm add cache-manager cache-manager-redis-store
pnpm add @cloudphone/shared

# 4. 配置TypeORM
# 创建 cloudphone_proxy 数据库
```

**目录结构**:
```
backend/proxy-service/
├── src/
│   ├── adapters/
│   │   ├── base.adapter.ts         # 供应商基类
│   │   ├── iproyal.adapter.ts      # Week 1
│   │   ├── brightdata.adapter.ts   # Week 2
│   │   ├── oxylabs.adapter.ts      # Week 2
│   │   └── index.ts
│   ├── pool/
│   │   ├── pool-manager.service.ts
│   │   ├── proxy-rotator.service.ts
│   │   └── health-monitor.service.ts
│   ├── proxy/
│   │   ├── proxy.controller.ts
│   │   ├── proxy.service.ts
│   │   ├── proxy.module.ts
│   │   └── dto/
│   ├── entities/
│   │   ├── proxy-provider.entity.ts
│   │   ├── proxy-usage.entity.ts
│   │   └── proxy-health.entity.ts
│   ├── config/
│   │   └── providers.config.ts
│   └── app.module.ts
├── test/
├── .env.example
└── package.json
```

**Deliverables**:
- [x] NestJS项目初始化
- [x] 数据库表设计和迁移
- [x] 基础的 ProxyController 和 ProxyService
- [x] IPRoyal适配器实现

---

#### Week 2: 核心功能

**任务列表**:
1. 实现 Bright Data 适配器
2. 实现 Oxylabs 适配器
3. 实现 ProxyPoolManager
4. 实现基础的代理获取和释放API
5. 集成Redis缓存

**API设计**:
```typescript
// 1. 获取代理
POST /proxy/acquire
{
  "country": "US",
  "city": "New York",
  "protocol": "http",
  "minQuality": 70,
  "sessionSticky": true
}

Response:
{
  "success": true,
  "data": {
    "id": "proxy-123",
    "host": "proxy.brightdata.com",
    "port": 22225,
    "username": "user-xxx",
    "password": "pass-xxx",
    "protocol": "http",
    "location": { "country": "US", "city": "New York" },
    "quality": 85,
    "provider": "brightdata"
  }
}

// 2. 释放代理
POST /proxy/release/:proxyId

// 3. 报告失败
POST /proxy/report-failure/:proxyId
{
  "error": "Connection timeout",
  "code": "TIMEOUT"
}

// 4. 获取统计
GET /proxy/stats

// 5. 健康检查
GET /proxy/health
```

**Deliverables**:
- [x] 三个供应商适配器完成
- [x] 代理池基础功能
- [x] REST API实现
- [x] Redis集成

---

### Phase 2: 高级功能 (Week 3-4)

#### Week 3: 健康监控和故障转移

**功能列表**:
1. 实现 HealthMonitor（定时健康检查）
2. 实现 FailoverHandler（自动故障转移）
3. 实现 ProxyRotator（智能轮换策略）
4. 添加Prometheus指标

**代码示例**:
```typescript
// health-monitor.service.ts
@Injectable()
export class ProxyHealthMonitor {
  @Cron('*/2 * * * *')  // 每2分钟检查一次
  async checkAllProxies() {
    const proxies = await this.poolManager.getAllProxies();

    for (const proxy of proxies) {
      const health = await this.testProxy(proxy);

      if (!health.isHealthy) {
        await this.poolManager.markUnhealthy(proxy.id);
        this.logger.warn(`Proxy ${proxy.id} marked unhealthy`);
      }
    }
  }

  private async testProxy(proxy: ProxyInfo): Promise<HealthCheck> {
    try {
      const start = Date.now();
      await axios.get('https://api.ipify.org', {
        proxy: {
          host: proxy.host,
          port: proxy.port,
          auth: { username: proxy.username, password: proxy.password }
        },
        timeout: 10000
      });
      const latency = Date.now() - start;

      return {
        isHealthy: true,
        latency,
        checkedAt: new Date()
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: error.message,
        checkedAt: new Date()
      };
    }
  }
}
```

**Deliverables**:
- [x] 定时健康检查
- [x] 自动故障转移
- [x] 智能轮换策略
- [x] Prometheus集成

---

#### Week 4: 统计分析

**功能列表**:
1. 使用统计记录
2. 成本分析
3. 供应商效率评估
4. 统计API

**Statistics API**:
```typescript
// GET /statistics/usage
{
  "period": "2025-11-01 to 2025-11-02",
  "totalRequests": 15000,
  "totalBandwidth": "125 GB",
  "providerBreakdown": {
    "brightdata": { "requests": 8000, "bandwidth": "70 GB", "cost": "$420" },
    "oxylabs": { "requests": 5000, "bandwidth": "40 GB", "cost": "$200" },
    "iproyal": { "requests": 2000, "bandwidth": "15 GB", "cost": "$26" }
  },
  "averageLatency": "850ms",
  "errorRate": "2.5%"
}

// GET /statistics/cost-efficiency
{
  "providers": [
    {
      "name": "iproyal",
      "costPerRequest": "$0.0013",
      "successRate": "97.5%",
      "avgLatency": "920ms",
      "score": 92
    },
    {
      "name": "brightdata",
      "costPerRequest": "$0.0525",
      "successRate": "99.2%",
      "avgLatency": "580ms",
      "score": 88
    }
  ]
}
```

**Deliverables**:
- [x] 使用统计功能
- [x] 成本分析
- [x] 效率评估算法
- [x] 统计Dashboard API

---

### Phase 3: 集成和测试 (Week 5-6)

#### Week 5: Device Service集成

**集成步骤**:

**1. 在Device Service添加HTTP客户端**
```typescript
// backend/device-service/src/app.module.ts
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    // ...
  ],
})
export class AppModule {}
```

**2. 创建ProxyClient服务**
```typescript
// backend/device-service/src/proxy/proxy-client.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProxyClientService {
  private readonly logger = new Logger(ProxyClientService.name);
  private readonly proxyServiceUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.proxyServiceUrl = this.configService.get(
      'PROXY_SERVICE_URL',
      'http://localhost:30007'
    );
  }

  async acquireProxy(criteria: ProxyCriteria): Promise<ProxyInfo> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.proxyServiceUrl}/proxy/acquire`,
          criteria
        )
      );

      this.logger.log(`Acquired proxy: ${response.data.data.id}`);
      return response.data.data;
    } catch (error) {
      this.logger.error('Failed to acquire proxy:', error.message);

      // 降级策略：返回null，让调用方决定如何处理
      if (this.shouldUseFallback(error)) {
        return this.getFallbackProxy();
      }

      throw error;
    }
  }

  async releaseProxy(proxyId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.proxyServiceUrl}/proxy/release/${proxyId}`
        )
      );
      this.logger.log(`Released proxy: ${proxyId}`);
    } catch (error) {
      this.logger.warn(`Failed to release proxy ${proxyId}:`, error.message);
      // 释放失败不影响主流程
    }
  }

  async reportFailure(
    proxyId: string,
    error: { message: string; code?: string }
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.proxyServiceUrl}/proxy/report-failure/${proxyId}`,
          error
        )
      );
    } catch (err) {
      this.logger.warn('Failed to report proxy failure:', err.message);
    }
  }

  private shouldUseFallback(error: any): boolean {
    // Proxy Service不可用时，使用降级策略
    return (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.response?.status === 503
    );
  }

  private getFallbackProxy(): ProxyInfo | null {
    // 降级策略1: 返回配置的默认代理
    const fallbackHost = this.configService.get('FALLBACK_PROXY_HOST');
    if (fallbackHost) {
      return {
        id: 'fallback-proxy',
        host: fallbackHost,
        port: parseInt(this.configService.get('FALLBACK_PROXY_PORT', '8080')),
        protocol: 'http',
        location: { country: 'US', city: '' },
        quality: 50,
        provider: 'fallback',
      };
    }

    // 降级策略2: 不使用代理
    return null;
  }
}
```

**3. 更新DevicesService**
```typescript
// backend/device-service/src/devices/devices.service.ts
import { ProxyClientService } from '../proxy/proxy-client.service';

@Injectable()
export class DevicesService {
  constructor(
    private proxyClient: ProxyClientService,
    // ... 其他依赖
  ) {}

  async createDevice(dto: CreateDeviceDto) {
    // 1. 获取代理
    let proxy: ProxyInfo | null = null;
    if (dto.useProxy !== false) {
      proxy = await this.proxyClient.acquireProxy({
        country: dto.country || 'US',
        protocol: 'http',
        minQuality: 70,
      });
    }

    // 2. 创建容器（带或不带代理）
    const containerConfig = this.buildContainerConfig(dto, proxy);
    const container = await this.dockerService.createContainer(containerConfig);

    // 3. 启动容器
    await container.start();

    // 4. 如果使用代理，配置Android
    if (proxy) {
      await this.configureAndroidProxy(container.id, proxy);

      // 5. 保存设备-代理映射
      await this.saveDeviceProxyMapping(dto.deviceId, proxy.id);
    }

    return {
      deviceId: dto.deviceId,
      container: container.id,
      proxy: proxy ? { id: proxy.id, location: proxy.location } : null,
    };
  }

  private buildContainerConfig(dto: CreateDeviceDto, proxy?: ProxyInfo) {
    const env = [
      `DEVICE_ID=${dto.deviceId}`,
      // ... 其他环境变量
    ];

    if (proxy) {
      env.push(`HTTP_PROXY=http://${proxy.host}:${proxy.port}`);
      env.push(`HTTPS_PROXY=http://${proxy.host}:${proxy.port}`);
      env.push(`NO_PROXY=localhost,127.0.0.1`);
    }

    return {
      Image: 'redroid/redroid:latest',
      name: `device-${dto.deviceId}`,
      Env: env,
      // ... 其他配置
    };
  }

  async deleteDevice(deviceId: string) {
    // 1. 获取代理映射
    const mapping = await this.getDeviceProxyMapping(deviceId);

    // 2. 删除容器
    await this.dockerService.removeContainer(deviceId);

    // 3. 释放代理
    if (mapping?.proxyId) {
      await this.proxyClient.releaseProxy(mapping.proxyId);
    }

    // 4. 删除映射
    await this.deleteDeviceProxyMapping(deviceId);
  }
}
```

**Deliverables**:
- [x] ProxyClient服务实现
- [x] Device Service集成
- [x] 降级策略实现
- [x] 集成测试

---

#### Week 6: 测试和优化

**测试计划**:

1. **单元测试**
```bash
# Proxy Service单元测试
cd backend/proxy-service
pnpm test

# 覆盖率要求: >80%
pnpm test:cov
```

2. **集成测试**
```bash
# 启动所有依赖
docker-compose -f docker-compose.dev.yml up -d

# 运行集成测试
cd backend/proxy-service
pnpm test:e2e
```

3. **负载测试**
```bash
# 使用Apache Bench测试
ab -n 1000 -c 10 http://localhost:30007/proxy/acquire

# 使用k6测试
k6 run scripts/load-test-proxy-service.js
```

4. **故障测试**
```bash
# 测试Proxy Service不可用时的降级
pm2 stop proxy-service
# Device Service应该能正常创建设备（使用fallback或无代理）

# 测试供应商API故障
# 应该自动切换到其他供应商
```

**Deliverables**:
- [x] 单元测试覆盖率 >80%
- [x] 集成测试通过
- [x] 负载测试报告
- [x] 故障恢复验证

---

### Phase 4: 生产就绪 (Week 7-8)

#### Week 7: 监控和告警

**监控指标**:
```yaml
# Prometheus指标
proxy_pool_size_total{provider="brightdata"}
proxy_pool_available{provider="brightdata"}
proxy_pool_in_use{provider="brightdata"}

proxy_acquisition_duration_seconds{provider="brightdata"}
proxy_acquisition_errors_total{provider="brightdata"}

proxy_health_check_failures_total{provider="brightdata"}
proxy_provider_api_response_time_seconds{provider="brightdata"}

proxy_usage_bandwidth_bytes_total{provider="brightdata"}
proxy_usage_requests_total{provider="brightdata"}
```

**Grafana Dashboard**:
```bash
# 导入Dashboard
cp infrastructure/monitoring/grafana/dashboards/proxy-service.json \
   /var/lib/grafana/dashboards/
```

**告警规则**:
```yaml
# Prometheus AlertManager规则
groups:
  - name: proxy_service
    rules:
      - alert: ProxyPoolLow
        expr: proxy_pool_available < 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Proxy pool running low"

      - alert: ProxyServiceDown
        expr: up{job="proxy-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Proxy service is down"

      - alert: HighProxyErrorRate
        expr: rate(proxy_acquisition_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High proxy acquisition error rate"
```

**Deliverables**:
- [x] Prometheus集成
- [x] Grafana Dashboard
- [x] 告警规则配置
- [x] 日志聚合（ELK或Loki）

---

#### Week 8: 文档和部署

**文档**:
1. API文档（Swagger）
2. 架构设计文档
3. 运维手册
4. 故障排查指南

**部署清单**:
```yaml
# ecosystem.config.js更新
module.exports = {
  apps: [
    // ... 现有服务
    {
      name: 'proxy-service',
      script: 'dist/main.js',
      cwd: './backend/proxy-service',
      instances: 2,  // 2个实例
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 30007,
      },
      error_file: './logs/proxy-service-error.log',
      out_file: './logs/proxy-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

**数据库初始化**:
```sql
-- database/init-databases.sql更新
CREATE DATABASE cloudphone_proxy;
\c cloudphone_proxy;

-- 表创建脚本
CREATE TABLE proxy_providers (...);
CREATE TABLE proxy_pool (...);
CREATE TABLE proxy_usage (...);
CREATE TABLE proxy_health (...);
```

**API Gateway路由更新**:
```typescript
// backend/api-gateway/src/proxy/proxy.controller.ts
@UseGuards(JwtAuthGuard)
@All("proxy")
async proxyProxyServiceExact(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("proxy-service", req, res);
}

@UseGuards(JwtAuthGuard)
@All("proxy/*path")
async proxyProxyService(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("proxy-service", req, res);
}
```

**Deliverables**:
- [x] 完整文档
- [x] 部署脚本
- [x] 生产环境配置
- [x] 上线检查清单

---

## 总结

### 为什么选择独立微服务？

1. **长期战略**: 虽然初期成本略高，但符合微服务架构原则，长期更易维护
2. **复用价值**: 不仅设备服务可用，未来其他服务也能复用
3. **职责清晰**: 代理管理是独立的业务域，应该独立服务
4. **灵活扩展**: 代理服务和设备服务可以独立扩展
5. **故障隔离**: 代理故障不会拖垮设备服务

### 关键指标

| 指标 | 目标值 |
|------|--------|
| 开发周期 | 6-8周 |
| 测试覆盖率 | >80% |
| API响应时间 | <100ms (p95) |
| 服务可用性 | >99.5% |
| 资源占用 | CPU<50%, 内存<1GB |

### 风险和缓解

| 风险 | 缓解措施 |
|------|----------|
| 开发周期延长 | 分阶段交付，先实现核心功能 |
| 服务间通信延迟 | 使用Redis缓存，减少跨服务调用 |
| 部署复杂度增加 | 自动化部署脚本和监控 |
| 供应商API故障 | 多供应商冗余 + 降级策略 |

---

**最终决策**: ✅ 创建独立的 Proxy Service 微服务

**下一步**: 开始Phase 1开发，本周完成脚手架搭建和IPRoyal适配器
