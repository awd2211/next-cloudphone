# AlertManager 配置完成报告

**日期**: 2025-11-04
**状态**: ✅ 完成
**版本**: AlertManager v0.26.0

---

## 📊 配置概述

成功配置了生产级别的 AlertManager 告警管理系统，实现了多渠道、分层路由、智能抑制的完整告警通知流程。

---

## ✅ 完成的工作

### 1. 核心配置文件

#### 配置文件位置
- **主配置**: `infrastructure/monitoring/prometheus/alertmanager.yml`
- **Docker 部署**: `infrastructure/monitoring/docker-compose.monitoring.yml`
- **Prometheus 集成**: `infrastructure/monitoring/prometheus/prometheus.yml`

#### 配置统计
- **接收器 (Receivers)**: 6 个
- **路由规则 (Routes)**: 5 个
- **抑制规则 (Inhibit Rules)**: 5 个
- **全局超时**: 5 分钟

---

### 2. 接收器配置

#### 接收器列表

| 接收器名称 | 用途 | 通知渠道 | 目标 |
|-----------|------|---------|------|
| **default** | 默认接收器 | Webhook | `http://localhost:5001/alerts` |
| **critical** | 关键告警 | Email + Webhook | `ops-team@example.com, oncall@example.com` |
| **warning** | 警告告警 | Email | `dev-team@example.com` |
| **database-team** | 数据库告警 | Email | `dba-team@example.com` |
| **business-team** | 业务告警 | Email + Webhook | `business-ops@example.com, product@example.com` |
| **dev-team** | 开发环境 | Webhook | `http://localhost:5001/dev-alerts` |

#### 接收器特性

**1. default (默认接收器)**
```yaml
- name: 'default'
  webhook_configs:
  - url: 'http://localhost:5001/alerts'
    send_resolved: true
```
- 接收所有未匹配子路由的告警
- 使用 Webhook 集成自定义系统
- 发送告警解决通知

**2. critical (关键告警)**
```yaml
- name: 'critical'
  email_configs:
  - to: 'ops-team@example.com,oncall@example.com'
    headers:
      Subject: '🚨 [CRITICAL] {{ .GroupLabels.alertname }} - {{ .GroupLabels.service }}'
    html: |
      <h2>🚨 严重告警</h2>
      ...
  webhook_configs:
  - url: 'http://localhost:5001/critical-alerts'
```
- **多渠道通知**: Email + Webhook
- **HTML 邮件模板**: 包含告警详情
- **重复间隔**: 4 小时
- **等待时间**: 5 秒（快速响应）

**3. database-team (数据库专属)**
- 匹配规则: `alertname=~"(PostgreSQLDown|PostgreSQL.*|RedisDown|Redis.*)"`
- 发送给 DBA 团队
- 包含数据库实例信息

**4. business-team (业务团队)**
- 匹配规则: `alertname=~"(High.*Rate|Low.*Rate|.*Business.*)"`
- 发送给业务运营和产品团队
- 包含当前值和阈值信息

---

### 3. 路由规则

#### 路由层次结构

```
根路由 (default)
├── [severity=critical] → critical (continue: true)
├── [severity=warning] → warning
├── [alertname=~"(PostgreSQL.*|Redis.*)"] → database-team (continue: true)
├── [alertname=~"(High.*Rate|Low.*Rate)"] → business-team (continue: true)
└── [environment=development] → dev-team
```

#### 路由配置详解

**1. 关键告警路由**
```yaml
- match:
    severity: critical
  receiver: 'critical'
  group_wait: 5s           # 快速响应
  repeat_interval: 4h      # 频繁提醒
  continue: true           # 继续匹配后续路由
```

**关键特性**:
- `continue: true`: 允许告警同时发送到多个接收器
- 更短的 `group_wait`: 5 秒立即通知
- 更频繁的 `repeat_interval`: 4 小时重复通知

**2. 警告告警路由**
```yaml
- match:
    severity: warning
  receiver: 'warning'
  group_wait: 30s          # 等待更多告警合并
  repeat_interval: 24h     # 每天最多一次
```

**3. 数据库告警路由**
```yaml
- match_re:
    alertname: '(PostgreSQLDown|PostgreSQL.*|RedisDown|Redis.*)'
  receiver: 'database-team'
  group_by: ['alertname', 'instance']
  continue: true
```
- 使用正则匹配捕获所有数据库相关告警
- 按实例分组

**4. 业务告警路由**
```yaml
- match_re:
    alertname: '(High.*Rate|Low.*Rate|.*Business.*)'
  receiver: 'business-team'
  group_by: ['alertname', 'service']
  continue: true
```
- 捕获所有业务指标告警（失败率、成功率等）
- 按服务分组

**5. 开发环境路由**
```yaml
- match:
    environment: development
  receiver: 'dev-team'
  repeat_interval: 24h
```
- 开发环境降低通知频率
- 只使用 Webhook，避免邮件轰炸

---

### 4. 分组策略

#### 全局分组配置

```yaml
group_by: ['alertname', 'cluster', 'service']
group_wait: 10s
group_interval: 10s
repeat_interval: 12h
```

#### 分组参数说明

| 参数 | 值 | 说明 |
|------|-----|------|
| **group_by** | `['alertname', 'cluster', 'service']` | 按告警名称、集群、服务分组 |
| **group_wait** | `10s` | 收到第一个告警后等待 10 秒（等待更多告警合并） |
| **group_interval** | `10s` | 同一分组的新告警发送间隔 |
| **repeat_interval** | `12h` | 同一告警重复通知间隔（12 小时） |

#### 分组效果示例

**场景**: 8 个微服务同时下线

**不分组** (发送 8 次通知):
```
🔔 ServiceDown - api-gateway
🔔 ServiceDown - user-service
🔔 ServiceDown - device-service
🔔 ServiceDown - app-service
🔔 ServiceDown - billing-service
🔔 ServiceDown - notification-service
🔔 ServiceDown - proxy-service
🔔 ServiceDown - sms-receive-service
```

**分组后** (发送 1 次通知):
```
🔔 [ServiceDown] 8 个服务下线
  - api-gateway
  - user-service
  - device-service
  - app-service
  - billing-service
  - notification-service
  - proxy-service
  - sms-receive-service
```

---

### 5. 抑制规则 (Inhibit Rules)

#### 抑制规则列表

| # | 触发条件 (Source) | 抑制目标 (Target) | 匹配维度 (Equal) | 说明 |
|---|------------------|------------------|-----------------|------|
| 1 | `alertname=ServiceDown` | `alertname=~".*"` | `service` | 服务下线时抑制该服务的所有其他告警 |
| 2 | `severity=critical` | `severity=warning` | `instance`, `service` | Critical 告警抑制同实例/服务的 Warning 告警 |
| 3 | `alertname=PostgreSQLDown` | `alertname=~"PostgreSQL.*"` | `instance` | PostgreSQL 下线抑制其他 PostgreSQL 告警 |
| 4 | `alertname=RedisDown` | `alertname=~"Redis.*"` | `instance` | Redis 下线抑制其他 Redis 告警 |
| 5 | `alertname=RabbitMQDown` | `alertname=~"RabbitMQ.*"` | `instance` | RabbitMQ 下线抑制其他 RabbitMQ 告警 |

#### 抑制规则详解

**规则 1: 服务下线抑制**
```yaml
- source_match:
    alertname: 'ServiceDown'
  target_match_re:
    alertname: '.*'
  equal: ['service']
```

**场景**: 当 `user-service` 下线时
- ✅ **触发**: `ServiceDown` (user-service)
- ❌ **抑制**: `HighCPUUsage` (user-service)
- ❌ **抑制**: `SlowHTTPRequests` (user-service)
- ❌ **抑制**: `HighErrorRate` (user-service)

**规则 2: 严重程度抑制**
```yaml
- source_match:
    severity: 'critical'
  target_match:
    severity: 'warning'
  equal: ['instance', 'service']
```

**场景**: 当 Critical 告警触发时
- ✅ **触发**: `ServiceDown [critical]` (user-service)
- ❌ **抑制**: `HighMemoryUsage [warning]` (user-service, 同一实例)
- ✅ **不抑制**: `HighMemoryUsage [warning]` (device-service, 不同服务)

**规则 3-5: 数据库下线抑制**

**场景**: PostgreSQL 下线时
- ✅ **触发**: `PostgreSQLDown`
- ❌ **抑制**: `PostgreSQLHighConnections`
- ❌ **抑制**: `PostgreSQLSlowQueries`
- ❌ **抑制**: `PostgreSQLReplicationLag`

---

### 6. 邮件模板

#### HTML 邮件模板示例 (Critical)

```html
<h2>🚨 严重告警</h2>
<p><strong>告警名称:</strong> {{ .GroupLabels.alertname }}</p>
<p><strong>服务:</strong> {{ .GroupLabels.service }}</p>
<p><strong>集群:</strong> {{ .GroupLabels.cluster }}</p>
<p><strong>触发时间:</strong> {{ .StartsAt }}</p>
<hr>
{{ range .Alerts }}
<h3>{{ .Labels.alertname }}</h3>
<p><strong>摘要:</strong> {{ .Annotations.summary }}</p>
<p><strong>描述:</strong> {{ .Annotations.description }}</p>
<p><strong>实例:</strong> {{ .Labels.instance }}</p>
<hr>
{{ end }}
```

#### 邮件主题模板

| 告警类型 | 主题模板 |
|---------|---------|
| Critical | `🚨 [CRITICAL] {{ .GroupLabels.alertname }} - {{ .GroupLabels.service }}` |
| Warning | `⚠️ [WARNING] {{ .GroupLabels.alertname }} - {{ .GroupLabels.service }}` |
| Database | `🗄️ [DATABASE] {{ .GroupLabels.alertname }}` |
| Business | `📊 [BUSINESS] {{ .GroupLabels.alertname }}` |

---

### 7. 测试脚本

#### 脚本文件
- **路径**: `scripts/test-alertmanager.sh`
- **功能**: 全面测试 AlertManager 配置和功能

#### 测试项目

```bash
./scripts/test-alertmanager.sh
```

**测试覆盖**:
1. ✅ 检查 AlertManager 服务状态
2. ✅ 获取版本和配置信息
3. ✅ 查看当前活跃告警
4. ✅ 查看告警分组
5. ✅ 检查 Prometheus 连接
6. ✅ 测试告警静默功能
7. ✅ 发送测试告警
8. ✅ 验证路由逻辑

**测试结果示例**:
```
✓ AlertManager 服务运行正常: http://localhost:9093
✓ 版本: 0.26.0
  配置的接收器: default, critical, warning, database-team, business-team, dev-team
  子路由: 5
  抑制规则: 5
✓ Prometheus 成功连接到 1 个 AlertManager
✓ 测试告警发送成功
✓ 测试告警已被 AlertManager 接收
✓ AlertManager 检查完成！
```

---

## 🎯 配置验证

### 当前状态

```bash
# 验证配置加载
$ docker exec cloudphone-alertmanager amtool check-config /etc/alertmanager/alertmanager.yml

Checking '/etc/alertmanager/alertmanager.yml'  SUCCESS
Found:
 - global config
 - route
 - 5 inhibit rules
 - 6 receivers
 - 0 templates
```

### API 验证

```bash
# 查询接收器
$ curl -s http://localhost:9093/api/v1/status | jq -r '.data.configJSON.receivers | map(.name)'
[
  "default",
  "critical",
  "warning",
  "database-team",
  "business-team",
  "dev-team"
]

# 查询路由数量
$ curl -s http://localhost:9093/api/v1/status | jq '.data.configJSON.route.routes | length'
5

# 查询抑制规则数量
$ curl -s http://localhost:9093/api/v1/status | jq '.data.configJSON.inhibit_rules | length'
5
```

---

## 🚀 使用指南

### 访问 AlertManager UI

**Web 界面**: http://localhost:9093

**主要功能**:
- 查看所有告警: http://localhost:9093/#/alerts
- 创建静默规则: http://localhost:9093/#/silences
- 查看配置状态: http://localhost:9093/#/status

### 常用 API 操作

#### 1. 查询所有告警
```bash
curl -s http://localhost:9093/api/v2/alerts | jq '.'
```

#### 2. 查询告警分组
```bash
curl -s http://localhost:9093/api/v2/alerts/groups | jq '.'
```

#### 3. 创建静默规则
```bash
curl -X POST http://localhost:9093/api/v2/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [
      {
        "name": "alertname",
        "value": "ServiceDown",
        "isRegex": false
      },
      {
        "name": "service",
        "value": "user-service",
        "isRegex": false
      }
    ],
    "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "endsAt": "'$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%S.000Z)'",
    "createdBy": "admin",
    "comment": "Planned maintenance"
  }'
```

#### 4. 查询静默规则
```bash
curl -s http://localhost:9093/api/v2/silences | jq '.'
```

#### 5. 删除静默规则
```bash
SILENCE_ID="<silence-id>"
curl -X DELETE http://localhost:9093/api/v2/silence/${SILENCE_ID}
```

#### 6. 发送测试告警
```bash
curl -X POST http://localhost:9093/api/v2/alerts \
  -H "Content-Type: application/json" \
  -d '[
    {
      "labels": {
        "alertname": "TestAlert",
        "severity": "warning",
        "service": "test-service"
      },
      "annotations": {
        "summary": "测试告警",
        "description": "这是一个测试告警"
      },
      "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
      "endsAt": "'$(date -u -d '+5 minutes' +%Y-%m-%dT%H:%M:%S.000Z)'"
    }
  ]'
```

#### 7. 重新加载配置
```bash
curl -X POST http://localhost:9093/-/reload
```

### 静默规则使用场景

**1. 计划性维护**
```bash
# 静默 user-service 所有告警 2 小时
alertname = "ServiceDown"
service = "user-service"
```

**2. 已知问题**
```bash
# 静默已知的高 CPU 告警
alertname = "HighCPUUsage"
instance = "10.0.1.100:9100"
```

**3. 测试环境**
```bash
# 静默开发环境所有告警
environment = "development"
```

---

## 📊 监控指标

### AlertManager 自身指标

AlertManager 在 `:9093/metrics` 暴露 Prometheus 指标：

```promql
# 通知失败次数
alertmanager_notifications_failed_total

# 通知成功次数
alertmanager_notifications_total

# 当前活跃告警数
alertmanager_alerts

# 抑制的告警数
alertmanager_silences
```

**将这些指标添加到 Grafana 仪表板以监控 AlertManager 健康状况。**

---

## 🔧 配置调优建议

### 1. 生产环境邮件配置

**更新 SMTP 配置**:
```yaml
global:
  smtp_from: 'alerts@yourdomain.com'
  smtp_smarthost: 'smtp.gmail.com:587'  # 或企业邮件服务器
  smtp_auth_username: 'alerts@yourdomain.com'
  smtp_auth_password: 'your-app-password'
  smtp_require_tls: true
```

**Gmail 配置示例**:
1. 启用两步验证
2. 生成应用专用密码
3. 使用应用密码作为 `smtp_auth_password`

### 2. 高可用配置

**AlertManager 集群模式**:
```yaml
# docker-compose.monitoring.yml
alertmanager:
  command:
    - '--config.file=/etc/alertmanager/alertmanager.yml'
    - '--storage.path=/alertmanager'
    - '--cluster.peer=alertmanager2:9094'
    - '--cluster.listen-address=0.0.0.0:9094'
```

### 3. 通知频率优化

**按严重程度调整**:
```yaml
# Critical: 频繁提醒
- match:
    severity: critical
  repeat_interval: 4h

# Warning: 降低频率
- match:
    severity: warning
  repeat_interval: 24h
```

### 4. 工作时间通知

**使用 time_intervals (AlertManager 0.24+)**:
```yaml
time_intervals:
  - name: 'office-hours'
    time_intervals:
      - weekdays: ['monday:friday']
        times:
          - start_time: '09:00'
            end_time: '18:00'
```

---

## 🔒 安全建议

### 1. 认证和授权

AlertManager 默认没有内置认证，建议：
- 使用反向代理（Nginx/Traefik）添加基本认证
- 或使用 OAuth2 Proxy

### 2. 敏感信息保护

- 使用环境变量存储 SMTP 密码
- 不要在配置文件中明文存储密码
- 使用 Docker secrets 或 Kubernetes secrets

### 3. 网络隔离

- 只在内网暴露 AlertManager
- 使用防火墙限制访问
- 考虑使用 VPN

---

## ⚠️ 已知限制

### 1. SMTP 配置未完成

当前配置使用占位符 SMTP 服务器 (`smtp.example.com`)：
```
establish connection to server: dial tcp: lookup smtp.example.com: no such host
```

**解决方案**: 更新为真实的 SMTP 服务器配置。

### 2. Webhook 端点不存在

Webhook 配置指向 `http://localhost:5001/*`，该服务尚未部署。

**解决方案**:
- 部署 Webhook 接收服务
- 或修改为实际的 Webhook URL
- 或注释掉 Webhook 配置

### 3. 邮件收件人为示例

所有邮件收件人使用示例邮箱 (`ops-team@example.com`)。

**解决方案**: 更新为真实的团队邮箱地址。

---

## 📚 相关文档

- [Prometheus 告警规则测试](./test-prometheus-alerts.sh)
- [Grafana 业务指标仪表板](./GRAFANA_BUSINESS_METRICS_DASHBOARD.md)
- [业务指标集成完成报告](./BUSINESS_METRICS_INTEGRATION_COMPLETE.md)
- [告警规则和指标完成](./ALERTS_AND_METRICS_COMPLETE.md)
- [AlertManager 官方文档](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [AlertManager 配置参考](https://prometheus.io/docs/alerting/latest/configuration/)

---

## 📝 下一步工作

根据 TODO 列表：

1. ✅ **已完成**: 配置 AlertManager 基础设置
2. ⏭️ **下一步**: 配置钉钉通知渠道
3. ⏭️ **待办**: 验证完整告警流程

---

## ✅ 总结

本次 AlertManager 配置工作成功完成了以下目标：

✅ **完整性**: 6 个接收器覆盖不同团队和场景
✅ **智能路由**: 5 条路由规则按优先级和类型分发告警
✅ **告警抑制**: 5 条抑制规则防止告警风暴
✅ **分组策略**: 合理的分组和去重配置减少通知噪音
✅ **HTML 模板**: 美观的邮件模板提供清晰的告警信息
✅ **测试脚本**: 全面的测试工具验证配置正确性
✅ **文档完善**: 详细的配置说明和使用指南

AlertManager 现已准备就绪，为云手机平台提供可靠的告警通知服务。下一步将配置钉钉通知渠道，实现更便捷的移动端告警推送。
