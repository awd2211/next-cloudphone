# 家宽代理提供商深度调研报告

> 调研日期: 2025-11-02
> 目标: 为云手机平台集成大量代理IP地址
> 调研范围: 国内外主流家宽代理（住宅代理）提供商

## 目录

- [执行摘要](#执行摘要)
- [一、国际顶级代理提供商](#一国际顶级代理提供商)
- [二、国内代理提供商](#二国内代理提供商)
- [三、价格对比分析](#三价格对比分析)
- [四、API集成技术方案](#四api集成技术方案)
- [五、云手机平台集成架构](#五云手机平台集成架构)
- [六、推荐方案](#六推荐方案)

---

## 执行摘要

### 关键发现

1. **市场格局**: 2025年代理IP市场已从"规模扩张"转向"场景适配"，主流提供商都支持API集成
2. **价格区间**: 住宅代理价格从 $0.32/GB 到 $8/GB 不等，企业级可低至 $0.40/GB
3. **技术成熟度**: 主流提供商均提供完善的API、多语言SDK、实时轮换、会话管理等功能
4. **集成复杂度**: 深度集成需要考虑代理池管理、健康检查、故障转移、负载均衡等多个维度

### 推荐策略

- **短期**: 选择2-3家头部提供商进行POC测试
- **中期**: 实现统一代理管理层，支持多供应商切换
- **长期**: 建立自有代理质量评估和调度系统

---

## 一、国际顶级代理提供商

### 1. Bright Data (亮数据) ⭐⭐⭐⭐⭐

**官网**: https://brightdata.com

#### 核心指标
- **IP池规模**: 7200万+ 住宅IP
- **覆盖范围**: 全球195+国家/地区
- **协议支持**: HTTP(S), SOCKS5
- **特色功能**:
  - 城市级别地理定位
  - 无限并发会话
  - 自动IP轮换
  - 专用API和SDK

#### 价格体系
| 套餐类型 | 流量 | 价格 | 单价 |
|---------|------|------|------|
| Pay-As-You-Go | 按需 | - | $5.88/GB |
| Residential Growth | 包月 | $499/月 | $5.04/GB |
| Residential Business | 包月 | $999/月 | 更低 |
| Enterprise | 定制 | 联系销售 | $4.00/GB起 |

#### API能力
```bash
# API访问方式
- REST API (完整文档)
- Native SDK (Python, Node.js, Java等)
- 浏览器扩展
- 代理网关模式

# 认证方式
- API Token
- 用户名/密码
- IP白名单
```

#### 优势
✅ 行业领导者，可靠性高
✅ IP质量优秀，响应时间 <0.6s
✅ 完善的文档和技术支持
✅ 支持中国区域IP

#### 劣势
❌ 价格相对较高
❌ 小规模使用性价比低

---

### 2. Oxylabs ⭐⭐⭐⭐⭐

**官网**: https://oxylabs.io

#### 核心指标
- **IP池规模**: 1.77亿+ 住宅IP + 200万数据中心IP
- **覆盖范围**: 全球195+国家
- **响应时间**: 行业领先
- **可靠性**: Proxyway多年认证最可靠提供商

#### 价格体系
| 套餐类型 | 流量 | 月费 | 单价 |
|---------|------|------|------|
| Pay As You Go | 按需 | - | $8.00/GB |
| Micro | 13 GB | $99 | $7.75/GB |
| Starter | 40 GB | $300 | $7.50/GB |
| Advanced | 86 GB | - | $3.49/GB |
| Enterprise | 定制 | 联系销售 | $3.00/GB起 |

**最新优惠**: 2025年降价，Micro和Starter套餐价格下调

#### API能力
```python
# Python示例
import requests

proxies = {
    'http': 'http://user:pass@pr.oxylabs.io:7777',
    'https': 'http://user:pass@pr.oxylabs.io:7777',
}

response = requests.get('https://ip.oxylabs.io/location', proxies=proxies)
```

#### 特色功能
- 智能轮换算法
- 会话持久化支持
- 高级地理定位（国家/城市/ISP）
- 实时代理池健康监控

#### 优势
✅ IP池规模最大
✅ 技术文档详尽
✅ 企业级SLA保障

#### 劣势
❌ 起步价格较高
❌ 小流量套餐性价比一般

---

### 3. SOAX ⭐⭐⭐⭐

**官网**: https://soax.com

#### 核心指标
- **IP池规模**: 1.91亿+ (包含3300万移动代理)
- **代理类型**: 住宅、移动(4G/5G)、美国ISP、数据中心
- **协议**: HTTP(S), SOCKS5
- **特色**: 统一订阅可跨类型使用

#### 价格体系
| 套餐类型 | 特点 | 单价 |
|---------|------|------|
| 基础套餐 | 订阅制 | $6-8/GB |
| 大流量套餐 | 折扣递增 | $0.40-$0.50/GB |
| Enterprise | 定制 | $0.32/GB起 |

**试用**: $1.99 获得3天400MB试用

#### API能力
- 支持15+主流编程语言
- 详细的集成教程（40+篇）
- Webhook回调支持
- 实时统计仪表板

#### 优势
✅ 性价比极高（大流量）
✅ 移动代理支持优秀
✅ 统一流量池，灵活使用
✅ 地理定位精确到城市/ISP

#### 劣势
❌ 文档完整度略逊于Bright Data
❌ 小流量单价偏高

---

### 4. IPRoyal ⭐⭐⭐⭐

**官网**: https://iproyal.cn

#### 核心指标
- **IP池规模**: 9500万+ 住宅IP
- **覆盖范围**: 195+国家/地区
- **特色**: 中国市场本地化支持

#### 价格体系
| 套餐类型 | 单价 | 特点 |
|---------|------|------|
| 住宅代理 | $1.75/GB起 | 按流量计费 |
| ISP代理 | $2.40/GB起 | 静态IP |
| 移动代理 | 联系销售 | 4G/5G网络 |

#### API能力
```javascript
// Node.js示例
const axios = require('axios');

const config = {
  proxy: {
    host: 'resi-api.iproyal.com',
    port: 12321,
    auth: {
      username: 'your_username',
      password: 'your_password'
    }
  }
};

axios.get('https://api.ipify.org', config)
  .then(response => console.log(response.data));
```

#### 优势
✅ 价格竞争力强
✅ 中文支持完善
✅ 灵活的轮换策略
✅ API文档清晰

#### 劣势
❌ IP池规模小于Bright Data和Oxylabs
❌ 高级功能相对较少

---

### 5. NodeMaven ⭐⭐⭐⭐⭐

**官网**: https://nodemaven.com

#### 核心指标
- **专注领域**: 移动代理(4G/5G) + 住宅代理
- **IP质量**: Proxyway 2025认证响应时间第一 (<0.6s)
- **特色**: 真实移动网络，适合社交媒体自动化

#### 价格体系
| 套餐 | 流量 | 价格 | 单价 |
|------|------|------|------|
| Starter | 5 GB | $50/月 | $6.00/GB |
| Professional | 25 GB | $200/月 | $5.60/GB |
| Enterprise | 定制 | 联系销售 | $4.80/GB |

**试用**: €3.99 获得500MB

#### API能力
- Swagger API文档
- 统一定价（住宅和移动代理）
- Super Sticky Sessions (会话保持)
- IP质量过滤器
- 无限流量结转

#### 优势
✅ 移动代理质量顶尖
✅ 适合Instagram/TikTok等社交平台
✅ 响应速度最快
✅ 流量永久有效（不过期）

#### 劣势
❌ IP池规模相对较小
❌ 主要专注移动场景

---

### 6. ProxyEmpire ⭐⭐⭐

**官网**: https://proxyempire.io

#### 核心指标
- **IP池规模**: 3000万+ 轮换住宅代理
- **覆盖范围**: 全球主要国家
- **特色**: VIP集成支持

#### 价格体系
- **起步价**: $1.97
- **计费模式**: 流量永不过期
- **优势**: 一次购买，终身使用

#### API能力
- API文档简略（22篇文章）
- 支持子用户管理
- 流量统计API
- 代理过滤器API

#### 优势
✅ 流量永不过期
✅ 价格灵活
✅ 所有套餐包含全部功能

#### 劣势
❌ API文档不够完善
❌ 技术支持相对薄弱

---

## 二、国内代理提供商

### 1. 蜘蛛IP (ZHIZHUIP) ⭐⭐⭐⭐

**官网**: https://www.zhizhuip.com

#### 核心指标
- **IP池规模**: 9500万+ 纯净住宅IP
- **覆盖范围**: 全国200+城市
- **并发**: 无限制
- **本地化**: 完全中文支持

#### 产品类型
1. 动态住宅IP代理
2. 静态住宅IP代理
3. 数据中心IP代理

#### API能力
- API文档地址: develop.zhizhuip.com
- 支持功能:
  - 动态住宅代理账号管理
  - 静态住宅代理管理
  - 会话验证
  - 流量包购买
  - IP轮换管理

#### 优势
✅ 国内访问速度快
✅ 中文文档和支持
✅ 覆盖城市广泛
✅ 并发无限制

#### 劣势
❌ 官网未公开详细价格
❌ 国际IP覆盖有限

---

### 2. 天启代理 ⭐⭐⭐

**特点**:
- 动态住宅IP服务
- IP池覆盖全国200+城市
- 支持API接口
- 提供免费试用

---

### 3. StormProxies ⭐⭐⭐

**特点**:
- 全球220地区纯净住宅IP
- 多种API参数
- 账号密码认证管理
- 真实动态IP

---

### 4. 青果网络 (qg.net) ⭐⭐⭐

**产品**:
- 长效代理IP
- 国内静态IP
- 稳定静态IP地址

---

### 5. Roxlabs ⭐⭐⭐

**特点**:
- 全球住宅IP代理网络
- 企业海外IP代理服务
- 高质量动态/静态代理

---

## 三、价格对比分析

### 价格梯度表 (按单价从低到高)

| 提供商 | 最低单价 | 中等规模单价 | 小规模单价 | 试用方案 |
|--------|----------|--------------|------------|----------|
| **SOAX** | $0.32/GB | $0.40/GB | $6-8/GB | $1.99/400MB/3天 |
| **IPRoyal** | $1.75/GB | $2.40/GB | $1.75/GB | 联系获取 |
| **ProxyEmpire** | $1.97起 | - | - | 所有套餐 |
| **Bright Data** | $4.00/GB | $5.04/GB | $5.88/GB | 免费试用 |
| **NodeMaven** | $4.80/GB | $5.60/GB | $6.00/GB | €3.99/500MB |
| **Oxylabs** | $3.00/GB | $3.49/GB | $7.50/GB | 免费试用 |

### 成本估算场景

#### 场景1: 小规模测试 (100 GB/月)
- **SOAX**: $600-800/月
- **IPRoyal**: $175/月
- **Bright Data**: $588/月
- **Oxylabs**: $775/月

#### 场景2: 中等规模 (1000 GB/月)
- **SOAX**: $400-500/月 (企业折扣)
- **Bright Data**: $4000-4500/月
- **Oxylabs**: $3000-3500/月

#### 场景3: 大规模 (10000 GB/月)
- **SOAX**: $3200-4000/月
- **Bright Data**: $40000+/月 (需谈判)
- **Oxylabs**: $30000+/月 (需谈判)

### 性价比排名

1. **最佳性价比**: SOAX (大流量场景)
2. **小规模最优**: IPRoyal
3. **企业级首选**: Bright Data / Oxylabs
4. **移动场景**: NodeMaven
5. **国内场景**: 蜘蛛IP

---

## 四、API集成技术方案

### 4.1 通用集成模式

#### 模式1: HTTP/SOCKS5代理模式
```javascript
// 最通用的集成方式
const proxy = {
  host: 'proxy.example.com',
  port: 8080,
  auth: {
    username: 'user',
    password: 'pass'
  },
  protocol: 'http' // or 'socks5'
};

// 应用于HTTP客户端
axios.get(url, { proxy });
```

#### 模式2: 代理网关模式
```bash
# 通过网关URL直接访问
curl -x http://user:pass@gateway.provider.com:port https://target.com
```

#### 模式3: API轮换模式
```javascript
// 通过API获取代理列表
const response = await fetch('https://api.provider.com/v1/proxy-list', {
  headers: { 'Authorization': 'Bearer API_KEY' }
});
const proxyList = await response.json();

// 自行管理代理池
const proxy = selectFromPool(proxyList);
```

---

### 4.2 关键技术组件

#### 组件1: 代理池管理器
```typescript
interface ProxyPoolManager {
  // 初始化代理池
  initialize(config: ProviderConfig): Promise<void>;

  // 获取可用代理
  getProxy(criteria?: ProxyCriteria): Promise<ProxyInfo>;

  // 释放代理
  releaseProxy(proxyId: string): Promise<void>;

  // 标记代理失败
  markFailed(proxyId: string, error: Error): Promise<void>;

  // 健康检查
  healthCheck(): Promise<HealthStatus>;

  // 获取统计信息
  getStats(): ProxyPoolStats;
}

interface ProxyCriteria {
  country?: string;
  city?: string;
  isp?: string;
  protocol?: 'http' | 'https' | 'socks5';
  sessionSticky?: boolean;
}

interface ProxyInfo {
  id: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol: string;
  location: GeoLocation;
  quality: number; // 0-100
  latency: number; // ms
  lastUsed: Date;
}
```

#### 组件2: 智能轮换策略
```typescript
enum RotationStrategy {
  RANDOM = 'random',           // 随机选择
  ROUND_ROBIN = 'round_robin', // 轮询
  LEAST_USED = 'least_used',   // 最少使用
  QUALITY_BASED = 'quality',   // 基于质量评分
  GEOGRAPHIC = 'geographic',   // 地理位置优先
}

class ProxyRotator {
  constructor(
    private pool: ProxyPoolManager,
    private strategy: RotationStrategy
  ) {}

  async getNextProxy(criteria?: ProxyCriteria): Promise<ProxyInfo> {
    const candidates = await this.pool.getAvailableProxies(criteria);

    switch (this.strategy) {
      case RotationStrategy.QUALITY_BASED:
        return this.selectByQuality(candidates);
      case RotationStrategy.LEAST_USED:
        return this.selectLeastUsed(candidates);
      default:
        return this.selectRandom(candidates);
    }
  }
}
```

#### 组件3: 健康监控系统
```typescript
class ProxyHealthMonitor {
  private checkInterval: NodeJS.Timer;

  async startMonitoring(poolManager: ProxyPoolManager) {
    this.checkInterval = setInterval(async () => {
      const proxies = await poolManager.getAllProxies();

      for (const proxy of proxies) {
        const health = await this.checkProxyHealth(proxy);

        if (health.isHealthy) {
          await poolManager.updateQuality(proxy.id, health.quality);
        } else {
          await poolManager.markUnhealthy(proxy.id);
        }
      }
    }, 120000); // 每2分钟检查一次
  }

  private async checkProxyHealth(proxy: ProxyInfo): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // 测试连接性
      const response = await axios.get('https://api.ipify.org', {
        proxy: {
          host: proxy.host,
          port: proxy.port,
          auth: { username: proxy.username, password: proxy.password }
        },
        timeout: 10000
      });

      const latency = Date.now() - startTime;

      return {
        isHealthy: true,
        quality: this.calculateQuality(latency, response.status),
        latency,
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        isHealthy: false,
        quality: 0,
        error: error.message,
        lastCheck: new Date()
      };
    }
  }
}
```

#### 组件4: 故障转移处理
```typescript
class ProxyFailoverHandler {
  constructor(
    private poolManager: ProxyPoolManager,
    private maxRetries: number = 3
  ) {}

  async executeWithFailover<T>(
    operation: (proxy: ProxyInfo) => Promise<T>,
    criteria?: ProxyCriteria
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const proxy = await this.poolManager.getProxy(criteria);

      try {
        const result = await operation(proxy);

        // 成功，更新代理质量
        await this.poolManager.markSuccess(proxy.id);

        return result;
      } catch (error) {
        lastError = error;

        // 标记失败
        await this.poolManager.markFailed(proxy.id, error);

        // 如果是最后一次尝试，抛出错误
        if (attempt === this.maxRetries - 1) {
          throw new Error(`All ${this.maxRetries} attempts failed. Last error: ${error.message}`);
        }

        // 等待后重试
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

### 4.3 多供应商集成架构

```typescript
// 统一的供应商接口
interface ProxyProvider {
  name: string;

  // 初始化
  initialize(config: any): Promise<void>;

  // 获取代理列表
  getProxyList(options?: GetProxyOptions): Promise<ProxyInfo[]>;

  // 验证代理
  validateProxy(proxy: ProxyInfo): Promise<boolean>;

  // 获取使用统计
  getUsageStats(): Promise<UsageStats>;

  // 配置轮换
  configureRotation(strategy: RotationConfig): Promise<void>;
}

// 供应商适配器示例
class BrightDataAdapter implements ProxyProvider {
  name = 'BrightData';
  private apiKey: string;
  private baseUrl = 'https://api.brightdata.com';

  async initialize(config: { apiKey: string }) {
    this.apiKey = config.apiKey;
  }

  async getProxyList(options?: GetProxyOptions): Promise<ProxyInfo[]> {
    const response = await axios.post(
      `${this.baseUrl}/v1/zone/proxy_list`,
      {
        zone: options?.zone || 'residential',
        country: options?.country,
        format: 'json'
      },
      {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      }
    );

    return response.data.map(this.mapToProxyInfo);
  }

  private mapToProxyInfo(raw: any): ProxyInfo {
    return {
      id: `brightdata-${raw.ip}:${raw.port}`,
      host: raw.ip,
      port: raw.port,
      username: raw.username,
      password: raw.password,
      protocol: 'http',
      location: {
        country: raw.country,
        city: raw.city
      },
      quality: 80, // 默认质量
      latency: 0,
      lastUsed: new Date()
    };
  }
}

// 供应商管理器
class MultiProviderManager {
  private providers: Map<string, ProxyProvider> = new Map();

  registerProvider(provider: ProxyProvider) {
    this.providers.set(provider.name, provider);
  }

  async getProxyFromProvider(
    providerName: string,
    options?: GetProxyOptions
  ): Promise<ProxyInfo> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    const proxyList = await provider.getProxyList(options);
    return proxyList[0]; // 简化示例
  }

  // 智能选择：根据成本、质量、可用性自动选择最优供应商
  async getOptimalProxy(criteria: ProxyCriteria): Promise<ProxyInfo> {
    const candidates: Array<{ provider: string; proxy: ProxyInfo; score: number }> = [];

    for (const [name, provider] of this.providers) {
      try {
        const proxies = await provider.getProxyList(criteria);
        for (const proxy of proxies) {
          const score = this.calculateProviderScore(name, proxy);
          candidates.push({ provider: name, proxy, score });
        }
      } catch (error) {
        console.error(`Failed to get proxies from ${name}:`, error);
      }
    }

    // 按评分排序，返回最优
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.proxy;
  }

  private calculateProviderScore(
    providerName: string,
    proxy: ProxyInfo
  ): number {
    // 综合考虑：质量(40%) + 延迟(30%) + 成本(30%)
    const qualityScore = proxy.quality * 0.4;
    const latencyScore = (1000 - proxy.latency) / 1000 * 0.3 * 100;
    const costScore = this.getCostScore(providerName) * 0.3;

    return qualityScore + latencyScore + costScore;
  }

  private getCostScore(providerName: string): number {
    // 成本评分表 (0-100)
    const costMap: Record<string, number> = {
      'SOAX': 90,
      'IPRoyal': 85,
      'Bright Data': 60,
      'Oxylabs': 55,
      'NodeMaven': 70
    };
    return costMap[providerName] || 50;
  }
}
```

---

### 4.4 Docker + Android集成方案

#### 方案1: ADB代理配置
```bash
# 为Android设备设置全局HTTP代理
adb shell settings put global http_proxy <proxy_host>:<proxy_port>

# 使用ADB反向端口转发
adb reverse tcp:8888 tcp:8888

# 在容器内启动本地代理服务器
# 该服务器将请求转发到外部代理提供商
```

#### 方案2: Docker网络代理
```typescript
// 在device-service中为每个设备容器配置代理
class DeviceProxyManager {
  async createDeviceWithProxy(
    deviceId: string,
    proxyInfo: ProxyInfo
  ): Promise<Container> {
    const container = await this.dockerService.createContainer({
      Image: 'redroid/redroid:latest',
      name: `device-${deviceId}`,
      Env: [
        `HTTP_PROXY=http://${proxyInfo.host}:${proxyInfo.port}`,
        `HTTPS_PROXY=http://${proxyInfo.host}:${proxyInfo.port}`,
        `NO_PROXY=localhost,127.0.0.1`
      ],
      HostConfig: {
        // ... 其他配置
      }
    });

    return container;
  }

  async updateDeviceProxy(
    containerId: string,
    proxyInfo: ProxyInfo
  ): Promise<void> {
    // 使用ADB设置代理
    await this.adbService.shell(
      containerId,
      `settings put global http_proxy ${proxyInfo.host}:${proxyInfo.port}`
    );

    // 如果代理需要认证，可以通过本地代理服务器中转
    if (proxyInfo.username && proxyInfo.password) {
      await this.startLocalProxyForwarder(containerId, proxyInfo);
    }
  }

  private async startLocalProxyForwarder(
    containerId: string,
    proxyInfo: ProxyInfo
  ): Promise<void> {
    // 在宿主机上启动一个本地代理服务器
    // 该服务器接受来自容器的请求，添加认证后转发到真实代理
    const localPort = await this.portManager.allocate();

    const forwarder = new ProxyForwarder({
      listenPort: localPort,
      targetProxy: {
        host: proxyInfo.host,
        port: proxyInfo.port,
        auth: {
          username: proxyInfo.username,
          password: proxyInfo.password
        }
      }
    });

    await forwarder.start();

    // 配置容器使用本地转发器
    await this.adbService.shell(
      containerId,
      `settings put global http_proxy host.docker.internal:${localPort}`
    );
  }
}
```

#### 方案3: iptables透明代理
```bash
#!/bin/bash
# 在Docker宿主机上设置iptables规则，将容器流量透明转发到代理

PROXY_IP="proxy.example.com"
PROXY_PORT="8080"
CONTAINER_SUBNET="172.18.0.0/16"

# 将容器的HTTP流量重定向到代理
iptables -t nat -A PREROUTING \
  -s $CONTAINER_SUBNET \
  -p tcp --dport 80 \
  -j DNAT --to-destination $PROXY_IP:$PROXY_PORT

iptables -t nat -A PREROUTING \
  -s $CONTAINER_SUBNET \
  -p tcp --dport 443 \
  -j DNAT --to-destination $PROXY_IP:$PROXY_PORT

# SNAT确保返回流量正确路由
iptables -t nat -A POSTROUTING \
  -d $PROXY_IP \
  -j MASQUERADE
```

---

## 五、云手机平台集成架构

### 5.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway (30000)                        │
│                     (统一入口 + JWT认证)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐
│  User Service   │  │Device Service│  │  Other Services │
│    (30001)      │  │   (30002)    │  │                 │
└─────────────────┘  └──────┬───────┘  └─────────────────┘
                            │
                            │ 调用
                            ▼
                  ┌──────────────────┐
                  │  Proxy Service   │ ⬅─ 新增服务
                  │    (30007)       │
                  └────────┬─────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌────────────────┐ ┌──────────────┐ ┌────────────────┐
│  Bright Data   │ │   Oxylabs    │ │     SOAX       │
│    Adapter     │ │   Adapter    │ │   Adapter      │
└────────┬───────┘ └──────┬───────┘ └────────┬───────┘
         │                │                  │
         └────────────────┼──────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Proxy Pool Manager   │
              │  - 健康检查            │
              │  - 负载均衡            │
              │  - 故障转移            │
              │  - 统计监控            │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Redis (代理池缓存)    │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ PostgreSQL (统计数据)  │
              └───────────────────────┘
```

### 5.2 Proxy Service 架构设计

#### 目录结构
```
backend/proxy-service/
├── src/
│   ├── adapters/              # 供应商适配器
│   │   ├── base.adapter.ts
│   │   ├── brightdata.adapter.ts
│   │   ├── oxylabs.adapter.ts
│   │   ├── soax.adapter.ts
│   │   ├── iproyal.adapter.ts
│   │   └── index.ts
│   ├── pool/                  # 代理池管理
│   │   ├── pool-manager.service.ts
│   │   ├── proxy-rotator.service.ts
│   │   ├── health-monitor.service.ts
│   │   └── failover-handler.service.ts
│   ├── proxy/                 # 核心业务逻辑
│   │   ├── proxy.controller.ts
│   │   ├── proxy.service.ts
│   │   ├── proxy.module.ts
│   │   └── dto/
│   │       ├── get-proxy.dto.ts
│   │       ├── release-proxy.dto.ts
│   │       └── proxy-criteria.dto.ts
│   ├── statistics/            # 统计分析
│   │   ├── statistics.controller.ts
│   │   ├── statistics.service.ts
│   │   └── statistics.module.ts
│   ├── entities/              # 数据模型
│   │   ├── proxy-usage.entity.ts
│   │   ├── proxy-health.entity.ts
│   │   └── provider-config.entity.ts
│   ├── config/                # 配置
│   │   └── providers.config.ts
│   ├── common/                # 通用工具
│   │   ├── constants.ts
│   │   └── interfaces.ts
│   └── app.module.ts
├── test/
├── .env.example
├── package.json
└── tsconfig.json
```

#### 核心实现

**1. Proxy Controller (REST API)**
```typescript
// src/proxy/proxy.controller.ts
import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { GetProxyDto, ProxyCriteriaDto } from './dto';
import { JwtAuthGuard } from '@cloudphone/shared';

@Controller('proxy')
@UseGuards(JwtAuthGuard)
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * 获取代理
   * POST /proxy/acquire
   */
  @Post('acquire')
  async acquireProxy(@Body() criteria: ProxyCriteriaDto) {
    return this.proxyService.acquireProxy(criteria);
  }

  /**
   * 释放代理
   * POST /proxy/release/:proxyId
   */
  @Post('release/:proxyId')
  async releaseProxy(@Param('proxyId') proxyId: string) {
    return this.proxyService.releaseProxy(proxyId);
  }

  /**
   * 报告代理失败
   * POST /proxy/report-failure/:proxyId
   */
  @Post('report-failure/:proxyId')
  async reportFailure(
    @Param('proxyId') proxyId: string,
    @Body() error: { message: string; code?: string }
  ) {
    return this.proxyService.markProxyFailed(proxyId, error);
  }

  /**
   * 获取代理统计
   * GET /proxy/stats
   */
  @Get('stats')
  async getStats() {
    return this.proxyService.getStatistics();
  }

  /**
   * 健康检查
   * GET /proxy/health
   */
  @Get('health')
  async healthCheck() {
    return this.proxyService.healthCheck();
  }

  /**
   * 获取供应商列表
   * GET /proxy/providers
   */
  @Get('providers')
  async getProviders() {
    return this.proxyService.getAvailableProviders();
  }
}
```

**2. Proxy Service (业务逻辑)**
```typescript
// src/proxy/proxy.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ProxyPoolManager } from '../pool/pool-manager.service';
import { ProxyFailoverHandler } from '../pool/failover-handler.service';
import { ProxyCriteriaDto } from './dto';
import { EventBusService } from '@cloudphone/shared';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(
    private readonly poolManager: ProxyPoolManager,
    private readonly failoverHandler: ProxyFailoverHandler,
    private readonly eventBus: EventBusService,
  ) {}

  async acquireProxy(criteria: ProxyCriteriaDto) {
    this.logger.log(`Acquiring proxy with criteria: ${JSON.stringify(criteria)}`);

    const proxy = await this.poolManager.getProxy(criteria);

    // 发布事件
    await this.eventBus.publish('cloudphone.events', 'proxy.acquired', {
      proxyId: proxy.id,
      provider: proxy.provider,
      location: proxy.location,
      timestamp: new Date(),
    });

    return {
      success: true,
      data: proxy,
    };
  }

  async releaseProxy(proxyId: string) {
    this.logger.log(`Releasing proxy: ${proxyId}`);

    await this.poolManager.releaseProxy(proxyId);

    return {
      success: true,
      message: 'Proxy released successfully',
    };
  }

  async markProxyFailed(proxyId: string, error: { message: string; code?: string }) {
    this.logger.warn(`Marking proxy ${proxyId} as failed: ${error.message}`);

    await this.poolManager.markFailed(proxyId, new Error(error.message));

    // 发布失败事件
    await this.eventBus.publish('cloudphone.events', 'proxy.failed', {
      proxyId,
      error: error.message,
      timestamp: new Date(),
    });

    return {
      success: true,
      message: 'Proxy marked as failed',
    };
  }

  async getStatistics() {
    return this.poolManager.getStats();
  }

  async healthCheck() {
    return this.poolManager.healthCheck();
  }

  async getAvailableProviders() {
    return this.poolManager.getProviders();
  }
}
```

**3. Pool Manager (代理池管理)**
```typescript
// src/pool/pool-manager.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ProxyProvider } from '../adapters/base.adapter';
import { BrightDataAdapter } from '../adapters/brightdata.adapter';
import { OxylabsAdapter } from '../adapters/oxylabs.adapter';
import { SoaxAdapter } from '../adapters/soax.adapter';
import { ProxyUsage } from '../entities/proxy-usage.entity';
import { ProxyHealth } from '../entities/proxy-health.entity';

@Injectable()
export class ProxyPoolManager implements OnModuleInit {
  private readonly logger = new Logger(ProxyPoolManager.name);
  private providers: Map<string, ProxyProvider> = new Map();
  private proxyPool: Map<string, ProxyInfo> = new Map();

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(ProxyUsage)
    private usageRepository: Repository<ProxyUsage>,
    @InjectRepository(ProxyHealth)
    private healthRepository: Repository<ProxyHealth>,
  ) {}

  async onModuleInit() {
    await this.initializeProviders();
    await this.loadProxyPool();
  }

  private async initializeProviders() {
    // 注册Bright Data
    const brightData = new BrightDataAdapter();
    await brightData.initialize({
      apiKey: process.env.BRIGHTDATA_API_KEY,
      zone: process.env.BRIGHTDATA_ZONE || 'residential',
    });
    this.providers.set('brightdata', brightData);

    // 注册Oxylabs
    const oxylabs = new OxylabsAdapter();
    await oxylabs.initialize({
      username: process.env.OXYLABS_USERNAME,
      password: process.env.OXYLABS_PASSWORD,
    });
    this.providers.set('oxylabs', oxylabs);

    // 注册SOAX
    const soax = new SoaxAdapter();
    await soax.initialize({
      apiKey: process.env.SOAX_API_KEY,
    });
    this.providers.set('soax', soax);

    this.logger.log(`Initialized ${this.providers.size} proxy providers`);
  }

  private async loadProxyPool() {
    // 从各供应商加载代理到池中
    for (const [name, provider] of this.providers) {
      try {
        const proxies = await provider.getProxyList({ limit: 100 });

        for (const proxy of proxies) {
          this.proxyPool.set(proxy.id, {
            ...proxy,
            provider: name,
            inUse: false,
          });
        }

        this.logger.log(`Loaded ${proxies.length} proxies from ${name}`);
      } catch (error) {
        this.logger.error(`Failed to load proxies from ${name}:`, error);
      }
    }

    // 缓存到Redis
    await this.cacheManager.set('proxy:pool', Array.from(this.proxyPool.values()), 3600);
  }

  async getProxy(criteria?: ProxyCriteria): Promise<ProxyInfo> {
    // 1. 从池中筛选可用代理
    const availableProxies = Array.from(this.proxyPool.values()).filter(
      proxy => !proxy.inUse && this.matchesCriteria(proxy, criteria)
    );

    if (availableProxies.length === 0) {
      // 池中无可用代理，从供应商获取新的
      return this.fetchNewProxy(criteria);
    }

    // 2. 根据质量评分选择最优代理
    const bestProxy = this.selectBestProxy(availableProxies);

    // 3. 标记为使用中
    bestProxy.inUse = true;
    bestProxy.lastUsed = new Date();
    this.proxyPool.set(bestProxy.id, bestProxy);

    // 4. 记录使用情况
    await this.recordUsage(bestProxy);

    return bestProxy;
  }

  private matchesCriteria(proxy: ProxyInfo, criteria?: ProxyCriteria): boolean {
    if (!criteria) return true;

    if (criteria.country && proxy.location.country !== criteria.country) {
      return false;
    }

    if (criteria.city && proxy.location.city !== criteria.city) {
      return false;
    }

    if (criteria.protocol && proxy.protocol !== criteria.protocol) {
      return false;
    }

    if (criteria.minQuality && proxy.quality < criteria.minQuality) {
      return false;
    }

    return true;
  }

  private selectBestProxy(proxies: ProxyInfo[]): ProxyInfo {
    // 综合评分：质量(50%) + 延迟(30%) + 最近使用时间(20%)
    return proxies.reduce((best, current) => {
      const bestScore = this.calculateProxyScore(best);
      const currentScore = this.calculateProxyScore(current);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateProxyScore(proxy: ProxyInfo): number {
    const qualityScore = proxy.quality * 0.5;
    const latencyScore = (1000 - Math.min(proxy.latency, 1000)) / 1000 * 0.3 * 100;
    const freshnessScore = this.getFreshnessScore(proxy.lastUsed) * 0.2;

    return qualityScore + latencyScore + freshnessScore;
  }

  private getFreshnessScore(lastUsed: Date): number {
    const now = Date.now();
    const lastUsedTime = lastUsed ? lastUsed.getTime() : 0;
    const hoursSinceUse = (now - lastUsedTime) / (1000 * 60 * 60);

    // 越久未使用，分数越高（鼓励轮换）
    return Math.min(hoursSinceUse / 24 * 100, 100);
  }

  async releaseProxy(proxyId: string): Promise<void> {
    const proxy = this.proxyPool.get(proxyId);
    if (proxy) {
      proxy.inUse = false;
      this.proxyPool.set(proxyId, proxy);
    }
  }

  async markFailed(proxyId: string, error: Error): Promise<void> {
    const proxy = this.proxyPool.get(proxyId);
    if (!proxy) return;

    // 降低质量评分
    proxy.quality = Math.max(0, proxy.quality - 20);
    proxy.inUse = false;
    proxy.failureCount = (proxy.failureCount || 0) + 1;

    // 如果失败次数过多，从池中移除
    if (proxy.failureCount >= 5) {
      this.proxyPool.delete(proxyId);
      this.logger.warn(`Removed proxy ${proxyId} from pool due to repeated failures`);
    } else {
      this.proxyPool.set(proxyId, proxy);
    }

    // 记录健康状态
    await this.healthRepository.save({
      proxyId,
      provider: proxy.provider,
      isHealthy: false,
      error: error.message,
      checkedAt: new Date(),
    });
  }

  async markSuccess(proxyId: string): Promise<void> {
    const proxy = this.proxyPool.get(proxyId);
    if (!proxy) return;

    // 提升质量评分
    proxy.quality = Math.min(100, proxy.quality + 5);
    proxy.failureCount = 0;
    this.proxyPool.set(proxyId, proxy);

    // 记录健康状态
    await this.healthRepository.save({
      proxyId,
      provider: proxy.provider,
      isHealthy: true,
      checkedAt: new Date(),
    });
  }

  private async recordUsage(proxy: ProxyInfo): Promise<void> {
    await this.usageRepository.save({
      proxyId: proxy.id,
      provider: proxy.provider,
      location: `${proxy.location.country}/${proxy.location.city}`,
      usedAt: new Date(),
    });
  }

  async getStats(): Promise<ProxyPoolStats> {
    const total = this.proxyPool.size;
    const inUse = Array.from(this.proxyPool.values()).filter(p => p.inUse).length;
    const available = total - inUse;

    const providerStats = new Map<string, number>();
    for (const proxy of this.proxyPool.values()) {
      const count = providerStats.get(proxy.provider) || 0;
      providerStats.set(proxy.provider, count + 1);
    }

    const avgQuality = Array.from(this.proxyPool.values())
      .reduce((sum, p) => sum + p.quality, 0) / total;

    return {
      total,
      inUse,
      available,
      providerBreakdown: Object.fromEntries(providerStats),
      averageQuality: avgQuality,
      lastUpdated: new Date(),
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    const stats = await this.getStats();

    return {
      status: stats.available > 10 ? 'healthy' : 'degraded',
      totalProxies: stats.total,
      availableProxies: stats.available,
      providers: Array.from(this.providers.keys()),
      timestamp: new Date(),
    };
  }

  getProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  private async fetchNewProxy(criteria?: ProxyCriteria): Promise<ProxyInfo> {
    // 从最优供应商获取新代理
    const provider = await this.selectOptimalProvider(criteria);
    const proxies = await provider.getProxyList({ ...criteria, limit: 1 });

    if (proxies.length === 0) {
      throw new Error('No proxies available from any provider');
    }

    const proxy = proxies[0];
    proxy.inUse = true;
    this.proxyPool.set(proxy.id, proxy);

    return proxy;
  }

  private async selectOptimalProvider(criteria?: ProxyCriteria): Promise<ProxyProvider> {
    // 简化版：轮询选择
    // 实际应该考虑成本、可用性、质量等因素
    const providers = Array.from(this.providers.values());
    return providers[Math.floor(Math.random() * providers.length)];
  }
}
```

---

### 5.3 Device Service 集成

```typescript
// backend/device-service/src/devices/devices.service.ts

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DevicesService {
  constructor(
    private readonly httpService: HttpService,
    // ... 其他依赖
  ) {}

  async createDevice(createDeviceDto: CreateDeviceDto) {
    // 1. 为设备分配代理
    const proxy = await this.acquireProxyForDevice(createDeviceDto);

    // 2. 创建Docker容器（带代理配置）
    const container = await this.dockerService.createContainer({
      Image: 'redroid/redroid:latest',
      name: `device-${createDeviceDto.deviceId}`,
      Env: [
        `HTTP_PROXY=http://${proxy.host}:${proxy.port}`,
        `HTTPS_PROXY=http://${proxy.host}:${proxy.port}`,
        // ... 其他环境变量
      ],
      // ... 其他配置
    });

    // 3. 启动容器
    await container.start();

    // 4. 配置Android代理
    await this.configureAndroidProxy(container.id, proxy);

    // 5. 保存设备-代理映射
    await this.saveDeviceProxyMapping(createDeviceDto.deviceId, proxy.id);

    return {
      deviceId: createDeviceDto.deviceId,
      container: container.id,
      proxy: {
        id: proxy.id,
        location: proxy.location,
      },
    };
  }

  private async acquireProxyForDevice(dto: CreateDeviceDto): Promise<ProxyInfo> {
    // 调用Proxy Service获取代理
    const response = await firstValueFrom(
      this.httpService.post('http://localhost:30007/proxy/acquire', {
        country: dto.preferredCountry || 'US',
        protocol: 'http',
        minQuality: 70,
      })
    );

    return response.data.data;
  }

  private async configureAndroidProxy(
    containerId: string,
    proxy: ProxyInfo
  ): Promise<void> {
    // 等待ADB连接就绪
    await this.adbService.waitForDevice(containerId);

    // 设置全局代理
    await this.adbService.shell(
      containerId,
      `settings put global http_proxy ${proxy.host}:${proxy.port}`
    );

    this.logger.log(`Configured proxy for container ${containerId}: ${proxy.host}:${proxy.port}`);
  }

  async deleteDevice(deviceId: string) {
    // 1. 获取设备的代理映射
    const proxyId = await this.getDeviceProxyId(deviceId);

    // 2. 删除容器
    await this.dockerService.removeContainer(deviceId);

    // 3. 释放代理
    if (proxyId) {
      await this.releaseProxy(proxyId);
    }

    // 4. 删除映射
    await this.deleteDeviceProxyMapping(deviceId);
  }

  private async releaseProxy(proxyId: string): Promise<void> {
    await firstValueFrom(
      this.httpService.post(`http://localhost:30007/proxy/release/${proxyId}`)
    );
  }

  async rotateDeviceProxy(deviceId: string): Promise<void> {
    // 手动轮换设备代理
    const oldProxyId = await this.getDeviceProxyId(deviceId);

    // 获取新代理
    const newProxy = await this.acquireProxyForDevice({ deviceId });

    // 更新容器配置
    const container = await this.dockerService.getContainer(deviceId);
    await this.configureAndroidProxy(container.id, newProxy);

    // 释放旧代理
    if (oldProxyId) {
      await this.releaseProxy(oldProxyId);
    }

    // 更新映射
    await this.updateDeviceProxyMapping(deviceId, newProxy.id);

    this.logger.log(`Rotated proxy for device ${deviceId}: ${newProxy.id}`);
  }
}
```

---

## 六、推荐方案

### 方案A: 快速启动（2-4周）

**目标**: 快速集成1-2家供应商，验证可行性

#### 供应商选择
1. **主力**: SOAX
   - 理由: 性价比高，API完善，适合大规模使用
   - 预算: $500-1000/月（小规模测试）

2. **备用**: IPRoyal
   - 理由: 价格低，适合初期测试
   - 预算: $200-300/月

#### 技术实现
- 简化版代理服务
- 仅实现基础的代理获取和释放
- 手动配置供应商

#### 里程碑
- Week 1: Proxy Service基础框架 + SOAX适配器
- Week 2: 与Device Service集成，支持创建设备时分配代理
- Week 3: 添加IPRoyal适配器，实现简单的故障转移
- Week 4: 测试和优化

---

### 方案B: 标准集成（4-8周）⭐ 推荐

**目标**: 完整的代理管理系统，支持多供应商，生产就绪

#### 供应商选择
1. **主力**: Bright Data
   - 理由: 企业级可靠性，最大IP池，完善的API
   - 预算: $1000-2000/月

2. **备用**: SOAX
   - 理由: 性价比高，移动代理优秀
   - 预算: $500-1000/月

3. **国内**: 蜘蛛IP
   - 理由: 国内访问优化，中文支持
   - 预算: 待商谈

#### 技术实现（完整版）
✅ 代理池管理
✅ 智能轮换策略
✅ 健康监控系统
✅ 故障自动转移
✅ 统计分析仪表板
✅ 多供应商自动切换
✅ 成本优化算法

#### 里程碑
- Week 1-2: Proxy Service核心架构
- Week 3-4: 供应商适配器开发（Bright Data, SOAX, 蜘蛛IP）
- Week 5-6: 高级功能（健康监控、故障转移、统计）
- Week 7: 与现有服务集成
- Week 8: 测试、优化、文档

---

### 方案C: 企业级方案（8-12周）

**目标**: 自研代理管理平台，支持无限扩展

#### 供应商选择
- 集成5+主流供应商
- 自动成本优化
- 动态供应商切换

#### 高级功能
✅ 机器学习驱动的质量预测
✅ 自动化成本优化
✅ 地理位置智能路由
✅ 实时流量分析
✅ 预测性故障检测
✅ 自定义代理评分算法
✅ WebUI管理界面

---

## 总结与建议

### 立即行动项

1. **本周**:
   - [ ] 注册SOAX和IPRoyal试用账号
   - [ ] 测试API连通性
   - [ ] 验证与Docker/ADB的集成可行性

2. **下周**:
   - [ ] 确定预算和规模需求
   - [ ] 选择集成方案（A/B/C）
   - [ ] 创建Proxy Service基础框架

3. **第三周**:
   - [ ] 实现第一个供应商适配器
   - [ ] 与Device Service集成
   - [ ] 内部测试

### 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 代理质量不稳定 | 高 | 中 | 实施健康监控和自动故障转移 |
| 成本超预算 | 高 | 中 | 成本监控和多供应商比价 |
| API限流/封禁 | 中 | 低 | 实施请求限流和IP轮换 |
| 性能瓶颈 | 中 | 低 | 代理池预加载和缓存策略 |
| 供应商服务中断 | 高 | 低 | 多供应商冗余 |

### 成功指标

- **可用性**: >99.5%
- **代理响应时间**: <2秒
- **故障转移时间**: <30秒
- **代理轮换成功率**: >95%
- **成本效率**: 实际成本不超过预算10%

---

★ Insight ─────────────────────────────────────
1. **多供应商策略是关键**: 不要依赖单一供应商，至少集成2-3家作为互补和备份
2. **代理池管理比选择供应商更重要**: 良好的池管理可以弥补单一供应商的不足
3. **从简单开始，逐步优化**: 先实现基础功能（方案A），再根据实际需求扩展到方案B或C
─────────────────────────────────────────────────

**报告生成完成！建议立即开始POC测试。**
