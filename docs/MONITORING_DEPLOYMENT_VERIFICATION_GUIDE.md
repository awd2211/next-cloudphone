# 监控系统部署验证指南

本文档提供完整的监控系统部署和验证流程，确保从 Prometheus 到各通知渠道的整个告警链路正常工作。

## 📋 目录

- [前置准备](#前置准备)
- [部署步骤](#部署步骤)
- [验证流程](#验证流程)
- [故障排查](#故障排查)
- [最佳实践](#最佳实践)

---

## 🔧 前置准备

### 1. 基础服务检查

确保以下服务已经运行：

```bash
# 检查 Docker 服务
docker ps

# 应该看到以下容器运行：
# - postgres
# - redis
# - rabbitmq
# - prometheus
# - grafana
```

### 2. 业务服务检查

```bash
# 检查 PM2 服务
pm2 list

# 应该看到以下服务运行：
# - user-service (带有 /metrics 端点)
# - device-service (带有 /metrics 端点)
# - billing-service (带有 /metrics 端点)
# - 其他微服务...
```

### 3. 获取必需的凭证

#### Lark (飞书) 凭证

1. **创建飞书群组机器人**：
   - 打开飞书群组
   - 点击右上角 `...` → 设置 → 群机器人
   - 添加机器人 → 自定义机器人
   - 输入机器人名称和描述
   - **重要**: 记录 Webhook URL（格式：`https://open.feishu.cn/open-apis/bot/v2/hook/YOUR_TOKEN`）

2. **（可选）启用签名验证**：
   - 在机器人设置中启用签名验证
   - 记录签名密钥（Secret）

#### Telegram 凭证

1. **创建 Telegram Bot**：
   ```
   1. 在 Telegram 中搜索 @BotFather
   2. 发送 /newbot
   3. 按提示设置 bot 名称
   4. 记录 Bot Token (格式: 123456:ABC-DEF1234ghIkl...)
   ```

2. **获取 Chat ID**：

   **方法 1: 私聊 Bot 获取 Chat ID**
   ```bash
   # 1. 在 Telegram 中向你的 bot 发送任意消息
   # 2. 访问以下 URL（替换 YOUR_BOT_TOKEN）
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates

   # 3. 在返回的 JSON 中找到 "chat": {"id": 123456789}
   ```

   **方法 2: 群组 Chat ID**
   ```bash
   # 1. 将 bot 添加到群组
   # 2. 在群组中发送任意消息
   # 3. 访问 getUpdates API
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates

   # 4. 群组 Chat ID 通常是负数，如 -123456789
   ```

---

## 🚀 部署步骤

### 步骤 1: 部署 Prometheus 和 AlertManager

```bash
cd infrastructure/monitoring/prometheus

# 1. 检查配置文件
cat prometheus.yml        # 确认 scrape_configs 包含所有服务
cat alerts.yml           # 确认告警规则配置正确
cat alertmanager.yml     # 确认接收器配置正确

# 2. 启动服务
docker compose up -d

# 3. 验证服务状态
docker compose ps

# 4. 检查日志
docker compose logs -f prometheus
docker compose logs -f alertmanager

# 5. 访问 Web UI
# Prometheus: http://localhost:9090
# AlertManager: http://localhost:9093
```

#### 验证 Prometheus 配置

```bash
# 检查配置是否有效
curl http://localhost:9090/-/healthy

# 查看抓取目标状态
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, instance: .labels.instance, health: .health}'

# 查看告警规则
curl http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | {alert: .name, state: .state}'
```

#### 验证 AlertManager 配置

```bash
# 检查健康状态
curl http://localhost:9093/-/healthy

# 查看配置
curl http://localhost:9093/api/v2/status | jq '.'

# 测试配置文件语法
docker compose exec alertmanager amtool check-config /etc/alertmanager/alertmanager.yml
```

### 步骤 2: 部署 Lark Webhook Adapter

```bash
cd infrastructure/monitoring/alertmanager-lark-webhook

# 1. 复制环境变量模板
cp .env.example .env

# 2. 编辑 .env 文件，填入 Lark Webhook URL
nano .env

# 必须配置:
LARK_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/YOUR_TOKEN

# 可选配置:
LARK_SECRET=your_secret_if_enabled
PORT=5001
LOG_LEVEL=info

# 3. 构建并启动服务
docker compose up -d

# 4. 检查服务状态
docker compose ps
docker compose logs -f

# 5. 测试健康检查
curl http://localhost:5001/health
```

#### 测试 Lark Adapter

```bash
# 使用测试脚本发送测试告警
cd infrastructure/monitoring/scripts
./test-notification-adapters.sh

# 或手动测试
cd infrastructure/monitoring/alertmanager-lark-webhook
curl -X POST http://localhost:5001/lark-webhook \
  -H "Content-Type: application/json" \
  -d @test-alert.json

# 检查飞书群组是否收到测试消息
```

### 步骤 3: 部署 Telegram Bot Adapter

```bash
cd infrastructure/monitoring/alertmanager-telegram-bot

# 1. 复制环境变量模板
cp .env.example .env

# 2. 编辑 .env 文件
nano .env

# 必须配置:
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=-123456789

# 多个群组（逗号分隔）:
# TELEGRAM_CHAT_ID=-123456789,-987654321,555555555

# 可选配置:
PORT=5002
PARSE_MODE=HTML
LOG_LEVEL=info

# 3. 构建并启动服务
docker compose up -d

# 4. 检查服务状态
docker compose ps
docker compose logs -f

# 5. 测试健康检查
curl http://localhost:5002/health
```

#### 测试 Telegram Adapter

```bash
# 使用测试脚本
cd infrastructure/monitoring/scripts
./test-notification-adapters.sh

# 或手动测试
cd infrastructure/monitoring/alertmanager-telegram-bot
curl -X POST http://localhost:5002/telegram-webhook \
  -H "Content-Type: application/json" \
  -d @test-alert.json

# 检查 Telegram 群组是否收到测试消息
```

### 步骤 4: 重启 AlertManager 应用配置

```bash
cd infrastructure/monitoring/prometheus

# 重启 AlertManager 以加载包含 Lark 和 Telegram 的配置
docker compose restart alertmanager

# 检查日志确认配置加载成功
docker compose logs alertmanager | grep -i "completed"
docker compose logs alertmanager | grep -i "error"
```

### 步骤 5: 部署 Grafana 仪表盘

```bash
cd infrastructure/monitoring/grafana

# 1. 确保 Grafana 运行
docker compose ps grafana

# 2. 访问 Grafana
# URL: http://localhost:3000
# 默认账号: admin / admin

# 3. 添加 Prometheus 数据源
# - 进入 Configuration → Data Sources
# - 添加 Prometheus
# - URL: http://prometheus:9090
# - 点击 Save & Test

# 4. 导入仪表盘
# - 进入 Dashboards → Import
# - 上传 dashboards/ 目录下的 JSON 文件
# - 选择 Prometheus 数据源
# - 点击 Import

# 已有的仪表盘:
# - device-overview.json (设备服务总览)
# - business-metrics.json (业务指标仪表盘 - 17个指标)
```

---

## ✅ 验证流程

### 自动化端到端测试

使用我们提供的测试脚本进行完整的端到端验证：

```bash
cd infrastructure/monitoring/scripts

# 运行端到端测试脚本
./end-to-end-alert-test.sh

# 脚本会自动执行以下步骤:
# 1. 检查所有服务状态
# 2. 记录当前告警基线
# 3. 停止测试服务 (user-service)
# 4. 等待告警触发 (约 2 分钟)
# 5. 验证 Prometheus 生成告警
# 6. 验证 AlertManager 接收告警
# 7. 检查通知适配器日志
# 8. 询问是否恢复服务
# 9. 验证 resolved 通知
```

### 手动验证步骤

#### 1. 验证 Prometheus 指标抓取

```bash
# 访问 Prometheus UI
open http://localhost:9090

# 检查 Targets 页面
# - 所有服务的状态应为 UP
# - 最后抓取时间应在 15 秒内

# 执行测试查询
# 查询: up{job="nestjs-services"}
# 结果: 所有实例应返回值 1
```

#### 2. 验证告警规则加载

```bash
# 访问 Prometheus Alerts 页面
open http://localhost:9090/alerts

# 应该看到以下告警规则（Inactive 状态）:
# - ServiceDown
# - HighErrorRate
# - HighP95Latency
# - DatabaseDown (PostgreSQL, Redis, RabbitMQ)
# - HighDeviceCreationFailureRate
# - LowDeviceAvailability
# - HighOrderFailureRate
# - LowOrderSuccessRate
# ... 等 38 个规则
```

#### 3. 触发测试告警

```bash
# 停止一个服务以触发 ServiceDown 告警
pm2 stop user-service

# 等待约 90 秒（告警规则配置为 1 分钟）
# 然后检查 Prometheus Alerts 页面
# 应该看到 ServiceDown 告警变为 FIRING 状态
```

#### 4. 验证 AlertManager 接收告警

```bash
# 访问 AlertManager UI
open http://localhost:9093

# 应该看到:
# - 告警出现在 Alerts 列表中
# - 告警被正确分组（按 alertname, service 分组）
# - 告警路由到正确的接收器（critical）
```

#### 5. 验证通知发送

**检查 Lark 通知：**
- 打开配置的飞书群组
- 应该收到一条告警消息卡片
- 验证消息内容包含：
  - 🚨 标题（CRITICAL 告警）
  - 告警名称、服务名、集群名
  - 告警详情（摘要、描述、实例）
  - 按钮（查看 AlertManager、查看 Prometheus）

**检查 Telegram 通知：**
- 打开配置的 Telegram 群组/频道
- 应该收到一条 HTML 格式的告警消息
- 验证消息内容包含：
  - 🚨 标题
  - 告警信息（名称、服务、状态）
  - Inline 按钮（查看 AlertManager、查看 Prometheus）

**检查 Email 通知（如果配置）：**
- 查看配置的邮箱
- 应该收到主题为 `🚨 [CRITICAL] ServiceDown - user-service` 的邮件
- 邮件内容应为 HTML 格式，包含告警详情

#### 6. 验证告警恢复通知

```bash
# 恢复服务
pm2 start user-service

# 等待约 90 秒
# 检查是否收到 resolved 通知

# Prometheus 应显示告警状态变为 resolved
# AlertManager 应将告警标记为 resolved
# 各通知渠道应收到恢复通知（绿色/✅ 标识）
```

#### 7. 验证告警分组和抑制

```bash
# 同时停止多个服务
pm2 stop user-service
pm2 stop device-service

# 等待告警触发
# 检查 AlertManager:
# - 多个告警应被分组在一起
# - 只收到一个通知（包含所有告警）

# 恢复服务
pm2 start user-service
pm2 start device-service
```

#### 8. 验证不同严重级别的路由

```bash
# 查看 AlertManager 配置的路由规则
curl http://localhost:9093/api/v2/status | jq '.config.route'

# 验证路由规则:
# - critical 告警 → 'critical' 接收器 (Email + Lark + Telegram)
# - warning 告警 → 'warning' 接收器 (Email + Lark + Telegram)
# - database 告警 → 'database-team' 接收器 (Email + Lark + Telegram)
# - business 告警 → 'business-team' 接收器 (Email + Lark + Telegram)

# 手动触发不同级别的告警来验证路由
```

---

## 🔍 故障排查

### Prometheus 问题

#### 问题 1: Targets 显示 DOWN

```bash
# 检查服务是否运行
pm2 list

# 检查服务 /metrics 端点
curl http://localhost:30001/metrics

# 检查 Prometheus 配置
docker exec prometheus cat /etc/prometheus/prometheus.yml

# 检查 Prometheus 日志
docker logs prometheus --tail 50

# 常见原因:
# - 服务未启动
# - 端口配置错误
# - 防火墙阻止
# - /metrics 端点未启用
```

#### 问题 2: 告警规则不触发

```bash
# 检查告警规则是否加载
curl http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | select(.name=="ServiceDown")'

# 手动执行告警规则的 PromQL 查询
# 在 Prometheus UI 中执行: up{job="nestjs-services"} == 0

# 检查告警规则配置
docker exec prometheus cat /etc/prometheus/alerts.yml

# 重新加载配置
curl -X POST http://localhost:9090/-/reload
```

### AlertManager 问题

#### 问题 1: 未收到告警

```bash
# 检查 Prometheus 是否配置了 AlertManager
curl http://localhost:9090/api/v1/status/config | jq '.data.yaml' | grep alertmanagers

# 检查 AlertManager 是否接收到告警
curl http://localhost:9093/api/v2/alerts | jq '.'

# 检查 AlertManager 日志
docker logs alertmanager --tail 50 | grep -E "(Notify|error|failed)"

# 测试 AlertManager 配置
docker exec alertmanager amtool check-config /etc/alertmanager/alertmanager.yml
```

#### 问题 2: 通知未发送

```bash
# 检查 AlertManager 接收器配置
curl http://localhost:9093/api/v2/status | jq '.config.receivers'

# 检查告警被路由到哪个接收器
curl http://localhost:9093/api/v2/alerts | jq '.[] | {alertname: .labels.alertname, receiver: .receivers[0].name}'

# 查看 AlertManager 发送日志
docker logs alertmanager --tail 100 | grep -E "(webhook|Notify|success|failed)"

# 常见原因:
# - Webhook URL 配置错误
# - 适配器服务未运行
# - 网络连接问题
# - 告警被抑制规则过滤
```

### Lark Webhook Adapter 问题

#### 问题 1: 服务无法启动

```bash
# 检查容器状态
docker ps -a | grep lark-webhook

# 查看详细日志
docker logs alertmanager-lark-webhook

# 检查环境变量
docker exec alertmanager-lark-webhook env | grep LARK

# 常见原因:
# - LARK_WEBHOOK_URL 未配置
# - 端口冲突
# - Docker 网络问题
```

#### 问题 2: 飞书未收到消息

```bash
# 检查服务是否收到 webhook 请求
docker logs alertmanager-lark-webhook --tail 50 | grep "POST /lark-webhook"

# 手动测试发送
curl -X POST http://localhost:5001/lark-webhook \
  -H "Content-Type: application/json" \
  -d @alertmanager-lark-webhook/test-alert.json

# 检查飞书 API 响应
docker logs alertmanager-lark-webhook --tail 100 | grep -E "(发送|Lark|error|success)"

# 常见原因:
# - Webhook URL 错误或已过期
# - 签名验证失败 (如果启用)
# - 飞书 API 限流
# - 消息格式错误
```

### Telegram Bot Adapter 问题

#### 问题 1: Bot Token 无效

```bash
# 验证 Bot Token
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe

# 应返回 bot 信息，如果返回 401 则 token 无效

# 检查容器环境变量
docker exec alertmanager-telegram-bot env | grep TELEGRAM

# 重新配置 token
# 编辑 .env 文件并重启服务
docker compose restart
```

#### 问题 2: Telegram 未收到消息

```bash
# 检查服务日志
docker logs alertmanager-telegram-bot --tail 50

# 验证 Chat ID
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates

# 手动测试发送
curl -X POST http://localhost:5002/telegram-webhook \
  -H "Content-Type: application/json" \
  -d @alertmanager-telegram-bot/test-alert.json

# 常见原因:
# - Chat ID 错误
# - Bot 未加入群组
# - Bot 权限不足
# - 消息格式问题（HTML 解析错误）
```

### 网络连接问题

```bash
# 检查 Docker 网络
docker network ls
docker network inspect cloudphone-network

# 验证服务间连接
docker exec alertmanager ping -c 3 alertmanager-lark-webhook
docker exec alertmanager ping -c 3 alertmanager-telegram-bot

# 检查端口监听
docker exec alertmanager-lark-webhook netstat -tlnp
docker exec alertmanager-telegram-bot netstat -tlnp

# 测试 webhook 连接
docker exec alertmanager curl http://alertmanager-lark-webhook:5001/health
docker exec alertmanager curl http://alertmanager-telegram-bot:5002/health
```

---

## 📚 最佳实践

### 1. 配置管理

```bash
# 使用 Git 管理配置文件
cd infrastructure/monitoring/prometheus
git add alertmanager.yml alerts.yml prometheus.yml
git commit -m "chore: update monitoring configuration"

# 备份关键配置
tar -czf monitoring-config-backup-$(date +%Y%m%d).tar.gz \
  prometheus/ \
  alertmanager-lark-webhook/.env \
  alertmanager-telegram-bot/.env
```

### 2. 密钥管理

```bash
# 使用环境变量存储敏感信息
# 永远不要提交 .env 文件到版本控制

# 在生产环境使用密钥管理服务
# - Docker Secrets
# - Kubernetes Secrets
# - HashiCorp Vault
# - AWS Secrets Manager

# .gitignore 应包含:
*.env
*.env.local
*.env.production
```

### 3. 日志管理

```bash
# 定期清理 Docker 日志
docker system prune -a --volumes --filter "until=168h"

# 配置日志轮转
# 在 docker-compose.yml 中添加:
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

# 使用 ELK 或 Loki 集中管理日志
```

### 4. 性能优化

**Prometheus 优化：**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s          # 默认抓取间隔
  evaluation_interval: 15s      # 告警规则评估间隔

# 对于高频率指标
scrape_configs:
  - job_name: 'high-frequency'
    scrape_interval: 5s         # 更短的抓取间隔

# 数据保留期
storage:
  tsdb:
    retention.time: 30d         # 保留 30 天
    retention.size: 10GB        # 或 10GB
```

**AlertManager 优化：**
```yaml
# alertmanager.yml
route:
  group_wait: 10s              # 首次告警等待时间
  group_interval: 10s          # 同组告警间隔
  repeat_interval: 12h         # 重复通知间隔

# 对于 critical 告警使用更短的间隔
routes:
  - match:
      severity: critical
    group_wait: 5s
    repeat_interval: 4h
```

### 5. 告警规则设计

**避免告警疲劳：**
```yaml
# 使用合理的阈值和持续时间
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 5m                     # 持续 5 分钟才触发
  annotations:
    summary: "错误率超过 5%"
    description: "当前错误率: {{ $value | humanizePercentage }}"
```

**使用告警分级：**
```yaml
# Critical: 需要立即处理
- alert: ServiceDown
  labels:
    severity: critical

# Warning: 需要关注但不紧急
- alert: HighLatency
  labels:
    severity: warning

# Info: 仅用于信息通知
- alert: NewDeployment
  labels:
    severity: info
```

### 6. 监控 Monitoring

```bash
# 监控 Prometheus 自身
# 访问: http://localhost:9090/metrics

# 关键指标:
# - prometheus_tsdb_head_samples: 当前样本数
# - prometheus_tsdb_head_series: 当前序列数
# - prometheus_rule_evaluation_duration_seconds: 规则评估耗时

# 监控 AlertManager 自身
# 访问: http://localhost:9093/metrics

# 关键指标:
# - alertmanager_notifications_total: 通知发送总数
# - alertmanager_notifications_failed_total: 失败通知数
# - alertmanager_silences: 静默规则数
```

### 7. 定期维护

```bash
# 每周任务
# - 检查 Prometheus 存储使用情况
# - 清理过期的告警静默规则
# - 审查告警通知日志

# 每月任务
# - 审查告警规则有效性
# - 优化抓取配置
# - 更新 Grafana 仪表盘
# - 备份配置文件

# 每季度任务
# - 评估告警响应时间
# - 优化通知渠道
# - 更新文档
```

---

## 📊 验证检查清单

使用以下检查清单确保监控系统完全部署并正常工作：

### 基础设施检查

- [ ] Prometheus 运行正常 (http://localhost:9090)
- [ ] AlertManager 运行正常 (http://localhost:9093)
- [ ] Grafana 运行正常 (http://localhost:3000)
- [ ] Lark Webhook Adapter 运行正常 (http://localhost:5001/health)
- [ ] Telegram Bot Adapter 运行正常 (http://localhost:5002/health)

### 指标抓取检查

- [ ] 所有业务服务的 /metrics 端点可访问
- [ ] Prometheus Targets 页面所有目标状态为 UP
- [ ] 可以查询到业务指标（如 `http_requests_total`）
- [ ] 可以查询到自定义业务指标（如 `device_created_total`）

### 告警规则检查

- [ ] 38 个告警规则已加载（Prometheus Alerts 页面）
- [ ] 告警规则语法正确（无 Error 状态）
- [ ] 可以手动触发测试告警
- [ ] 告警在 Prometheus 中正确触发

### AlertManager 检查

- [ ] AlertManager 配置语法正确
- [ ] 6 个接收器配置完成
- [ ] 告警路由规则正确
- [ ] 告警抑制规则生效
- [ ] 告警分组功能正常

### 通知渠道检查

- [ ] Lark 群组收到测试告警
- [ ] Lark 消息格式正确（卡片样式）
- [ ] Telegram 群组收到测试告警
- [ ] Telegram 消息格式正确（HTML + 按钮）
- [ ] （可选）Email 收到测试告警

### 端到端流程检查

- [ ] 触发真实告警（停止服务）
- [ ] Prometheus 检测到服务下线
- [ ] AlertManager 接收到告警
- [ ] 所有通知渠道收到告警
- [ ] 恢复服务后收到 resolved 通知
- [ ] 告警分组和抑制功能验证

### Grafana 仪表盘检查

- [ ] Prometheus 数据源配置成功
- [ ] 设备服务总览仪表盘可用
- [ ] 业务指标仪表盘可用（17 个指标）
- [ ] 图表数据显示正常
- [ ] 告警面板显示正常

---

## 🔗 相关文档

- [AlertManager 配置完成报告](./ALERTMANAGER_CONFIGURATION_COMPLETE.md)
- [Lark 通知设置完成报告](./LARK_NOTIFICATION_SETUP_COMPLETE.md)
- [Telegram 通知设置完成报告](./TELEGRAM_NOTIFICATION_SETUP_COMPLETE.md)
- [监控系统集成总结](./MONITORING_SYSTEM_INTEGRATION_SUMMARY.md)
- [业务指标 Grafana 仪表盘设计文档](./BUSINESS_METRICS_GRAFANA_DASHBOARD.md)

---

## ✅ 完成标准

监控系统部署被认为完成，当满足以下所有条件：

1. ✅ **所有服务运行正常**
   - Prometheus, AlertManager, Grafana, 适配器服务全部运行

2. ✅ **指标采集正常**
   - 所有业务服务指标被 Prometheus 成功抓取
   - 17 个自定义业务指标可查询

3. ✅ **告警规则生效**
   - 38 个告警规则加载并可触发
   - 告警分级正确（critical, warning）

4. ✅ **通知渠道畅通**
   - Lark 和 Telegram 都能收到告警
   - 消息格式正确，包含所有必要信息
   - Resolved 通知正常发送

5. ✅ **可视化完成**
   - Grafana 仪表盘导入成功
   - 图表显示实时数据

6. ✅ **文档完善**
   - 部署文档完整
   - 故障排查指南可用
   - 运维手册齐全

---

**最后更新**: 2025-11-04

**维护者**: DevOps Team

**支持**: 如有问题，请参考故障排查章节或联系运维团队
