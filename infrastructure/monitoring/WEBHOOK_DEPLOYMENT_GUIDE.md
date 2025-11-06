# Webhook 通知服务部署指南

**版本**: 1.0.0
**日期**: 2025-11-05
**状态**: 生产就绪

---

## 📋 目录

1. [概述](#概述)
2. [前置条件](#前置条件)
3. [Telegram Bot 部署](#telegram-bot-部署)
4. [Lark Webhook 部署](#lark-webhook-部署)
5. [验证测试](#验证测试)
6. [故障排查](#故障排查)
7. [安全最佳实践](#安全最佳实践)

---

## 概述

本指南介绍如何部署 AlertManager Webhook 适配器服务，将 Prometheus 告警发送到 Telegram 和飞书（Lark）。

### 架构图

```
Prometheus → AlertManager → Webhook 适配器 → Telegram/Lark API
                              ↓
                       Docker 容器服务
                              ↓
                       cloudphone-network
```

### 服务端口

| 服务 | 端口 | 协议 |
|------|------|------|
| Telegram Bot Webhook | 5002 | HTTP |
| Lark Webhook | 5001 | HTTP |
| AlertManager | 9093 | HTTP |

---

## 前置条件

### 系统要求

- ✅ Docker 20.10+
- ✅ Docker Compose 2.0+
- ✅ 网络访问 Telegram/Lark API
- ✅ cloudphone-network 已创建

### 验证环境

```bash
# 检查 Docker 版本
docker --version

# 检查 Docker Compose 版本
docker compose version

# 检查网络
docker network ls | grep cloudphone
```

### 必需凭据

#### Telegram Bot
- ✅ Bot Token (从 @BotFather 获取)
- ✅ Chat ID (群组或频道 ID)

#### Lark (飞书)
- ✅ Webhook URL (从飞书管理后台获取)
- ⚠️ Secret (可选，但推荐启用)

---

## Telegram Bot 部署

### 步骤 1: 创建 Telegram Bot

1. **在 Telegram 中找到 @BotFather**
   ```
   搜索: @BotFather
   或访问: https://t.me/botfather
   ```

2. **创建新机器人**
   ```
   发送: /newbot
   ```

3. **设置机器人名称**
   ```
   Bot Name: CloudPhone Alert Bot
   Bot Username: cloudphone_alert_bot (必须以 _bot 结尾)
   ```

4. **保存 Bot Token**
   ```
   示例 Token: 6123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
   ```

   ⚠️ **重要**: 妥善保管此 Token，不要公开分享！

### 步骤 2: 获取 Chat ID

#### 方法 A: 群组 Chat ID

1. **创建 Telegram 群组**
   - 群组名称: "CloudPhone Alerts"

2. **添加 Bot 到群组**
   - 在群组中搜索您的 Bot
   - 点击添加成员

3. **在群组中发送测试消息**
   ```
   /start
   ```

4. **获取 Chat ID**
   ```bash
   # 替换 YOUR_BOT_TOKEN 为您的 Bot Token
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates | jq
   ```

5. **在返回的 JSON 中查找**
   ```json
   {
     "result": [{
       "message": {
         "chat": {
           "id": -1001234567890,  // ← 这就是您的 Chat ID
           "title": "CloudPhone Alerts",
           "type": "supergroup"
         }
       }
     }]
   }
   ```

   📝 **注意**: 群组 Chat ID 通常是负数

#### 方法 B: 私聊 Chat ID

1. 在 Telegram 中搜索您的 Bot
2. 发送 `/start` 消息
3. 使用同样的 API 获取 updates
4. 私聊 Chat ID 是正数

### 步骤 3: 配置环境变量

```bash
cd /home/eric/next-cloudphone/infrastructure/monitoring/alertmanager-telegram-bot

# 复制演示配置
cp .env.demo .env

# 编辑配置文件
nano .env
```

**配置内容**:
```bash
# 替换为您的真实值
TELEGRAM_BOT_TOKEN=6123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
TELEGRAM_CHAT_ID=-1001234567890
PORT=5002
PARSE_MODE=HTML
LOG_LEVEL=info
```

### 步骤 4: 构建和启动服务

```bash
# 构建 Docker 镜像
docker compose build

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f
```

### 步骤 5: 验证服务

```bash
# 健康检查
curl http://localhost:5002/health

# 期望输出:
# {"status":"ok","service":"alertmanager-telegram-bot","version":"1.0.0"}

# 发送测试消息
curl -X POST http://localhost:5002/test

# 检查 Telegram 群组是否收到测试消息
```

---

## Lark Webhook 部署

### 步骤 1: 创建飞书机器人

1. **登录飞书管理后台**
   ```
   访问: https://open.feishu.cn/
   ```

2. **进入目标群组**
   - 打开飞书应用
   - 进入要接收告警的群组

3. **添加自定义机器人**
   - 点击群组名称 → 设置 → 群机器人
   - 点击 "添加机器人" → "自定义机器人"

4. **配置机器人**
   - 名称: CloudPhone Alert Bot
   - 描述: 接收 Prometheus 告警通知

5. **安全设置（推荐）**
   - ✅ 启用签名验证
   - ✅ 设置关键词: "告警" 或 "Alert"
   - 保存生成的签名密钥

6. **复制 Webhook URL**
   ```
   格式: https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

### 步骤 2: 配置环境变量

```bash
cd /home/eric/next-cloudphone/infrastructure/monitoring/alertmanager-lark-webhook

# 复制演示配置
cp .env.demo .env

# 编辑配置文件
nano .env
```

**配置内容**:
```bash
# 替换为您的真实值
LARK_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
LARK_SECRET=your_secret_if_enabled
PORT=5001
LOG_LEVEL=info
```

### 步骤 3: 构建和启动服务

```bash
# 构建 Docker 镜像
docker compose build

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f
```

### 步骤 4: 验证服务

```bash
# 健康检查
curl http://localhost:5001/health

# 期望输出:
# {"status":"ok","service":"alertmanager-lark-webhook","version":"1.0.0"}

# 发送测试消息
curl -X POST http://localhost:5001/test

# 检查飞书群组是否收到测试消息
```

---

## 验证测试

### 测试 1: 服务健康检查

```bash
# Telegram Bot
curl http://localhost:5002/health
docker ps | grep alertmanager-telegram-bot

# Lark Webhook
curl http://localhost:5001/health
docker ps | grep alertmanager-lark-webhook
```

### 测试 2: 发送测试告警

创建测试脚本 `test-alert.sh`:

```bash
#!/bin/bash

# 测试 Telegram 通知
echo "📨 测试 Telegram 通知..."
curl -X POST http://localhost:5002/telegram-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "receiver": "telegram-critical",
    "status": "firing",
    "alerts": [{
      "status": "firing",
      "labels": {
        "alertname": "TestAlert",
        "severity": "critical",
        "service": "test-service"
      },
      "annotations": {
        "summary": "这是一个测试告警",
        "description": "测试 Telegram 通知功能"
      },
      "startsAt": "'$(date -Iseconds)'"
    }],
    "groupLabels": {
      "alertname": "TestAlert"
    }
  }'

echo -e "\n\n📨 测试飞书通知..."
curl -X POST http://localhost:5001/lark-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "receiver": "lark-critical",
    "status": "firing",
    "alerts": [{
      "status": "firing",
      "labels": {
        "alertname": "TestAlert",
        "severity": "critical",
        "service": "test-service"
      },
      "annotations": {
        "summary": "这是一个测试告警",
        "description": "测试飞书通知功能"
      },
      "startsAt": "'$(date -Iseconds)'"
    }],
    "groupLabels": {
      "alertname": "TestAlert"
    }
  }'

echo -e "\n\n✅ 测试完成！请检查 Telegram 和飞书群组"
```

运行测试:
```bash
chmod +x test-alert.sh
./test-alert.sh
```

### 测试 3: 端到端告警测试

```bash
# 发送告警到 AlertManager
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "E2ETestAlert",
      "severity": "critical",
      "service": "test-service",
      "team": "dev"
    },
    "annotations": {
      "summary": "端到端测试告警",
      "description": "从 Prometheus 到 Telegram/Lark 的完整链路测试"
    }
  }]'

# 等待几秒，检查 Telegram 和飞书是否收到消息
```

---

## 故障排查

### 问题 1: Telegram Bot 发送失败

**症状**: 服务运行但收不到 Telegram 消息

**检查步骤**:

1. **验证 Bot Token**
   ```bash
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
   ```
   期望: 返回 Bot 信息

2. **验证 Chat ID**
   ```bash
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates | jq '.result[].message.chat.id'
   ```

3. **检查 Bot 权限**
   - 确保 Bot 已添加到群组
   - 确保 Bot 有发送消息权限
   - 如果是频道，Bot 需要是管理员

4. **查看服务日志**
   ```bash
   docker logs alertmanager-telegram-bot --tail 50
   ```

**常见错误**:

| 错误 | 原因 | 解决方法 |
|------|------|----------|
| 401 Unauthorized | Bot Token 错误 | 检查 Token 是否正确 |
| 400 Chat not found | Chat ID 错误 | 重新获取正确的 Chat ID |
| 403 Bot was blocked | Bot 被用户屏蔽 | 重新添加 Bot |

### 问题 2: Lark Webhook 发送失败

**症状**: 服务运行但飞书收不到消息

**检查步骤**:

1. **测试 Webhook URL**
   ```bash
   curl -X POST "${LARK_WEBHOOK_URL}" \
     -H "Content-Type: application/json" \
     -d '{"msg_type":"text","content":{"text":"测试消息"}}'
   ```

2. **检查签名验证**
   - 如果启用了签名验证，确保 LARK_SECRET 正确
   - 检查服务日志中的签名计算过程

3. **检查关键词**
   - 如果设置了关键词，消息中必须包含该关键词
   - 修改消息内容或更新关键词设置

4. **查看服务日志**
   ```bash
   docker logs alertmanager-lark-webhook --tail 50
   ```

**常见错误**:

| 错误 | 原因 | 解决方法 |
|------|------|----------|
| 403 Forbidden | 签名验证失败 | 检查 Secret 是否正确 |
| 400 Bad Request | 消息格式错误 | 检查 JSON 格式 |
| 关键词不匹配 | 缺少必需关键词 | 添加关键词到消息中 |

### 问题 3: 服务无法启动

**症状**: Docker 容器启动失败

**检查步骤**:

1. **检查端口占用**
   ```bash
   lsof -i :5001
   lsof -i :5002
   ```

2. **检查 Docker 网络**
   ```bash
   docker network ls | grep cloudphone
   docker network inspect cloudphone-network
   ```

3. **检查 .env 文件**
   ```bash
   # Telegram Bot
   cat /home/eric/next-cloudphone/infrastructure/monitoring/alertmanager-telegram-bot/.env

   # Lark Webhook
   cat /home/eric/next-cloudphone/infrastructure/monitoring/alertmanager-lark-webhook/.env
   ```

4. **重新构建镜像**
   ```bash
   docker compose build --no-cache
   docker compose up -d
   ```

### 问题 4: AlertManager 无法连接到 Webhook

**症状**: AlertManager 日志显示连接错误

**检查步骤**:

1. **确认服务在同一网络**
   ```bash
   docker network inspect cloudphone-network | jq '.[].Containers'
   ```

2. **使用服务名称测试连接**
   ```bash
   docker exec cloudphone-alertmanager curl -f http://alertmanager-telegram-bot:5002/health
   docker exec cloudphone-alertmanager curl -f http://alertmanager-lark-webhook:5001/health
   ```

3. **检查 AlertManager 配置**
   ```bash
   docker exec cloudphone-alertmanager cat /etc/alertmanager/alertmanager.yml
   ```

---

## 安全最佳实践

### 1. 凭据管理

✅ **DO**:
- 使用环境变量存储敏感信息
- 使用 Docker Secrets（生产环境）
- 定期轮换 Bot Token 和 Webhook URL
- 限制 .env 文件权限: `chmod 600 .env`

❌ **DON'T**:
- 不要将 .env 文件提交到版本控制
- 不要在代码中硬编码凭据
- 不要在日志中打印敏感信息
- 不要公开分享 Bot Token

### 2. 网络安全

```yaml
# docker-compose.yml 安全配置
services:
  alertmanager-telegram-bot:
    networks:
      - cloudphone-network
    # 不暴露公网端口
    expose:
      - "5002"
    # 仅 AlertManager 可访问
```

### 3. 速率限制

**Telegram API 限制**:
- 群组消息: 20 条/分钟
- 私聊消息: 30 条/秒

**建议配置** (alertmanager.yml):
```yaml
route:
  group_wait: 30s        # 等待聚合
  group_interval: 5m     # 聚合间隔
  repeat_interval: 12h   # 重复告警间隔
```

### 4. 消息验证

在 Webhook 适配器中添加验证:
```typescript
// 验证 AlertManager 请求来源
app.use((req, res, next) => {
  const allowedIPs = ['alertmanager容器IP'];
  const clientIP = req.ip;
  if (!allowedIPs.includes(clientIP)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});
```

### 5. 监控告警

添加 Webhook 服务自身的监控:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'webhook-services'
    static_configs:
      - targets:
        - 'alertmanager-telegram-bot:5002'
        - 'alertmanager-lark-webhook:5001'
```

### 6. 日志管理

- 设置日志级别为 `info`（生产环境）
- 使用日志轮转防止磁盘填满
- 敏感信息脱敏（Token、Chat ID 等）

---

## 生产环境部署清单

部署到生产环境前，请确认以下事项：

### 配置清单

- [ ] Telegram Bot Token 已获取并配置
- [ ] Telegram Chat ID 已获取并配置
- [ ] Lark Webhook URL 已获取并配置
- [ ] Lark Secret 已启用并配置（推荐）
- [ ] .env 文件权限设置为 600
- [ ] .env 文件已添加到 .gitignore

### 网络清单

- [ ] cloudphone-network 网络已创建
- [ ] 服务可以访问互联网（Telegram/Lark API）
- [ ] AlertManager 可以访问 Webhook 服务
- [ ] 端口 5001, 5002 未被占用

### 服务清单

- [ ] Docker 镜像已构建
- [ ] 容器健康检查正常
- [ ] 服务日志无错误
- [ ] 测试消息发送成功
- [ ] 端到端告警链路测试通过

### 监控清单

- [ ] Prometheus 已配置抓取 Webhook 服务指标
- [ ] Grafana 仪表板已添加 Webhook 服务面板
- [ ] AlertManager 路由规则已配置
- [ ] 告警抑制规则已配置

### 安全清单

- [ ] 凭据使用环境变量存储
- [ ] 敏感文件未提交到版本控制
- [ ] 网络隔离配置正确
- [ ] 速率限制已配置
- [ ] 日志脱敏已实施
- [ ] 告警通知已测试

---

## 附录

### A. 完整部署命令

```bash
# 1. Telegram Bot
cd /home/eric/next-cloudphone/infrastructure/monitoring/alertmanager-telegram-bot
cp .env.demo .env
nano .env  # 填入真实凭据
docker compose build
docker compose up -d
docker logs -f alertmanager-telegram-bot

# 2. Lark Webhook
cd /home/eric/next-cloudphone/infrastructure/monitoring/alertmanager-lark-webhook
cp .env.demo .env
nano .env  # 填入真实凭据
docker compose build
docker compose up -d
docker logs -f alertmanager-lark-webhook

# 3. 测试
curl http://localhost:5002/health
curl http://localhost:5001/health
curl -X POST http://localhost:5002/test
curl -X POST http://localhost:5001/test
```

### B. 服务管理命令

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose stop

# 重启服务
docker compose restart

# 查看日志
docker compose logs -f

# 查看最近 50 行日志
docker compose logs --tail 50

# 查看服务状态
docker compose ps

# 进入容器
docker compose exec <service-name> sh

# 删除服务
docker compose down

# 删除服务和数据卷
docker compose down -v
```

### C. 故障排查命令

```bash
# 检查容器状态
docker ps -a | grep alertmanager

# 检查网络连接
docker network inspect cloudphone-network

# 测试网络连通性
docker exec cloudphone-alertmanager ping -c 3 alertmanager-telegram-bot
docker exec cloudphone-alertmanager ping -c 3 alertmanager-lark-webhook

# 检查端口监听
docker exec alertmanager-telegram-bot netstat -tlnp
docker exec alertmanager-lark-webhook netstat -tlnp

# 查看容器资源使用
docker stats alertmanager-telegram-bot alertmanager-lark-webhook
```

### D. 参考链接

- [Telegram Bot API 文档](https://core.telegram.org/bots/api)
- [飞书开放平台文档](https://open.feishu.cn/document/)
- [AlertManager Webhook 配置](https://prometheus.io/docs/alerting/latest/configuration/#webhook_config)
- [Docker Compose 文档](https://docs.docker.com/compose/)

---

**文档版本**: 1.0.0
**最后更新**: 2025-11-05
**维护者**: CloudPhone 运维团队

_本指南提供了完整的 Webhook 通知服务部署流程。如有问题，请参考故障排查章节或联系运维团队。_
