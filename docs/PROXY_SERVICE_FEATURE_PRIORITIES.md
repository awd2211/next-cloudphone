# Proxy Service 功能优先级规划

> 基于云手机平台实际业务需求
> 决策日期: 2025-11-02

## 云手机业务核心场景分析

### 业务场景1: 设备创建时分配代理
```
用户创建云手机 → 自动分配代理IP → 设备使用该IP上网
- 频率: 高（每天可能1000+次）
- 重要性: ⭐⭐⭐⭐⭐ 核心功能
- 需求: 快速、可靠、自动化
```

### 业务场景2: 多地区IP需求
```
国内用户需要美国IP → 访问美国服务
海外用户需要中国IP → 访问国内服务
- 频率: 高
- 重要性: ⭐⭐⭐⭐⭐ 核心功能
- 需求: 支持国家/城市级定位
```

### 业务场景3: 大规模并发
```
平台同时运行10000+设备 → 需要10000+代理IP
- 频率: 持续
- 重要性: ⭐⭐⭐⭐⭐ 核心功能
- 需求: 大容量代理池、高并发处理
```

### 业务场景4: 代理故障自动恢复
```
代理失效 → 自动检测 → 自动切换新代理 → 设备继续使用
- 频率: 中（每天可能100+次）
- 重要性: ⭐⭐⭐⭐⭐ 核心功能
- 需求: 自动故障检测和转移
```

### 业务场景5: 成本控制
```
月使用1TB流量 → 需要监控各供应商费用 → 优化成本
- 频率: 持续
- 重要性: ⭐⭐⭐⭐ 重要功能
- 需求: 使用统计、成本分析
```

### 业务场景6: IP轮换（反检测）
```
社交媒体账号管理 → 定期更换IP → 避免被封
- 频率: 中（每小时一次）
- 重要性: ⭐⭐⭐⭐ 重要功能
- 需求: 自动轮换、手动轮换
```

---

## 功能优先级分级

### P0: 核心功能（必须有，Week 1-2）⚡

#### 1. 代理获取和释放 API
```typescript
// 必须实现的API
POST /proxy/acquire        // 获取代理
POST /proxy/release/:id    // 释放代理
GET  /proxy/health         // 健康检查
```

**为什么是P0?**
- 没有这个，设备无法使用代理
- 最基础的功能

**实现范围**:
- [x] 基础的代理分配逻辑（轮询或随机）
- [x] 代理释放和回收
- [x] 简单的健康检查
- [ ] ~~复杂的智能分配算法~~（P1）

---

#### 2. 多供应商适配器（3家）
```typescript
// 必须实现的供应商
- IPRoyal Adapter       // 小规模，便宜
- Bright Data Adapter   // 企业级，可靠
- Oxylabs Adapter       // 备用
```

**为什么是P0?**
- 单一供应商风险太大
- 3家互为备份

**实现范围**:
- [x] 统一的供应商接口
- [x] 3个具体适配器实现
- [x] 基础的供应商认证
- [ ] ~~供应商自动切换~~（P1）

---

#### 3. 代理池基础管理
```typescript
// 核心能力
- 代理池初始化
- 从供应商获取代理列表
- 缓存代理到Redis
- 简单的可用性检查
```

**为什么是P0?**
- 没有池管理，每次都要调API（太慢）
- 缓存提升性能

**实现范围**:
- [x] 基础的池数据结构
- [x] Redis缓存集成
- [x] 简单的FIFO轮询
- [ ] ~~智能评分和优先级~~（P1）

---

#### 4. 地理位置筛选
```typescript
// 必须支持的筛选条件
{
  "country": "US",      // 国家 ✅ P0
  "city": "New York",   // 城市 ⚠️ P1
  "protocol": "http"    // 协议 ✅ P0
}
```

**为什么是P0?**
- 云手机用户需要指定国家的IP
- 国家级筛选是基本需求

**实现范围**:
- [x] 国家筛选（必须）
- [ ] 城市筛选（P1）
- [ ] ISP筛选（P2）

---

#### 5. Device Service集成
```typescript
// DevicesService调用ProxyService
async createDevice(dto: CreateDeviceDto) {
  const proxy = await this.proxyClient.acquireProxy({
    country: dto.country || 'US'
  });

  // 创建设备时配置代理
  // ...
}
```

**为什么是P0?**
- 这是最主要的使用场景
- 不集成就没法用

**实现范围**:
- [x] ProxyClient服务
- [x] Device Service调用
- [x] Docker环境变量注入
- [x] ADB代理配置
- [ ] ~~其他服务集成~~（P2）

---

#### 6. 基础错误处理
```typescript
// 必须处理的错误
- 供应商API调用失败 → 重试3次
- 代理池为空 → 返回错误
- 网络超时 → 降级处理
```

**为什么是P0?**
- 生产环境必须有基本的容错
- 避免服务直接崩溃

**实现范围**:
- [x] 基础重试机制（@Retry装饰器）
- [x] 超时处理
- [x] 错误日志记录
- [ ] ~~熔断机制~~（P1）

---

### P1: 重要功能（应该有，Week 3-4）🔥

#### 7. 自动健康检查
```typescript
@Cron('*/5 * * * *')  // 每5分钟
async checkProxyHealth() {
  // 测试每个代理的连通性
  // 标记失效的代理
}
```

**为什么是P1?**
- 自动发现失效代理
- 提升用户体验

**实现范围**:
- [x] 定时健康检查任务
- [x] 代理连通性测试
- [x] 失效代理标记
- [x] 自动从池中移除

**预计工作量**: 2天

---

#### 8. 故障自动转移
```typescript
// 代理失败时自动重试
const proxy = await failoverHandler.executeWithFailover(
  async (p) => useProxy(p),
  { maxRetries: 3 }
);
```

**为什么是P1?**
- 减少人工干预
- 提高可用性

**实现范围**:
- [x] FailoverHandler实现
- [x] 自动重试机制
- [x] 智能供应商切换
- [x] 降级策略

**预计工作量**: 3天

---

#### 9. IP自动轮换
```typescript
// 两种轮换模式
1. 时间轮换: 每1小时自动换IP
2. 请求轮换: 每100次请求换IP

// Device Service调用
await this.proxyClient.rotateDeviceProxy(deviceId);
```

**为什么是P1?**
- 社交媒体账号管理需要
- 避免IP被封禁

**实现范围**:
- [x] 手动轮换API
- [x] 定时自动轮换
- [x] 设备-代理映射更新
- [ ] ~~基于规则的智能轮换~~（P2）

**预计工作量**: 2天

---

#### 10. 使用统计和监控
```typescript
// 统计维度
- 每日使用量（请求数、流量）
- 供应商分布
- 成本统计
- 错误率

// Prometheus指标
proxy_usage_requests_total{provider="brightdata"}
proxy_usage_bandwidth_bytes{provider="brightdata"}
```

**为什么是P1?**
- 成本控制必需
- 问题诊断依据

**实现范围**:
- [x] 使用记录入库
- [x] 统计API
- [x] Prometheus指标
- [x] 简单的成本计算

**预计工作量**: 3天

---

#### 11. 供应商自动选择
```typescript
// 根据条件自动选择最优供应商
const proxy = await multiProviderManager.getOptimalProxy({
  country: 'US',
  preferCheap: true,  // 优先便宜的
  minQuality: 70
});

// 评分算法
score = quality * 0.4 + (1 - cost) * 0.4 + (1 - latency) * 0.2
```

**为什么是P1?**
- 自动成本优化
- 提升性能

**实现范围**:
- [x] 供应商评分算法
- [x] 自动选择逻辑
- [x] 成本优先策略
- [x] 质量优先策略

**预计工作量**: 2天

---

#### 12. 城市级地理定位
```typescript
// 支持城市级筛选
{
  "country": "US",
  "city": "New York",    // ← 城市筛选
  "state": "California"  // ← 州/省筛选
}
```

**为什么是P1?**
- 部分场景需要更精确的位置
- Bright Data和Oxylabs都支持

**实现范围**:
- [x] 城市筛选逻辑
- [x] 州/省筛选
- [ ] ~~ZIP Code筛选~~（P3）

**预计工作量**: 1天

---

### P2: 优化功能（可以有，Week 5-6）💡

#### 13. 智能代理评分系统
```typescript
// 综合评分
class ProxyScorer {
  calculateScore(proxy: ProxyInfo): number {
    return (
      proxy.successRate * 0.4 +      // 成功率
      (1 - proxy.avgLatency/1000) * 0.3 + // 延迟
      (1 - proxy.cost) * 0.2 +       // 成本
      proxy.recentUsage * 0.1        // 新鲜度
    );
  }
}
```

**为什么是P2?**
- 优化选择算法
- 非必需但有价值

**实现范围**:
- [x] 多维度评分算法
- [x] 历史数据分析
- [x] 动态调整权重

**预计工作量**: 3天

---

#### 14. 代理会话保持（Sticky Session）
```typescript
// 同一设备保持使用同一代理
{
  "sessionSticky": true,
  "sessionDuration": 3600  // 1小时内复用同一代理
}
```

**为什么是P2?**
- 某些场景需要（如登录态）
- 但不是所有场景都需要

**实现范围**:
- [x] Session管理
- [x] 代理绑定逻辑
- [x] 过期清理

**预计工作量**: 2天

---

#### 15. 批量代理管理
```typescript
// 批量获取代理
POST /proxy/batch-acquire
{
  "count": 100,
  "criteria": { "country": "US" }
}

// 批量释放
POST /proxy/batch-release
{
  "proxyIds": ["proxy-1", "proxy-2", ...]
}
```

**为什么是P2?**
- 大规模场景优化
- 减少API调用次数

**实现范围**:
- [x] 批量获取API
- [x] 批量释放API
- [x] 事务处理

**预计工作量**: 2天

---

#### 16. 成本优化建议
```typescript
// 分析使用模式，给出成本优化建议
GET /statistics/cost-optimization

Response:
{
  "currentMonthlyCost": "$2500",
  "suggestions": [
    {
      "type": "provider_switch",
      "description": "将50%流量从Bright Data迁移到IPRoyal",
      "potentialSaving": "$800/month"
    },
    {
      "type": "usage_pattern",
      "description": "夜间流量占20%，可协商折扣",
      "potentialSaving": "$300/month"
    }
  ]
}
```

**为什么是P2?**
- 长期成本优化
- 非紧急需求

**实现范围**:
- [x] 使用模式分析
- [x] 成本建议算法
- [x] 优化报告生成

**预计工作量**: 3天

---

#### 17. Grafana监控面板
```yaml
# 监控面板
- 代理池状态仪表板
- 供应商性能对比
- 成本趋势图
- 错误率监控
```

**为什么是P2?**
- 运维友好
- 但不影响核心功能

**实现范围**:
- [x] Grafana Dashboard JSON
- [x] 核心指标图表
- [x] 告警规则

**预计工作量**: 2天

---

#### 18. 其他服务集成（App Service等）
```typescript
// App Service使用代理下载APK
@Injectable()
export class AppsService {
  constructor(private proxyClient: ProxyClientService) {}

  async downloadApk(url: string) {
    const proxy = await this.proxyClient.acquireProxy({
      country: 'US'
    });

    return axios.get(url, { proxy });
  }
}
```

**为什么是P2?**
- 扩展使用场景
- 非核心需求

**实现范围**:
- [x] App Service集成
- [ ] Billing Service集成
- [ ] Notification Service集成

**预计工作量**: 每个服务1天

---

### P3: 高级功能（未来可以加，Week 7+）🚀

#### 19. 机器学习驱动的代理选择
```python
# 使用历史数据训练模型
model = train_proxy_selection_model(historical_data)

# 预测最优代理
best_proxy = model.predict({
  'time_of_day': 14,
  'target_country': 'US',
  'device_type': 'android'
})
```

**为什么是P3?**
- 技术复杂度高
- ROI不确定

---

#### 20. 代理质量预测
```typescript
// 预测未来1小时代理质量
GET /proxy/quality-forecast/:proxyId

Response:
{
  "currentQuality": 85,
  "forecast": [
    { "time": "15:00", "predictedQuality": 82 },
    { "time": "16:00", "predictedQuality": 78 }
  ]
}
```

**为什么是P3?**
- 需要大量历史数据
- 实际价值待验证

---

#### 21. 自定义代理供应商
```typescript
// 允许用户添加自己的代理源
POST /admin/providers/custom
{
  "name": "MyProxyProvider",
  "apiUrl": "https://api.myproxy.com",
  "apiKey": "xxx",
  "protocol": "http"
}
```

**为什么是P3?**
- 灵活性高
- 但增加系统复杂度

---

#### 22. WebUI管理界面
```
前端管理界面:
- 代理池可视化
- 使用统计图表
- 供应商配置管理
- 告警配置
```

**为什么是P3?**
- 开发成本高（需要前端）
- API已经够用

---

## 最小可行产品 (MVP) 功能清单

### MVP Scope (2周完成)

**Week 1**:
```
✅ P0-1: 代理获取和释放API
✅ P0-2: IPRoyal适配器（先实现一家，快速验证）
✅ P0-3: 基础代理池管理（Redis缓存）
✅ P0-4: 国家级地理筛选
✅ P0-6: 基础错误处理和重试
```

**Week 2**:
```
✅ P0-2: Bright Data和Oxylabs适配器（补齐）
✅ P0-5: Device Service集成（核心场景打通）
✅ P1-8: 基础故障转移（重试机制）
✅ 集成测试和文档
```

**MVP验收标准**:
- [ ] 设备创建时能自动分配代理 ✅
- [ ] 支持指定国家的IP ✅
- [ ] 代理失败能自动重试 ✅
- [ ] 3家供应商都能正常使用 ✅
- [ ] 基本的监控和日志 ✅

---

## 第一阶段完整版 (4-6周)

### Week 3-4 (P1功能):
```
✅ P1-7: 自动健康检查
✅ P1-8: 完整的故障转移
✅ P1-9: IP自动轮换
✅ P1-10: 使用统计和Prometheus
✅ P1-11: 供应商自动选择
✅ P1-12: 城市级定位
```

### Week 5-6 (测试和生产准备):
```
✅ 完整的单元测试和集成测试
✅ 负载测试（1000并发）
✅ 故障演练
✅ 生产环境部署
✅ 监控和告警配置
✅ 文档和运维手册
```

---

## 功能优先级决策树

```
新功能需求？
  │
  ├─ 影响核心业务？
  │   ├─ 是 → P0
  │   └─ 否 ↓
  │
  ├─ 提升用户体验？
  │   ├─ 显著 → P1
  │   └─ 一般 ↓
  │
  ├─ 降低运营成本？
  │   ├─ 是 → P1/P2
  │   └─ 否 ↓
  │
  ├─ 技术复杂度？
  │   ├─ 高 → P3
  │   └─ 低 → P2
  │
  └─ ROI清晰？
      ├─ 是 → P2
      └─ 否 → P3
```

---

## 资源估算

### 人力需求

**MVP (2周)**:
- 后端开发: 1人全职
- 测试: 0.5人
- **总计**: ~15人天

**第一阶段 (6周)**:
- 后端开发: 1人全职
- 测试: 0.5人
- DevOps: 0.3人
- **总计**: ~60人天

### 成本估算

**开发成本**:
- 人力成本: 约60人天
- 服务器成本: $50/月（开发环境）

**运营成本**（月）:
- 代理费用: $1500-3000（根据流量）
- 服务器资源: $100（生产环境）
- 监控工具: $50（Prometheus + Grafana）
- **总计**: $1650-3150/月

---

## 成功指标 (KPI)

### MVP阶段
```yaml
✅ 设备创建成功率: >95%（使用代理）
✅ 代理分配延迟: <2秒
✅ 服务可用性: >99%
✅ 错误率: <5%
```

### 第一阶段
```yaml
✅ 设备创建成功率: >99%
✅ 代理分配延迟: <500ms
✅ 服务可用性: >99.5%
✅ 错误率: <2%
✅ 自动故障恢复率: >90%
✅ 代理健康率: >95%
```

---

## 推荐实施计划

### 方案: 渐进式交付 🎯

```
Phase 1: MVP (Week 1-2)
  目标: 打通核心流程，快速验证
  交付物: 基础可用的Proxy Service

Phase 2: 完善功能 (Week 3-4)
  目标: 增强稳定性和自动化
  交付物: 生产就绪的Proxy Service

Phase 3: 优化和扩展 (Week 5-6)
  目标: 性能优化和成本控制
  交付物: 企业级Proxy Service

Phase 4: 高级特性 (Week 7+)
  目标: 智能化和更多集成
  交付物: 持续迭代和优化
```

---

## 下一步行动

### 本周任务 ⚡
1. [ ] 注册IPRoyal试用账号（今天）
2. [ ] 创建proxy-service基础框架（1天）
3. [ ] 实现IPRoyal适配器（2天）
4. [ ] 实现基础代理池管理（2天）

### 下周任务
1. [ ] 实现Bright Data和Oxylabs适配器（2天）
2. [ ] Device Service集成（2天）
3. [ ] 基础测试和调试（1天）

### 验收检查
```bash
# MVP完成检查清单
□ 能从3家供应商获取代理
□ 设备创建时能自动配置代理
□ 代理失败能重试
□ 有基本的健康检查
□ 有基本的监控日志
```

---

`★ Insight ─────────────────────────────────────`
**关键洞察：**

1. **MVP优先**：先用2周实现P0功能，快速验证可行性，避免过度设计
2. **核心场景第一**：设备创建时分配代理是最重要的场景，其他都是锦上添花
3. **渐进式交付**：不要一次性实现所有功能，分阶段交付，快速迭代
4. **成本意识**：P1的使用统计和成本优化很重要，能帮你省钱
5. **自动化为王**：P1的自动健康检查和故障转移能显著降低运维成本
`─────────────────────────────────────────────────`

**建议开发路径**：
```
Week 1-2: MVP（P0功能）
  → 验证可行性 ✅
Week 3-4: 完善（P1功能）
  → 生产就绪 ✅
Week 5-6: 优化（P2功能）
  → 降本增效 ✅
Week 7+: 高级（P3功能）
  → 持续迭代 ✅
```

是否开始创建MVP的脚手架代码？我可以帮你：
1. 生成proxy-service的项目结构
2. 实现IPRoyal适配器示例代码
3. 创建基础的API接口
