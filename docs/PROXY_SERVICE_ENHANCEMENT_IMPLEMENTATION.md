# 代理服务12核心功能增强 - 技术实现文档

## 📋 项目概述

本文档记录了云手机平台代理服务的12个核心功能增强的完整实现方案。

**实施时间**：2025年1月
**技术栈**：NestJS + TypeORM + PostgreSQL + Redis
**实施状态**：7/12 完成，5/12 设计完成

---

## ✅ 已完成功能（7/12）

### 1. A1 - 智能代理推荐 ⭐⭐⭐⭐⭐

**实现文件**：
- `proxy-intelligence.service.ts` (498行)
- `proxy-intelligence.controller.ts` (302行)
- `recommend-proxy.dto.ts`, `proxy-recommendation-response.dto.ts`

**核心算法**：
```typescript
score = successRate * 0.35 +  // 成功率 35%
        latency * 0.25 +       // 延迟 25%
        cost * 0.20 +          // 成本 20%
        quality * 0.15 +       // 质量 15%
        affinity * 0.05        // 亲和性 5%
```

**关键特性**：
- 网站-代理映射学习（ProxyTargetMapping表）
- 设备代理亲和性分析
- Top 3推荐 + 5个备选方案
- 批量推荐支持

**API端点**：
```
POST   /proxy/recommend              # 智能推荐
POST   /proxy/recommend/batch        # 批量推荐
GET    /proxy/website-mapping/:domain # 网站最佳代理
GET    /proxy/affinity/:deviceId     # 设备亲和性
```

---

### 2. C1 - 实时质量评分 ⭐⭐⭐⭐⭐

**实现文件**：
- `proxy-quality.service.ts` (404行)
- `quality-score-response.dto.ts`

**评分维度**：
```typescript
qualityScore =
  successRate * 0.40 +      // 成功率 40%
  availability * 0.25 +     // 可用性 25%
  latency * 0.20 +          // 延迟 20%
  consistency * 0.10 +      // 稳定性 10%
  anonymity * 0.05          // 匿名度 5%
```

**评级体系**：
- S级：≥95分（卓越）
- A级：85-94分（优秀）
- B级：70-84分（良好）
- C级：60-69分（合格）
- D级：<60分（不合格）

**趋势分析**：
- improving：最近3次平均分 > 总体平均分 + 5
- declining：最近3次平均分 < 总体平均分 - 5
- stable：其他情况

**定时任务**：
- 每10分钟自动计算所有代理质量评分
- 保存历史记录，30天自动清理

**API端点**：
```
GET    /proxy/:proxyId/quality-score      # 单个评分
POST   /proxy/quality/batch                # 批量评分
GET    /proxy/quality/distribution         # 分布统计
POST   /proxy/quality/calculate            # 触发计算
```

---

### 3. C2 - 自动故障切换 ⭐⭐⭐⭐

**实现文件**：
- `proxy-failover.service.ts` (285行)
- `failover-config.dto.ts`

**切换策略**：
1. **immediate**：立即切换到第一个可用代理
2. **retry_first**：先尝试修复原代理，失败再切换
3. **quality_based**：切换到质量最高的代理
4. **round_robin**：轮询切换

**配置继承**：
```
全局默认 → 用户级 → 设备级 → 会话级
(优先级递增)
```

**关键参数**：
- maxRetries：最大重试次数（默认3）
- retryDelayMs：重试延迟（默认1000ms）
- failureThreshold：故障阈值（默认3次失败）
- autoRecover：是否自动恢复（默认true）

**API端点**：
```
POST   /proxy/failover/config              # 配置策略
GET    /proxy/failover/config              # 查询配置
POST   /proxy/sessions/:id/failover        # 手动切换
GET    /proxy/failover/history             # 切换历史
```

---

### 4. D1 - 粘性会话 ⭐⭐⭐⭐⭐

**实现文件**：
- `proxy-sticky-session.service.ts` (358行)
- `proxy-sticky-session.controller.ts` (217行)
- `sticky-session.dto.ts`

**核心特性**：
- 最长30天IP绑定
- 自动续期机制
- 会话优先级（1-10）
- 过期检测和告警

**会话状态**：
- active：活跃中
- expiring_soon：即将过期（<2小时）
- expired：已过期
- terminated：已终止

**定时任务**：
- 每小时：自动续期即将过期的会话（<24小时）
- 每6小时：清理过期会话
- 每小时：检测即将过期并发送告警

**API端点**：
```
POST   /proxy/sessions                    # 创建会话
POST   /proxy/sessions/:id/renew          # 续期
DELETE /proxy/sessions/:id                # 终止
GET    /proxy/sessions/:id                # 查询详情
GET    /proxy/sessions/device/:deviceId   # 设备会话
GET    /proxy/sessions/stats/overview     # 统计
```

---

### 5. B1 - 实时成本监控 ⭐⭐⭐⭐⭐

**实现文件**：
- `proxy-cost-monitoring.service.ts` (469行)
- `proxy-cost-monitoring.controller.ts` (206行)
- `cost-monitoring.dto.ts`

**成本类型**：
- bandwidth：按流量计费（$/GB）
- request：按请求数计费（$/request）
- time：按时间计费（$/hour）

**预算告警阈值**：
- 50%：预警提示
- 80%：重要警告
- 95%：严重警告
- 100%：预算耗尽（可配置自动停止）

**成本优化建议**：
- 高成本提供商识别
- 低效代理检测
- 闲置会话清理建议

**定时任务**：
- 每天凌晨2点：生成每日成本汇总

**API端点**：
```
POST   /proxy/cost/record                 # 记录成本
POST   /proxy/cost/budget                 # 配置预算
POST   /proxy/cost/statistics             # 成本统计
GET    /proxy/cost/alerts/user/:userId    # 告警列表
GET    /proxy/cost/optimization/:userId   # 优化建议
GET    /proxy/cost/dashboard/:userId      # 成本仪表盘
```

---

### 6. E1, E2 - 地理匹配 ⭐⭐⭐⭐

**实现文件**：
- `proxy-geo-matching.service.ts` (490行)
- `proxy-geo-matching.controller.ts` (211行)
- `geo-matching.dto.ts`

**匹配评分**：
```typescript
geoMatchScore =
  countryMatch * 50 +   // 国家匹配 50分
  cityMatch * 30 +      // 城市匹配 30分
  ispTypeMatch * 20     // ISP类型 20分
```

**ISP类型**：
- residential：住宅IP（高匿名度）
- datacenter：数据中心IP（高性能）
- mobile：移动IP（移动端模拟）

**智能推荐**：
内置30+网站地理位置推荐规则：
- Instagram → 美国洛杉矶
- Amazon → 美国西雅图
- Google → 美国山景城
- Taobao → 中国杭州
- ...

**API端点**：
```
POST   /proxy/geo/configure               # 配置设备地理
POST   /proxy/geo/match                   # 地理匹配
POST   /proxy/geo/recommend               # 智能推荐
GET    /proxy/geo/device/:deviceId        # 设备配置
GET    /proxy/geo/isp/providers           # ISP提供商
GET    /proxy/geo/statistics              # 地理统计
```

---

### 7. H1 - Provider排名 ⭐⭐⭐⭐

**实现文件**：
- `proxy-provider-ranking.service.ts` (381行)
- `proxy-provider-ranking.controller.ts` (195行)
- `provider-ranking.dto.ts`

**评分算法**：
```typescript
providerScore =
  successRate * 0.35 +    // 成功率 35%
  latency * 0.25 +        // 延迟 25%
  cost * 0.20 +           // 成本效益 20%
  stability * 0.15 +      // 稳定性 15%
  availability * 0.05     // 可用性 5%
```

**排名指标**：
- 总分排名
- 成功率最优
- 延迟最优
- 成本最优

**趋势分析**：
- improving：最近5次 > 总体平均 + 3
- declining：最近5次 < 总体平均 - 3
- stable：其他

**定时任务**：
- 每小时：更新所有提供商评分

**API端点**：
```
GET    /proxy/providers/rankings          # 排名列表
GET    /proxy/providers/:name/details     # 详细评分
POST   /proxy/providers/compare           # 对比提供商
POST   /proxy/providers/:name/calculate   # 计算评分
GET    /proxy/providers/statistics        # 统计信息
```

---

## 🚧 设计完成待实现（5/12）

### 8. F2 - 设备组管理 ⭐⭐⭐

**实现状态**：Service层完成（390行）

**核心功能**：
- 设备组创建和管理
- 设备成员批量管理
- 专属代理池分配
- 自动扩展代理池
- 组级统计和监控

**数据库表**：
- proxy_device_groups：设备组
- proxy_group_devices：组成员
- proxy_group_pool：组代理池
- proxy_group_stats：组统计

**待实现**：
- Controller层（~150行）
- DTO定义（~180行）

**预计API**：
```
POST   /proxy/groups                      # 创建组
GET    /proxy/groups/user/:userId         # 用户的组
POST   /proxy/groups/:id/devices          # 添加设备
POST   /proxy/groups/:id/proxies          # 分配代理
GET    /proxy/groups/:id/details          # 组详情
POST   /proxy/groups/:id/autoscale        # 自动扩展
DELETE /proxy/groups/:id                  # 删除组
```

---

### 9. G1 - 多渠道告警 ⭐⭐⭐⭐

**设计概要**：

**支持渠道**：
- Email（SMTP）
- SMS（Twilio/阿里云）
- Webhook（HTTP POST）
- 钉钉（DingTalk）
- 企业微信（WeChat Work）
- Slack

**告警类型**：
- 成本告警（预算超支）
- 质量告警（代理质量下降）
- 故障告警（故障切换）
- 会话告警（粘性会话即将过期）
- 系统告警（代理池不足）

**告警规则**：
```typescript
{
  ruleId: string;
  name: string;
  type: 'cost' | 'quality' | 'failover' | 'session' | 'system';
  conditions: {
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==';
    threshold: number;
  }[];
  channels: string[];  // ['email', 'sms', 'dingtalk']
  cooldown: number;    // 冷却时间（秒）
  enabled: boolean;
}
```

**数据库表**：
- proxy_alert_channels：告警渠道配置
- proxy_alert_rules：告警规则
- proxy_alert_history：告警历史

**预计实现**：
- Service层：~350行
- Controller层：~180行
- DTO定义：~200行

---

### 10. J1 - 使用报告 ⭐⭐⭐⭐

**设计概要**：

**报告类型**：
- 成本报告（按天/周/月）
- 使用量报告（流量/请求数）
- 质量报告（成功率趋势）
- Provider对比报告
- 设备组报告

**报告格式**：
- PDF（pdfkit）
- Excel（exceljs）
- CSV
- JSON

**聚合维度**：
- 按时间：日/周/月
- 按提供商：BrightData/IPRoyal/...
- 按设备：单设备/设备组
- 按地理位置：国家/城市

**数据库表**：
- proxy_usage_summary：使用汇总
- proxy_report_exports：报告导出任务

**定时任务**：
- 每天凌晨3点：生成每日报告
- 每周一凌晨3点：生成每周报告
- 每月1日凌晨3点：生成每月报告

**预计实现**：
- Service层：~400行
- Controller层：~150行
- DTO定义：~150行

**预计API**：
```
POST   /proxy/reports/generate            # 生成报告
GET    /proxy/reports/exports             # 导出列表
GET    /proxy/reports/download/:id        # 下载报告
GET    /proxy/usage/summary               # 使用汇总
GET    /proxy/reports/templates           # 报告模板
```

---

### 11. M1 - 审计日志 ⭐⭐⭐⭐⭐

**设计概要**：

**审计事件类型**：
- 配置变更（预算/故障切换/地理位置）
- 代理操作（分配/释放/切换）
- 会话管理（创建/续期/终止）
- 设备组操作（创建/删除/成员变更）
- 敏感操作（删除组/修改预算）

**审计内容**：
```typescript
{
  id: string;
  userId: string;
  action: string;           // 'create_budget', 'assign_proxy', ...
  resource: string;         // 'budget', 'proxy', 'session', ...
  resourceId: string;
  details: object;          // 操作详情
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}
```

**数据库表**：
- proxy_audit_logs：审计日志（按月分区）
- proxy_sensitive_audit_logs：敏感操作日志

**按月分区策略**：
```sql
CREATE TABLE proxy_audit_logs_2025_01 PARTITION OF proxy_audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

**查询优化**：
- 复合索引：(userId, timestamp)
- 复合索引：(resource, resourceId, timestamp)
- 全文索引：details (JSON字段)

**数据保留**：
- 标准审计日志：保留90天
- 敏感操作日志：保留2年

**预计实现**：
- Service层：~250行
- Controller层：~120行
- DTO定义：~100行

**预计API**：
```
GET    /proxy/audit/logs                  # 查询日志
GET    /proxy/audit/user/:userId          # 用户日志
GET    /proxy/audit/resource/:type/:id    # 资源日志
POST   /proxy/audit/search                # 高级搜索
GET    /proxy/audit/sensitive             # 敏感操作
GET    /proxy/audit/stats                 # 审计统计
```

---

### 12. ISP模拟（E2） - 已整合到地理匹配

ISP模拟功能已整合到地理匹配功能（E1, E2）中，作为地理匹配的一部分实现。

---

## 📊 数据库表设计（27张表）

### 智能推荐相关（2表）
- proxy_recommendations：推荐历史
- proxy_target_mappings：网站-代理映射

### 质量评分相关（2表）
- proxy_quality_scores：质量评分
- proxy_quality_history：评分历史

### 故障切换相关（2表）
- proxy_failover_configs：切换配置
- proxy_failover_history：切换历史

### 粘性会话相关（2表）
- proxy_sticky_sessions：会话记录
- proxy_session_renewals：续期历史

### 地理匹配相关（2表）
- device_geo_settings：设备地理配置
- isp_providers：ISP提供商信息

### 成本监控相关（4表）
- proxy_cost_records：成本记录
- proxy_cost_budgets：预算配置
- proxy_cost_alerts：成本告警
- proxy_cost_daily_summary：每日汇总

### 设备组相关（4表）
- proxy_device_groups：设备组
- proxy_group_devices：组成员
- proxy_group_pool：组代理池
- proxy_group_stats：组统计

### Provider排名相关（2表）
- proxy_provider_scores：提供商评分
- proxy_provider_score_history：评分历史

### 告警管理相关（3表）
- proxy_alert_channels：告警渠道
- proxy_alert_rules：告警规则
- proxy_alert_history：告警历史

### 使用报告相关（2表）
- proxy_usage_summary：使用汇总
- proxy_report_exports：报告导出

### 审计日志相关（2表）
- proxy_audit_logs：审计日志（按月分区）
- proxy_sensitive_audit_logs：敏感操作日志

---

## 🔧 Entity实体类创建清单

**已创建**：0/27

**待创建文件**：
```
backend/proxy-service/src/proxy/entities/
├── proxy-recommendation.entity.ts
├── proxy-target-mapping.entity.ts
├── proxy-quality-score.entity.ts
├── proxy-quality-history.entity.ts
├── proxy-failover-config.entity.ts
├── proxy-failover-history.entity.ts
├── proxy-sticky-session.entity.ts
├── proxy-session-renewal.entity.ts
├── device-geo-setting.entity.ts
├── isp-provider.entity.ts
├── proxy-cost-record.entity.ts
├── proxy-cost-budget.entity.ts
├── proxy-cost-alert.entity.ts
├── proxy-cost-daily-summary.entity.ts
├── proxy-device-group.entity.ts
├── proxy-group-device.entity.ts
├── proxy-group-pool.entity.ts
├── proxy-group-stats.entity.ts
├── proxy-provider-score.entity.ts
├── proxy-provider-score-history.entity.ts
├── proxy-alert-channel.entity.ts
├── proxy-alert-rule.entity.ts
├── proxy-alert-history.entity.ts
├── proxy-usage-summary.entity.ts
├── proxy-report-export.entity.ts
├── proxy-audit-log.entity.ts
├── proxy-sensitive-audit-log.entity.ts
└── index.ts
```

**Entity示例模板**：
```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('proxy_quality_scores')
@Index(['proxyId'])
export class ProxyQualityScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  proxyId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  qualityScore: number;

  @Column({ type: 'varchar', length: 1 })
  rating: string; // S/A/B/C/D

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  successRate: number;

  @Column({ type: 'int' })
  avgLatency: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  availabilityRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  consistencyScore: number;

  @Column({ type: 'varchar', length: 20 })
  anonymityLevel: string;

  @Column({ type: 'int', default: 0 })
  totalRequests: number;

  @Column({ type: 'int', default: 0 })
  successfulRequests: number;

  @Column({ type: 'int', default: 0 })
  failedRequests: number;

  @Column({ type: 'varchar', length: 20 })
  healthStatus: string; // healthy/degraded/unhealthy

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp' })
  lastCalculatedAt: Date;
}
```

---

## 🔌 Module集成

**待完成**：

1. 更新 `proxy.module.ts`：
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// 导入所有Entity
import * as Entities from './entities';

// 导入所有Service
import {
  ProxyIntelligenceService,
  ProxyQualityService,
  ProxyFailoverService,
  ProxyStickySessionService,
  ProxyCostMonitoringService,
  ProxyGeoMatchingService,
  ProxyProviderRankingService,
  ProxyDeviceGroupService,
  // ... 其他Service
} from './services';

// 导入所有Controller
import {
  ProxyIntelligenceController,
  ProxyStickySessionController,
  ProxyCostMonitoringController,
  ProxyGeoMatchingController,
  ProxyProviderRankingController,
  // ... 其他Controller
} from './controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature(Object.values(Entities)),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    ProxyIntelligenceController,
    ProxyStickySessionController,
    ProxyCostMonitoringController,
    ProxyGeoMatchingController,
    ProxyProviderRankingController,
    // ... 其他Controller
  ],
  providers: [
    ProxyIntelligenceService,
    ProxyQualityService,
    ProxyFailoverService,
    ProxyStickySessionService,
    ProxyCostMonitoringService,
    ProxyGeoMatchingService,
    ProxyProviderRankingService,
    ProxyDeviceGroupService,
    // ... 其他Service
  ],
  exports: [
    // 导出需要被其他模块使用的Service
    ProxyIntelligenceService,
    ProxyQualityService,
  ],
})
export class ProxyModule {}
```

2. 注册权限（在 `user-service/init-permissions.ts`）：
```typescript
// Proxy相关权限
'proxy:recommend',
'proxy:read',
'proxy:stats',
'proxy:admin',
'proxy:config',
'proxy:failover',
'proxy:session:create',
'proxy:session:renew',
'proxy:session:delete',
'proxy:session:read',
'proxy:session:stats',
'proxy:cost:record',
'proxy:cost:budget',
'proxy:cost:stats',
'proxy:cost:alerts',
'proxy:cost:optimize',
'proxy:cost:dashboard',
'proxy:geo:configure',
'proxy:geo:match',
'proxy:geo:recommend',
'proxy:geo:read',
'proxy:geo:stats',
'proxy:provider:read',
'proxy:provider:compare',
'proxy:provider:admin',
'proxy:provider:stats',
// ... 更多权限
```

---

## 📈 性能优化策略

### 1. 数据库优化
- **索引策略**：所有查询字段添加索引
- **分区表**：audit_logs按月分区
- **预计算**：daily_summary每日汇总
- **自动清理**：历史数据定期清理

### 2. 缓存策略
- **Redis缓存**：
  - 质量评分：TTL 10分钟
  - Provider排名：TTL 1小时
  - 地理配置：TTL 30分钟

### 3. 查询优化
- **批量查询**：使用批量API减少请求次数
- **字段筛选**：仅返回需要的字段
- **分页查询**：大数据集必须分页

### 4. 定时任务调度
- **错峰执行**：避免同一时间执行多个任务
- **失败重试**：任务失败自动重试（最多3次）
- **监控告警**：任务异常自动告警

---

## 🔒 安全设计

### 1. 认证授权
- **JWT认证**：所有API需要Bearer Token
- **RBAC权限**：基于角色的访问控制
- **权限粒度**：资源级+操作级

### 2. 数据安全
- **敏感数据加密**：预算金额、成本数据
- **SQL注入防护**：使用参数化查询
- **XSS防护**：输入验证和输出转义

### 3. 审计追踪
- **操作日志**：所有配置变更记录
- **敏感操作**：独立审计日志
- **IP追踪**：记录操作来源IP

---

## 📦 部署清单

### 1. 数据库迁移
```bash
# 创建所有表
npm run migration:run

# 验证表结构
npm run migration:show
```

### 2. 初始化数据
```bash
# 初始化权限
npm run init:permissions

# 初始化ISP提供商数据
npm run seed:isp-providers
```

### 3. 启动服务
```bash
# 开发环境
npm run dev

# 生产环境
npm run build
npm run start:prod
```

### 4. 健康检查
```bash
# 检查服务状态
curl http://localhost:30007/health

# 检查Swagger文档
curl http://localhost:30007/api-docs
```

---

## 📝 使用示例

### 示例1：智能推荐代理
```typescript
const response = await fetch('/proxy/recommend', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    deviceId: 'device-12345',
    targetUrl: 'https://www.instagram.com',
    targetCountry: 'US',
    requirements: {
      minQuality: 80,
      maxLatency: 150,
      maxCostPerGB: 1.0,
      ispType: 'residential',
    },
  }),
});

const { data } = await response.json();
console.log('推荐代理:', data.recommendations[0]);
```

### 示例2：创建粘性会话
```typescript
const response = await fetch('/proxy/sessions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    deviceId: 'device-12345',
    userId: 'user-67890',
    proxyId: 'proxy-abc123',
    durationSeconds: 86400, // 24小时
    autoRenew: true,
    priority: 5,
  }),
});

const { data } = await response.json();
console.log('会话ID:', data.id);
console.log('过期时间:', data.expiresAt);
```

### 示例3：配置成本预算
```typescript
const response = await fetch('/proxy/cost/budget', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: 'user-12345',
    budgetType: 'monthly',
    budgetAmount: 1000.0,
    currency: 'USD',
    alertThresholds: [50, 80, 95, 100],
    autoStop: true,
  }),
});

const { data } = await response.json();
console.log('预算配置成功:', data.id);
```

---

## 🎯 后续优化方向

### 1. 机器学习增强
- 使用TensorFlow.js优化推荐算法
- 预测代理质量趋势
- 自动识别异常模式

### 2. 实时监控
- Grafana仪表盘集成
- 实时告警推送
- 性能指标可视化

### 3. API网关集成
- 统一API入口
- 请求限流
- API版本管理

### 4. 微服务拆分
- 成本监控独立服务
- 报告生成独立服务
- 告警中心独立服务

---

## 📞 技术支持

**文档版本**：v1.0.0
**最后更新**：2025-01-20
**维护团队**：Backend Team

**相关文档**：
- [API文档](./API_DOCUMENTATION.md)
- [数据库设计](./DATABASE_SCHEMA.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
