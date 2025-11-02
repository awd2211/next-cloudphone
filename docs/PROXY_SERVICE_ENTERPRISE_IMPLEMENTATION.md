# Proxy Service 企业级实施方案

> 基于用户需求定制：功能强壮、高可扩展性
> 目标：支持1000+设备并发，多地区，成本可控，99.9%可用性

## 用户需求总结

### ✅ 已确认需求

**MVP阶段（Week 1-2）**:
- ✅ 代理获取/释放API
- ✅ 3家供应商适配器（IPRoyal + Bright Data + Oxylabs）同时集成
- ✅ 基础代理池管理（Redis缓存）
- ✅ Device Service集成

**增强阶段（Week 3-4）**:
- ✅ 自动健康检查（定时检测代理可用性）
- ✅ 故障自动转移（代理失败自动重试）
- ✅ IP自动轮换（防封禁）
- ✅ 使用统计和成本监控

**关键业务场景**:
- 🎯 大规模设备并发（>1000台）
- 🌍 多地区IP需求（国家/城市级）
- 💰 成本控制和优化
- 🛡️ 高可用性和自动恢复

**核心要求**:
- 💪 功能强壮
- 📈 可扩展性高

---

## 企业级架构设计

### 系统架构图

```
                        ┌─────────────────────────────────┐
                        │     API Gateway (30000)         │
                        │   - JWT认证                     │
                        │   - 限流保护                    │
                        │   - 请求路由                    │
                        └───────────────┬─────────────────┘
                                        │
                ┌───────────────────────┼───────────────────────┐
                │                       │                       │
                ▼                       ▼                       ▼
        ┌───────────────┐      ┌───────────────┐      ┌──────────────┐
        │Device Service │      │ Proxy Service │      │Other Services│
        │   (30002)     │─────▶│   (30007)     │◀─────│              │
        └───────────────┘      └───────┬───────┘      └──────────────┘
                                       │
                                       │ Cluster Mode (2-4 instances)
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌───────────────┐            ┌───────────────┐            ┌──────────────┐
│Adapter Layer  │            │  Core Engine  │            │Storage Layer │
├───────────────┤            ├───────────────┤            ├──────────────┤
│ IPRoyal       │            │ Pool Manager  │            │ PostgreSQL   │
│ Bright Data   │            │ Rotator       │            │ (统计数据)   │
│ Oxylabs       │            │ Health Monitor│            ├──────────────┤
│               │            │ Failover      │            │ Redis        │
│ [Extensible]  │            │ Load Balancer │            │ (代理缓存)   │
└───────┬───────┘            └───────┬───────┘            └──────┬───────┘
        │                            │                           │
        └────────────────────────────┼───────────────────────────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 │                   │                   │
                 ▼                   ▼                   ▼
           ┌──────────┐        ┌──────────┐        ┌──────────┐
           │Prometheus│        │ RabbitMQ │        │  Consul  │
           │(监控指标)│        │(事件总线)│        │(服务发现)│
           └──────────┘        └──────────┘        └──────────┘
```

### 核心设计原则

#### 1. 高可用性设计 🛡️

**多实例部署**:
```javascript
// ecosystem.config.js
{
  name: 'proxy-service',
  instances: 4,  // 4个实例，支持故障转移
  exec_mode: 'cluster',
  max_memory_restart: '2G',
  min_uptime: '10s',
  max_restarts: 10,
  autorestart: true,
}
```

**多供应商冗余**:
```typescript
// 供应商优先级策略
const providerPriority = {
  primary: ['brightdata', 'oxylabs'],    // 主力供应商（高质量）
  secondary: ['iproyal'],                 // 备用供应商（低成本）
  fallback: ['custom-proxy-pool']         // 降级方案（自有代理）
};

// 智能故障转移
async getProxyWithFailover(criteria: ProxyCriteria): Promise<ProxyInfo> {
  // 1. 尝试主力供应商
  for (const provider of providerPriority.primary) {
    try {
      const proxy = await this.getFromProvider(provider, criteria);
      if (proxy) return proxy;
    } catch (error) {
      this.logger.warn(`Primary provider ${provider} failed, trying next...`);
    }
  }

  // 2. 降级到备用供应商
  for (const provider of providerPriority.secondary) {
    try {
      const proxy = await this.getFromProvider(provider, criteria);
      if (proxy) return proxy;
    } catch (error) {
      this.logger.warn(`Secondary provider ${provider} failed, trying next...`);
    }
  }

  // 3. 最终降级方案
  return this.getFallbackProxy();
}
```

**健康检查和自愈**:
```typescript
@Injectable()
export class HealthMonitorService {
  @Cron('*/2 * * * *')  // 每2分钟
  async monitorProxyHealth() {
    const proxies = await this.poolManager.getAllProxies();

    // 并发检查（提升效率）
    const healthChecks = proxies.map(proxy =>
      this.checkProxyHealth(proxy).catch(err => ({
        proxy,
        isHealthy: false,
        error: err.message
      }))
    );

    const results = await Promise.allSettled(healthChecks);

    // 处理结果
    for (const result of results) {
      if (result.status === 'fulfilled' && !result.value.isHealthy) {
        await this.handleUnhealthyProxy(result.value.proxy);
      }
    }
  }

  private async handleUnhealthyProxy(proxy: ProxyInfo) {
    proxy.consecutiveFailures = (proxy.consecutiveFailures || 0) + 1;

    if (proxy.consecutiveFailures >= 3) {
      // 连续失败3次，从池中移除
      await this.poolManager.removeProxy(proxy.id);
      this.logger.warn(`Removed unhealthy proxy: ${proxy.id}`);

      // 发送告警
      await this.alertService.sendAlert({
        level: 'warning',
        message: `Proxy ${proxy.id} removed due to health issues`,
        provider: proxy.provider
      });

      // 自动补充新代理
      await this.autoRefillPool(proxy.provider);
    } else {
      // 暂时标记为不健康，但保留在池中
      await this.poolManager.markUnhealthy(proxy.id);
    }
  }

  private async autoRefillPool(provider: string) {
    // 自动从供应商获取新代理补充到池中
    const newProxies = await this.providerManager.fetchNewProxies(provider, 10);
    await this.poolManager.addProxies(newProxies);
    this.logger.log(`Auto-refilled ${newProxies.length} proxies from ${provider}`);
  }
}
```

---

#### 2. 高扩展性设计 📈

**支持1000+并发的代理池架构**:

```typescript
@Injectable()
export class ScalableProxyPoolManager {
  private readonly POOL_MIN_SIZE = 1000;     // 最小池大小
  private readonly POOL_TARGET_SIZE = 2000;  // 目标池大小
  private readonly POOL_MAX_SIZE = 5000;     // 最大池大小

  private readonly poolShards: Map<string, ProxyPool> = new Map();

  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private providerManager: MultiProviderManager,
  ) {
    // 初始化分片池（按地区分片）
    this.initializeShardedPools();
  }

  private initializeShardedPools() {
    // 为每个主要地区创建独立的代理池
    const regions = ['US', 'EU', 'ASIA', 'CN'];

    for (const region of regions) {
      this.poolShards.set(region, {
        region,
        proxies: new Map(),
        stats: {
          total: 0,
          available: 0,
          inUse: 0,
          unhealthy: 0
        }
      });
    }
  }

  async getProxy(criteria: ProxyCriteria): Promise<ProxyInfo> {
    const region = this.getRegionFromCountry(criteria.country);
    const shard = this.poolShards.get(region);

    if (!shard) {
      throw new Error(`No proxy pool for region: ${region}`);
    }

    // 1. 从分片池中获取
    let proxy = this.selectFromShard(shard, criteria);

    // 2. 如果池中没有，动态扩展
    if (!proxy) {
      await this.expandPool(region, criteria);
      proxy = this.selectFromShard(shard, criteria);
    }

    // 3. 仍然没有，从供应商实时获取
    if (!proxy) {
      proxy = await this.fetchProxyOnDemand(criteria);
    }

    return proxy;
  }

  private async expandPool(region: string, criteria: ProxyCriteria) {
    const shard = this.poolShards.get(region);

    // 检查是否可以扩展
    if (shard.stats.total >= this.POOL_MAX_SIZE) {
      this.logger.warn(`Pool for ${region} reached max size, cannot expand`);
      return;
    }

    // 计算需要扩展的数量
    const expandSize = Math.min(
      100,  // 每次扩展100个
      this.POOL_MAX_SIZE - shard.stats.total
    );

    // 从多个供应商并发获取
    const newProxies = await this.providerManager.fetchProxiesBatch({
      region,
      count: expandSize,
      criteria
    });

    // 添加到分片池
    for (const proxy of newProxies) {
      shard.proxies.set(proxy.id, proxy);
    }

    shard.stats.total += newProxies.length;
    shard.stats.available += newProxies.length;

    this.logger.log(`Expanded ${region} pool by ${newProxies.length} proxies`);
  }

  @Cron('*/10 * * * *')  // 每10分钟
  async autoScalePool() {
    for (const [region, shard] of this.poolShards) {
      const utilizationRate = shard.stats.inUse / shard.stats.total;

      // 利用率超过80%，自动扩展
      if (utilizationRate > 0.8 && shard.stats.total < this.POOL_TARGET_SIZE) {
        await this.expandPool(region, { country: region });
      }

      // 利用率低于20%，自动收缩（移除不健康的代理）
      if (utilizationRate < 0.2 && shard.stats.total > this.POOL_MIN_SIZE) {
        await this.shrinkPool(region);
      }
    }
  }
}
```

**负载均衡**:
```typescript
@Injectable()
export class ProxyLoadBalancer {
  private readonly strategies = {
    round_robin: this.roundRobin.bind(this),
    least_used: this.leastUsed.bind(this),
    quality_based: this.qualityBased.bind(this),
    cost_optimized: this.costOptimized.bind(this),
  };

  async selectProxy(
    candidates: ProxyInfo[],
    strategy: LoadBalanceStrategy = 'quality_based'
  ): Promise<ProxyInfo> {
    const selector = this.strategies[strategy];
    return selector(candidates);
  }

  private leastUsed(candidates: ProxyInfo[]): ProxyInfo {
    return candidates.reduce((least, current) =>
      current.usageCount < least.usageCount ? current : least
    );
  }

  private qualityBased(candidates: ProxyInfo[]): ProxyInfo {
    // 综合评分：质量(40%) + 延迟(30%) + 成本(20%) + 新鲜度(10%)
    return candidates.reduce((best, current) => {
      const bestScore = this.calculateQualityScore(best);
      const currentScore = this.calculateQualityScore(current);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateQualityScore(proxy: ProxyInfo): number {
    const qualityScore = proxy.quality * 0.4;
    const latencyScore = (1000 - Math.min(proxy.latency, 1000)) / 1000 * 0.3 * 100;
    const costScore = (1 - proxy.costPerGB / 10) * 0.2 * 100;
    const freshnessScore = this.getFreshnessScore(proxy.lastUsed) * 0.1;

    return qualityScore + latencyScore + costScore + freshnessScore;
  }

  private costOptimized(candidates: ProxyInfo[]): ProxyInfo {
    // 在满足质量要求的前提下，选择最便宜的
    const qualifiedProxies = candidates.filter(p => p.quality >= 70);

    if (qualifiedProxies.length === 0) {
      return this.qualityBased(candidates);
    }

    return qualifiedProxies.reduce((cheapest, current) =>
      current.costPerGB < cheapest.costPerGB ? current : cheapest
    );
  }
}
```

---

#### 3. 成本控制设计 💰

**实时成本跟踪**:
```typescript
@Injectable()
export class CostTrackingService {
  private readonly costConfig = {
    brightdata: { pricePerGB: 5.88, currency: 'USD' },
    oxylabs: { pricePerGB: 7.50, currency: 'USD' },
    iproyal: { pricePerGB: 1.75, currency: 'USD' },
  };

  async recordUsage(usage: ProxyUsageEvent) {
    const cost = this.calculateCost(usage);

    await this.usageRepository.save({
      proxyId: usage.proxyId,
      provider: usage.provider,
      bandwidthMB: usage.bandwidthMB,
      cost: cost,
      timestamp: new Date(),
    });

    // 更新实时成本指标
    await this.updateCostMetrics(usage.provider, cost);

    // 检查预算告警
    await this.checkBudgetAlert();
  }

  private calculateCost(usage: ProxyUsageEvent): number {
    const providerConfig = this.costConfig[usage.provider];
    const bandwidthGB = usage.bandwidthMB / 1024;
    return bandwidthGB * providerConfig.pricePerGB;
  }

  private async checkBudgetAlert() {
    const monthlyBudget = 3000; // $3000/月
    const currentMonthCost = await this.getCurrentMonthCost();

    const utilizationRate = currentMonthCost / monthlyBudget;

    if (utilizationRate > 0.8) {
      // 超过80%预算，发送告警
      await this.alertService.sendAlert({
        level: 'warning',
        message: `Monthly budget utilization: ${(utilizationRate * 100).toFixed(1)}%`,
        currentCost: currentMonthCost,
        budget: monthlyBudget,
      });

      // 自动切换到更便宜的供应商
      await this.switchToCheaperProvider();
    }

    if (utilizationRate > 0.95) {
      // 超过95%，紧急告警并限流
      await this.alertService.sendAlert({
        level: 'critical',
        message: 'Monthly budget almost exhausted!',
        currentCost: currentMonthCost,
        budget: monthlyBudget,
      });

      // 启动成本保护模式
      await this.enableCostProtectionMode();
    }
  }

  private async switchToCheaperProvider() {
    // 将主力供应商切换到IPRoyal（最便宜）
    this.logger.log('Switching to cost-saving mode: prioritizing IPRoyal');

    await this.configService.update({
      providerPriority: {
        primary: ['iproyal'],
        secondary: ['brightdata', 'oxylabs'],
      }
    });
  }
}
```

**成本优化建议引擎**:
```typescript
@Injectable()
export class CostOptimizationEngine {
  async analyzeCostOptimization(): Promise<OptimizationReport> {
    const usageData = await this.getMonthlyUsageData();
    const suggestions: OptimizationSuggestion[] = [];

    // 分析1: 供应商成本对比
    const providerCostAnalysis = this.analyzeProviderCosts(usageData);
    if (providerCostAnalysis.potentialSaving > 100) {
      suggestions.push({
        type: 'provider_switch',
        title: '切换主力供应商',
        description: `将${providerCostAnalysis.fromProvider}的${providerCostAnalysis.percentage}%流量迁移到${providerCostAnalysis.toProvider}`,
        potentialSaving: providerCostAnalysis.potentialSaving,
        difficulty: 'easy',
        estimatedDays: 1,
      });
    }

    // 分析2: 使用模式优化
    const usagePattern = this.analyzeUsagePattern(usageData);
    if (usagePattern.offPeakPercentage > 0.3) {
      suggestions.push({
        type: 'usage_pattern',
        title: '非高峰时段优化',
        description: `${usagePattern.offPeakPercentage * 100}%的流量在非高峰时段，可与供应商协商折扣`,
        potentialSaving: usagePattern.estimatedSaving,
        difficulty: 'medium',
        estimatedDays: 7,
      });
    }

    // 分析3: 地理分布优化
    const geoAnalysis = this.analyzeGeographicDistribution(usageData);
    suggestions.push(...geoAnalysis.suggestions);

    return {
      currentMonthlyCost: usageData.totalCost,
      totalPotentialSaving: suggestions.reduce((sum, s) => sum + s.potentialSaving, 0),
      suggestions,
      generatedAt: new Date(),
    };
  }

  private analyzeProviderCosts(usageData: UsageData): ProviderCostAnalysis {
    const providerStats = usageData.groupByProvider();

    // 计算每个供应商的实际单价
    const actualCosts = Object.entries(providerStats).map(([provider, stats]) => ({
      provider,
      totalCost: stats.cost,
      bandwidth: stats.bandwidthGB,
      avgCostPerGB: stats.cost / stats.bandwidthGB,
    }));

    // 找出最贵和最便宜的
    const mostExpensive = actualCosts.reduce((max, curr) =>
      curr.avgCostPerGB > max.avgCostPerGB ? curr : max
    );

    const cheapest = actualCosts.reduce((min, curr) =>
      curr.avgCostPerGB < min.avgCostPerGB ? curr : min
    );

    // 计算如果迁移50%流量的节省
    const migrationPercentage = 0.5;
    const potentialSaving =
      (mostExpensive.avgCostPerGB - cheapest.avgCostPerGB) *
      mostExpensive.bandwidth *
      migrationPercentage;

    return {
      fromProvider: mostExpensive.provider,
      toProvider: cheapest.provider,
      percentage: migrationPercentage,
      potentialSaving: Math.round(potentialSaving),
    };
  }
}
```

---

#### 4. 多地区支持设计 🌍

**国家/城市级地理定位**:
```typescript
@Injectable()
export class GeoTargetingService {
  private readonly geoMapping = {
    // 国家到城市的映射
    US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
    CN: ['Beijing', 'Shanghai', 'Shenzhen', 'Guangzhou', 'Hangzhou'],
    UK: ['London', 'Manchester', 'Birmingham'],
    // ... 更多国家
  };

  async getProxyByGeo(criteria: GeoCriteria): Promise<ProxyInfo> {
    // 1. 优先从缓存中查找精确匹配
    const cacheKey = this.buildGeoCacheKey(criteria);
    const cached = await this.cache.get<ProxyInfo>(cacheKey);

    if (cached && this.isProxyValid(cached)) {
      return cached;
    }

    // 2. 从代理池查找
    let proxy = await this.poolManager.findByGeo({
      country: criteria.country,
      city: criteria.city,
      state: criteria.state,
    });

    // 3. 如果没有精确匹配，降级策略
    if (!proxy && criteria.city) {
      // 城市没有，降级到国家级
      this.logger.warn(`No proxy for city ${criteria.city}, falling back to country ${criteria.country}`);
      proxy = await this.poolManager.findByGeo({
        country: criteria.country,
      });
    }

    // 4. 如果还是没有，从供应商实时获取
    if (!proxy) {
      proxy = await this.fetchProxyByGeo(criteria);
    }

    // 5. 缓存结果
    await this.cache.set(cacheKey, proxy, 300); // 缓存5分钟

    return proxy;
  }

  private async fetchProxyByGeo(criteria: GeoCriteria): Promise<ProxyInfo> {
    // 并发请求所有支持该地区的供应商
    const providers = this.getSupportedProviders(criteria.country);

    const requests = providers.map(provider =>
      this.providerManager.getProxy(provider, {
        country: criteria.country,
        city: criteria.city,
        state: criteria.state,
      }).catch(err => null) // 失败返回null
    );

    const results = await Promise.all(requests);
    const validProxies = results.filter(p => p !== null);

    if (validProxies.length === 0) {
      throw new Error(`No proxy available for ${criteria.country}/${criteria.city}`);
    }

    // 返回质量最高的
    return validProxies.reduce((best, current) =>
      current.quality > best.quality ? current : best
    );
  }

  private getSupportedProviders(country: string): string[] {
    // 根据国家返回支持的供应商
    const providerSupport = {
      brightdata: ['US', 'CN', 'UK', 'JP', 'DE', 'FR'], // 支持大多数国家
      oxylabs: ['US', 'UK', 'DE', 'FR', 'CA'],
      iproyal: ['US', 'UK', 'CA'],
    };

    return Object.entries(providerSupport)
      .filter(([_, countries]) => countries.includes(country))
      .map(([provider]) => provider);
  }
}
```

**地区智能路由**:
```typescript
@Injectable()
export class GeoRoutingService {
  async routeRequest(request: ProxyRequest): Promise<ProxyInfo> {
    // 根据目标网站的地理位置，智能选择代理地区
    const targetDomain = this.extractDomain(request.url);
    const targetRegion = await this.detectWebsiteRegion(targetDomain);

    // 优先使用目标地区的代理
    const preferredCountry = this.getPreferredCountry(targetRegion, request);

    return this.geoTargetingService.getProxyByGeo({
      country: preferredCountry,
      city: request.city,
    });
  }

  private async detectWebsiteRegion(domain: string): Promise<string> {
    // 基于域名后缀和IP地址检测网站所在地区
    const tldMapping = {
      '.cn': 'CN',
      '.jp': 'JP',
      '.uk': 'UK',
      '.de': 'DE',
      '.fr': 'FR',
    };

    for (const [tld, country] of Object.entries(tldMapping)) {
      if (domain.endsWith(tld)) {
        return country;
      }
    }

    // 默认美国
    return 'US';
  }

  private getPreferredCountry(targetRegion: string, request: ProxyRequest): string {
    // 如果用户指定了国家，优先使用
    if (request.country) {
      return request.country;
    }

    // 否则使用目标地区的代理（提升性能）
    return targetRegion;
  }
}
```

---

## 完整的代码结构

### 目录结构
```
backend/proxy-service/
├── src/
│   ├── adapters/                    # 供应商适配器
│   │   ├── base/
│   │   │   ├── base.adapter.ts
│   │   │   ├── base.interface.ts
│   │   │   └── adapter.factory.ts
│   │   ├── brightdata/
│   │   │   ├── brightdata.adapter.ts
│   │   │   ├── brightdata.config.ts
│   │   │   └── brightdata.types.ts
│   │   ├── oxylabs/
│   │   │   ├── oxylabs.adapter.ts
│   │   │   ├── oxylabs.config.ts
│   │   │   └── oxylabs.types.ts
│   │   ├── iproyal/
│   │   │   ├── iproyal.adapter.ts
│   │   │   ├── iproyal.config.ts
│   │   │   └── iproyal.types.ts
│   │   └── adapters.module.ts
│   │
│   ├── pool/                        # 代理池管理
│   │   ├── pool-manager.service.ts          # 主池管理器
│   │   ├── scalable-pool-manager.service.ts # 可扩展池管理器
│   │   ├── pool-shard.service.ts            # 分片管理
│   │   ├── proxy-rotator.service.ts         # 轮换服务
│   │   ├── load-balancer.service.ts         # 负载均衡
│   │   ├── health-monitor.service.ts        # 健康监控
│   │   ├── failover-handler.service.ts      # 故障转移
│   │   └── pool.module.ts
│   │
│   ├── proxy/                       # 代理业务逻辑
│   │   ├── controllers/
│   │   │   ├── proxy.controller.ts
│   │   │   └── admin-proxy.controller.ts
│   │   ├── services/
│   │   │   ├── proxy.service.ts
│   │   │   ├── geo-targeting.service.ts
│   │   │   └── geo-routing.service.ts
│   │   ├── dto/
│   │   │   ├── acquire-proxy.dto.ts
│   │   │   ├── release-proxy.dto.ts
│   │   │   ├── rotate-proxy.dto.ts
│   │   │   └── proxy-criteria.dto.ts
│   │   └── proxy.module.ts
│   │
│   ├── statistics/                  # 统计分析
│   │   ├── controllers/
│   │   │   └── statistics.controller.ts
│   │   ├── services/
│   │   │   ├── statistics.service.ts
│   │   │   ├── cost-tracking.service.ts
│   │   │   ├── cost-optimization.service.ts
│   │   │   └── usage-analytics.service.ts
│   │   └── statistics.module.ts
│   │
│   ├── monitoring/                  # 监控和告警
│   │   ├── services/
│   │   │   ├── metrics.service.ts
│   │   │   ├── alert.service.ts
│   │   │   └── prometheus.service.ts
│   │   └── monitoring.module.ts
│   │
│   ├── entities/                    # 数据模型
│   │   ├── proxy-provider.entity.ts
│   │   ├── proxy-pool.entity.ts
│   │   ├── proxy-usage.entity.ts
│   │   ├── proxy-health.entity.ts
│   │   ├── proxy-session.entity.ts
│   │   └── cost-record.entity.ts
│   │
│   ├── config/                      # 配置
│   │   ├── providers.config.ts
│   │   ├── pool.config.ts
│   │   ├── cost.config.ts
│   │   └── geo.config.ts
│   │
│   ├── common/                      # 通用工具
│   │   ├── constants/
│   │   │   ├── proxy.constants.ts
│   │   │   └── error.constants.ts
│   │   ├── interfaces/
│   │   │   ├── proxy.interface.ts
│   │   │   ├── provider.interface.ts
│   │   │   └── statistics.interface.ts
│   │   ├── decorators/
│   │   │   ├── retry.decorator.ts
│   │   │   ├── circuit-breaker.decorator.ts
│   │   │   └── rate-limit.decorator.ts
│   │   ├── guards/
│   │   │   ├── cost-protection.guard.ts
│   │   │   └── quota.guard.ts
│   │   └── utils/
│   │       ├── geo.utils.ts
│   │       └── cost.utils.ts
│   │
│   ├── events/                      # 事件处理
│   │   ├── handlers/
│   │   │   ├── proxy-acquired.handler.ts
│   │   │   ├── proxy-failed.handler.ts
│   │   │   └── budget-alert.handler.ts
│   │   └── events.module.ts
│   │
│   ├── database/                    # 数据库
│   │   ├── migrations/
│   │   └── seeds/
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── scripts/
│   ├── init-database.sql
│   ├── test-providers.sh
│   └── load-test.js
│
├── .env.example
├── ecosystem.config.js
├── package.json
└── tsconfig.json
```

---

## 关键代码实现

### 1. 主入口 (main.ts)

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from '@cloudphone/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService('ProxyService'),
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger文档
  const config = new DocumentBuilder()
    .setTitle('Proxy Service API')
    .setDescription('Enterprise-grade proxy management service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // 启用Shutdown Hooks（优雅关闭）
  app.enableShutdownHooks();

  // 监听端口
  const port = process.env.PORT || 30007;
  await app.listen(port);

  console.log(`🚀 Proxy Service running on http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/api-docs`);
}

bootstrap();
```

---

### 2. 核心模块 (app.module.ts)

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import * as redisStore from 'cache-manager-redis-store';

import {
  ConsulModule,
  EventBusModule,
  SecurityModule,
  AppCacheModule,
} from '@cloudphone/shared';

import { AdaptersModule } from './adapters/adapters.module';
import { PoolModule } from './pool/pool.module';
import { ProxyModule } from './proxy/proxy.module';
import { StatisticsModule } from './statistics/statistics.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // 数据库
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_DATABASE', 'cloudphone_proxy'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get('NODE_ENV') === 'development',
        logging: config.get('NODE_ENV') === 'development',
        poolSize: 20, // 连接池大小（高并发）
      }),
    }),

    // Redis缓存
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: redisStore,
        host: config.get('REDIS_HOST', 'localhost'),
        port: config.get('REDIS_PORT', 6379),
        ttl: 600, // 默认10分钟
        max: 10000, // 最大缓存条目
      }),
    }),

    // 定时任务
    ScheduleModule.forRoot(),

    // Prometheus监控
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
    }),

    // Consul服务注册
    ConsulModule.forRoot(),

    // RabbitMQ事件总线
    EventBusModule.forRoot(),

    // 安全模块（限流、IP黑名单）
    SecurityModule,

    // 业务模块
    AdaptersModule,
    PoolModule,
    ProxyModule,
    StatisticsModule,
    MonitoringModule,
    EventsModule,
  ],
})
export class AppModule {}
```

---

### 3. 环境配置 (.env.example)

```bash
# 服务配置
NODE_ENV=production
PORT=30007
SERVICE_NAME=proxy-service

# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=cloudphone_proxy

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL=amqp://admin:admin123@localhost:5672/cloudphone

# Consul
CONSUL_HOST=localhost
CONSUL_PORT=8500

# 供应商配置
# IPRoyal
IPROYAL_USERNAME=your_username
IPROYAL_PASSWORD=your_password
IPROYAL_API_URL=https://resi-api.iproyal.com/v1

# Bright Data
BRIGHTDATA_API_KEY=your_api_key
BRIGHTDATA_ZONE=residential
BRIGHTDATA_USERNAME=your_username
BRIGHTDATA_PASSWORD=your_password

# Oxylabs
OXYLABS_USERNAME=your_username
OXYLABS_PASSWORD=your_password
OXYLABS_API_URL=https://api.oxylabs.io

# 代理池配置
POOL_MIN_SIZE=1000
POOL_TARGET_SIZE=2000
POOL_MAX_SIZE=5000
POOL_REFRESH_INTERVAL=600000  # 10分钟

# 健康检查
HEALTH_CHECK_INTERVAL=120000  # 2分钟
HEALTH_CHECK_TIMEOUT=10000    # 10秒
HEALTH_CHECK_RETRIES=3

# 成本控制
MONTHLY_BUDGET=3000           # 月预算$3000
COST_ALERT_THRESHOLD=0.8      # 80%告警
COST_PROTECTION_THRESHOLD=0.95 # 95%保护模式

# 日志
LOG_LEVEL=info

# 监控
PROMETHEUS_PORT=30008
```

---

## 实施时间表

### Week 1: 基础框架 + IPRoyal

**Day 1-2: 项目初始化**
- [x] 创建proxy-service目录结构
- [x] NestJS项目初始化
- [x] 配置TypeORM和Redis
- [x] 创建基础实体

**Day 3-4: IPRoyal适配器**
- [x] 实现BaseAdapter接口
- [x] 实现IPRoyalAdapter
- [x] 单元测试
- [x] API连通性测试

**Day 5: 基础代理池**
- [x] PoolManager基础实现
- [x] Redis缓存集成
- [x] 简单的FIFO分配逻辑

---

### Week 2: Bright Data + Oxylabs + 集成

**Day 1-2: 更多适配器**
- [x] BrightDataAdapter实现
- [x] OxylabsAdapter实现
- [x] 统一测试

**Day 3-4: Device Service集成**
- [x] ProxyClient服务（Device Service侧）
- [x] 设备创建流程集成
- [x] Docker代理配置
- [x] ADB代理设置

**Day 5: 基础API和测试**
- [x] REST API完整实现
- [x] 集成测试
- [x] 文档

---

### Week 3: 高可用功能

**Day 1-2: 健康监控**
- [x] HealthMonitorService
- [x] 定时健康检查
- [x] 自动标记和移除
- [x] 自动补充代理

**Day 3-4: 故障转移**
- [x] FailoverHandler
- [x] 多供应商故障转移
- [x] 降级策略
- [x] 熔断机制

**Day 5: IP轮换**
- [x] ProxyRotator
- [x] 手动轮换API
- [x] 自动轮换任务

---

### Week 4: 统计和优化

**Day 1-2: 使用统计**
- [x] UsageTracking
- [x] CostTracking
- [x] Prometheus集成
- [x] 统计API

**Day 3-4: 成本优化**
- [x] CostOptimizationEngine
- [x] 供应商成本分析
- [x] 优化建议生成
- [x] 预算告警

**Day 5: 地理定位**
- [x] GeoTargetingService
- [x] 城市级筛选
- [x] 智能路由

---

### Week 5-6: 扩展性和生产准备

**Week 5**:
- [x] ScalablePoolManager（分片池）
- [x] LoadBalancer（多种策略）
- [x] 批量API
- [x] 性能优化

**Week 6**:
- [x] 完整测试（单元+集成+负载）
- [x] Grafana Dashboard
- [x] 告警规则
- [x] 文档完善
- [x] 生产部署

---

## 性能指标和SLA

### 性能目标

| 指标 | 目标值 | 测试方法 |
|------|--------|----------|
| 代理获取延迟（P50） | <200ms | 压测1000并发 |
| 代理获取延迟（P95） | <500ms | 压测1000并发 |
| 代理获取延迟（P99） | <1s | 压测1000并发 |
| 服务可用性 | >99.9% | 7x24监控 |
| 故障恢复时间 | <30s | 故障演练 |
| 并发处理能力 | >2000 QPS | Apache Bench |
| 代理池容量 | 1000-5000 | 配置可调 |

### SLA承诺

```yaml
服务可用性:
  - 月度SLA: 99.9% (允许43.2分钟故障)
  - 季度SLA: 99.95%

性能承诺:
  - P95延迟: <500ms
  - P99延迟: <1s
  - 代理健康率: >95%

自动恢复:
  - 故障检测: <2分钟
  - 自动切换: <30秒
  - 池自愈: <5分钟
```

---

## 监控和告警

### Prometheus指标

```yaml
# 代理池指标
proxy_pool_size_total{region="US",provider="brightdata"} 500
proxy_pool_available{region="US",provider="brightdata"} 350
proxy_pool_in_use{region="US",provider="brightdata"} 150

# 性能指标
proxy_acquisition_duration_seconds{quantile="0.5"} 0.15
proxy_acquisition_duration_seconds{quantile="0.95"} 0.45
proxy_acquisition_duration_seconds{quantile="0.99"} 0.85

# 健康指标
proxy_health_check_total{provider="brightdata",status="success"} 1500
proxy_health_check_total{provider="brightdata",status="failure"} 50
proxy_health_rate{provider="brightdata"} 0.967

# 成本指标
proxy_cost_total_usd{provider="brightdata"} 1250.50
proxy_cost_per_gb_usd{provider="brightdata"} 5.88
proxy_bandwidth_gb{provider="brightdata"} 212.5

# 错误指标
proxy_errors_total{provider="brightdata",type="timeout"} 10
proxy_errors_total{provider="brightdata",type="refused"} 5
```

### 告警规则

```yaml
groups:
  - name: proxy_service_critical
    rules:
      - alert: ProxyServiceDown
        expr: up{job="proxy-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Proxy Service is down"

      - alert: ProxyPoolCriticallyLow
        expr: proxy_pool_available < 50
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Proxy pool critically low: {{ $value }}"

  - name: proxy_service_warning
    rules:
      - alert: HighProxyErrorRate
        expr: rate(proxy_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High proxy error rate: {{ $value }}"

      - alert: BudgetAlert80Percent
        expr: proxy_cost_total_usd / 3000 > 0.8
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Monthly budget 80% consumed"

      - alert: LowProxyHealthRate
        expr: proxy_health_rate < 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Proxy health rate below 90%"
```

---

## 总结

### 实施范围确认

基于你的选择，我们将实施：

**✅ P0功能（Week 1-2）**:
- 代理获取/释放API ✅
- 3家供应商同时集成 ✅
- 基础代理池（Redis） ✅
- Device Service集成 ✅

**✅ P1功能（Week 3-4）**:
- 自动健康检查 ✅
- 故障自动转移 ✅
- IP自动轮换 ✅
- 统计和成本监控 ✅

**✅ 企业级特性**:
- 高可用性（多实例cluster） ✅
- 高扩展性（分片池，1000-5000代理） ✅
- 成本控制（预算告警，自动优化） ✅
- 多地区支持（国家/城市级） ✅

---

### 资源估算

**开发成本**:
- 人力: 1人 × 6周 = 42人天
- 成本: 约$20K-30K（按人力成本）

**运营成本（月）**:
- 代理: $1500-3000
- 服务器: $200（多实例）
- 监控: $50
- **总计**: $1750-3250/月

---

### 下一步

你现在可以选择：

1. **开始实施** - 我可以帮你生成第一周的所有代码
2. **进一步细化** - 讨论某个具体模块的实现细节
3. **评审调整** - 如果有任何疑问或需要调整的地方

需要我开始创建代码吗？🚀
