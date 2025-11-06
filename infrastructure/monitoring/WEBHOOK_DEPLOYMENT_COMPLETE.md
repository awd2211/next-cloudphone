# Webhook 通知服务部署完成报告

**日期**: 2025-11-05
**任务**: P1 - 部署 Webhook 通知服务
**状态**: ✅ 配置就绪，待用户部署

---

## 执行摘要

Webhook 通知服务的所有配置、文档和测试脚本已准备完成。由于需要真实的第三方服务凭据（Telegram Bot Token 和 Lark Webhook URL），服务尚未实际部署，但所有部署准备工作已完成，用户可以按照文档快速部署。

---

## 完成的工作

### ✅ 1. 环境配置模板

**Telegram Bot** (`.env.demo`):
- Bot Token 配置示例
- Chat ID 配置说明
- 完整的获取凭据指南
- 安全提示和最佳实践

**Lark Webhook** (`.env.demo`):
- Webhook URL 配置示例
- Secret 签名配置
- 飞书机器人创建指南
- 关键词和安全设置说明

**文件位置**:
```
infrastructure/monitoring/
├── alertmanager-telegram-bot/.env.demo
└── alertmanager-lark-webhook/.env.demo
```

### ✅ 2. 完整部署文档

**WEBHOOK_DEPLOYMENT_GUIDE.md** - 50+ 页完整指南，包含:

**章节内容**:
- 📋 架构图和服务端口说明
- 🔧 前置条件和环境验证
- 📱 Telegram Bot 创建和部署（6 个步骤）
- 💬 Lark Webhook 创建和部署（4 个步骤）
- ✅ 3 种验证测试方法
- 🐛 详细故障排查指南
- 🔐 安全最佳实践
- 📝 生产环境部署清单

**关键亮点**:
- 分步骤图文指南（易于跟随）
- 包含所有必需命令（复制粘贴即可）
- 常见错误和解决方案表格
- 端到端测试流程
- 安全配置建议

**文件位置**:
```
infrastructure/monitoring/WEBHOOK_DEPLOYMENT_GUIDE.md
```

### ✅ 3. 自动化测试脚本

**test-webhook-notifications.sh** - 全自动测试脚本

**功能**:
1. **健康检查**: 验证所有服务运行状态
2. **简单测试**: 发送基本测试消息
3. **告警测试**: 发送 AlertManager 格式告警
4. **端到端测试**: 完整链路验证（Prometheus → AlertManager → Webhook → Telegram/Lark）

**输出**:
- 彩色终端输出（绿色=成功，红色=失败，黄色=警告）
- 详细的测试步骤和结果
- HTTP 状态码和响应内容
- 失败原因分析
- 后续行动建议

**使用方法**:
```bash
cd /home/eric/next-cloudphone/infrastructure/monitoring/scripts
./test-webhook-notifications.sh
```

**文件位置**:
```
infrastructure/monitoring/scripts/test-webhook-notifications.sh
```

---

## 服务架构

### 整体架构

```
┌──────────────┐
│  Prometheus  │
└──────┬───────┘
       │ Alerts
       ↓
┌──────────────────┐
│  AlertManager    │
│  Port: 9093      │
└──────┬───────────┘
       │ Webhook
       ├────────────────────────┬─────────────────────────┐
       ↓                        ↓                         ↓
┌─────────────────┐    ┌────────────────┐      ┌──────────────┐
│ Telegram Bot    │    │ Lark Webhook   │      │   Email      │
│ Adapter         │    │ Adapter        │      │   (SMTP)     │
│ Port: 5002      │    │ Port: 5001     │      │              │
└───────┬─────────┘    └────────┬───────┘      └──────────────┘
        │                       │
        │ HTTP API              │ HTTP API
        ↓                       ↓
┌──────────────┐         ┌──────────────┐
│ Telegram API │         │  Lark API    │
└──────────────┘         └──────────────┘
        │                       │
        ↓                       ↓
┌──────────────┐         ┌──────────────┐
│ Telegram群组 │         │  飞书群组    │
└──────────────┘         └──────────────┘
```

### Docker 网络架构

```
cloudphone-network (bridge)
├── cloudphone-prometheus
├── cloudphone-alertmanager
├── alertmanager-telegram-bot  ← 新增
└── alertmanager-lark-webhook  ← 新增
```

### 数据流

1. **告警触发**: Prometheus 检测到指标异常
2. **告警发送**: Prometheus 发送告警到 AlertManager
3. **路由分发**: AlertManager 根据规则路由到不同接收器
4. **格式转换**: Webhook 适配器转换为 Telegram/Lark 格式
5. **消息发送**: 调用第三方 API 发送消息
6. **用户接收**: 用户在 Telegram/飞书群组收到通知

---

## 配置文件清单

### Telegram Bot 服务

| 文件 | 用途 | 状态 |
|------|------|------|
| `Dockerfile` | 容器镜像构建 | ✅ 已存在 |
| `docker-compose.yml` | 服务编排 | ✅ 已存在 |
| `package.json` | Node.js 依赖 | ✅ 已存在 |
| `src/server.ts` | 服务器代码 | ✅ 已存在 |
| `.env.example` | 环境变量示例 | ✅ 已存在 |
| `.env.demo` | 演示配置模板 | ✅ 新创建 |
| `README.md` | 使用文档 | ✅ 已存在 |

### Lark Webhook 服务

| 文件 | 用途 | 状态 |
|------|------|------|
| `Dockerfile` | 容器镜像构建 | ✅ 已存在 |
| `docker-compose.yml` | 服务编排 | ✅ 已存在 |
| `package.json` | Node.js 依赖 | ✅ 已存在 |
| `src/server.ts` | 服务器代码 | ✅ 已存在 |
| `.env.example` | 环境变量示例 | ✅ 已存在 |
| `.env.demo` | 演示配置模板 | ✅ 新创建 |
| `README.md` | 使用文档 | ✅ 已存在 |

### 部署文档和脚本

| 文件 | 用途 | 状态 |
|------|------|------|
| `WEBHOOK_DEPLOYMENT_GUIDE.md` | 完整部署指南 | ✅ 新创建 |
| `scripts/test-webhook-notifications.sh` | 自动化测试脚本 | ✅ 新创建 |
| `alertmanager.yml` | AlertManager 配置 | ✅ 已配置接收器 |

---

## 部署步骤概览

### 快速部署流程

```bash
# 1. Telegram Bot
cd infrastructure/monitoring/alertmanager-telegram-bot
cp .env.demo .env
nano .env  # 填入 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID
docker compose build
docker compose up -d

# 2. Lark Webhook
cd ../alertmanager-lark-webhook
cp .env.demo .env
nano .env  # 填入 LARK_WEBHOOK_URL
docker compose build
docker compose up -d

# 3. 验证
curl http://localhost:5002/health
curl http://localhost:5001/health

# 4. 测试
./scripts/test-webhook-notifications.sh
```

### 详细步骤参考

完整的分步指南请查看 `WEBHOOK_DEPLOYMENT_GUIDE.md`

---

## 验证清单

部署后，请按以下清单验证：

### 服务健康检查

- [ ] Telegram Bot 容器运行中
- [ ] Lark Webhook 容器运行中
- [ ] 健康检查端点返回 200
- [ ] 服务日志无错误

**验证命令**:
```bash
docker ps | grep alertmanager
curl http://localhost:5002/health
curl http://localhost:5001/health
docker logs alertmanager-telegram-bot --tail 20
docker logs alertmanager-lark-webhook --tail 20
```

### 网络连接检查

- [ ] 服务加入 cloudphone-network
- [ ] AlertManager 可以访问 Webhook 服务
- [ ] Webhook 服务可以访问互联网

**验证命令**:
```bash
docker network inspect cloudphone-network | jq '.[].Containers'
docker exec cloudphone-alertmanager curl -f http://alertmanager-telegram-bot:5002/health
docker exec cloudphone-alertmanager curl -f http://alertmanager-lark-webhook:5001/health
```

### 功能测试

- [ ] 简单测试消息发送成功
- [ ] AlertManager 格式告警发送成功
- [ ] Telegram 群组收到消息
- [ ] 飞书群组收到消息
- [ ] 端到端链路测试通过

**验证命令**:
```bash
./scripts/test-webhook-notifications.sh
```

### 配置检查

- [ ] .env 文件配置正确
- [ ] 凭据有效且未过期
- [ ] AlertManager 路由规则正确
- [ ] Webhook URL 在 alertmanager.yml 中配置

**验证命令**:
```bash
cat alertmanager-telegram-bot/.env | grep -v "^#"
cat alertmanager-lark-webhook/.env | grep -v "^#"
docker exec cloudphone-alertmanager cat /etc/alertmanager/alertmanager.yml
```

---

## 当前状态

### ✅ 已完成

1. **环境配置**: 创建了详细的配置模板（.env.demo）
2. **部署文档**: 编写了 50+ 页完整部署指南
3. **测试脚本**: 开发了全自动测试脚本
4. **代码审查**: 验证了源代码和 Dockerfile
5. **网络准备**: 确认 cloudphone-network 存在
6. **文档结构**: 组织了清晰的文件结构

### ⚠️ 需要用户操作

1. **获取 Telegram Bot Token**:
   - 访问 @BotFather
   - 创建新机器人
   - 保存 Token

2. **获取 Telegram Chat ID**:
   - 创建群组或频道
   - 添加机器人
   - 获取 Chat ID

3. **获取 Lark Webhook URL**:
   - 登录飞书管理后台
   - 创建自定义机器人
   - 复制 Webhook URL

4. **配置环境变量**:
   - 复制 .env.demo 为 .env
   - 填入真实凭据

5. **部署服务**:
   - 构建 Docker 镜像
   - 启动容器
   - 验证运行状态

6. **测试验证**:
   - 运行测试脚本
   - 检查消息接收
   - 验证告警链路

---

## 生产部署建议

### 安全配置

1. **凭据管理**:
   ```bash
   # 设置 .env 文件权限
   chmod 600 .env

   # 添加到 .gitignore
   echo ".env" >> .gitignore
   ```

2. **网络隔离**:
   ```yaml
   # docker-compose.yml
   services:
     alertmanager-telegram-bot:
       networks:
         - cloudphone-network
       # 不暴露公网端口
       expose:
         - "5002"
   ```

3. **日志脱敏**:
   - 设置 LOG_LEVEL=info（生产环境）
   - 避免打印敏感信息

### 监控配置

添加 Webhook 服务到 Prometheus 监控:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'webhook-services'
    static_configs:
      - targets:
        - 'alertmanager-telegram-bot:5002'
        - 'alertmanager-lark-webhook:5001'
```

### 高可用配置

1. **容器重启策略**:
   ```yaml
   # docker-compose.yml
   restart: unless-stopped
   ```

2. **健康检查**:
   ```yaml
   healthcheck:
     test: ["CMD", "wget", "--spider", "-q", "http://localhost:5002/health"]
     interval: 30s
     timeout: 5s
     retries: 3
   ```

3. **资源限制**:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '0.5'
         memory: 512M
   ```

---

## 故障排查指南

### 常见问题速查

| 问题 | 可能原因 | 解决方案 |
|------|---------|----------|
| 服务无法启动 | 端口占用 | `lsof -i :5001`, `lsof -i :5002` |
| 消息发送失败 | Bot Token 错误 | 验证 Token: `curl https://api.telegram.org/bot<TOKEN>/getMe` |
| Telegram 收不到消息 | Chat ID 错误 | 重新获取 Chat ID |
| Lark 收不到消息 | Webhook URL 过期 | 重新生成 Webhook URL |
| 网络连接失败 | 不在同一网络 | 检查 `docker network inspect cloudphone-network` |

### 详细排查步骤

参考 `WEBHOOK_DEPLOYMENT_GUIDE.md` 的故障排查章节，包含:
- 4 个主要问题类型
- 每个问题的检查步骤
- 常见错误代码表
- 解决方案命令

---

## 性能指标

### 服务资源使用

**开发环境预期值**:
- CPU: <5% (空闲时)
- 内存: ~50-100 MB (每个服务)
- 网络: 取决于告警频率

**生产环境建议配置**:
```yaml
resources:
  limits:
    cpus: '0.5'
    memory: 512M
  reservations:
    cpus: '0.1'
    memory: 128M
```

### API 速率限制

**Telegram Bot API**:
- 群组消息: 20 条/分钟
- 私聊消息: 30 条/秒

**Lark API**:
- 具体限制查看飞书文档
- 建议配置告警聚合避免超限

**建议 AlertManager 配置**:
```yaml
route:
  group_wait: 30s        # 等待聚合
  group_interval: 5m     # 聚合间隔
  repeat_interval: 12h   # 重复告警间隔
```

---

## 下一步行动

### 立即行动

1. **获取凭据**:
   - [ ] 创建 Telegram Bot 并获取 Token
   - [ ] 获取 Telegram Chat ID
   - [ ] 创建飞书机器人并获取 Webhook URL

2. **配置服务**:
   - [ ] 复制 .env.demo 为 .env
   - [ ] 填入真实凭据
   - [ ] 验证配置格式

3. **部署服务**:
   - [ ] 构建 Docker 镜像
   - [ ] 启动容器
   - [ ] 检查日志

4. **测试验证**:
   - [ ] 运行测试脚本
   - [ ] 验证消息接收
   - [ ] 测试端到端链路

### 后续优化

1. **添加更多通知渠道**:
   - [ ] 配置 SMTP 邮件通知
   - [ ] 添加企业微信通知
   - [ ] 添加钉钉通知

2. **优化告警规则**:
   - [ ] 根据业务需求调整阈值
   - [ ] 配置告警静默时间
   - [ ] 实施告警抑制规则

3. **监控和日志**:
   - [ ] 添加 Webhook 服务到 Prometheus
   - [ ] 创建 Grafana 仪表板
   - [ ] 配置日志聚合（ELK）

---

## 相关文档

### 本地文档

| 文档 | 路径 | 描述 |
|------|------|------|
| 部署指南 | `WEBHOOK_DEPLOYMENT_GUIDE.md` | 50+ 页完整指南 |
| Telegram README | `alertmanager-telegram-bot/README.md` | Telegram 服务说明 |
| Lark README | `alertmanager-lark-webhook/README.md` | Lark 服务说明 |
| 测试脚本 | `scripts/test-webhook-notifications.sh` | 自动化测试 |

### 官方文档

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [飞书开放平台](https://open.feishu.cn/document/)
- [AlertManager Webhook](https://prometheus.io/docs/alerting/latest/configuration/#webhook_config)
- [Docker Compose](https://docs.docker.com/compose/)

---

## 附录

### A. 完整文件列表

```
infrastructure/monitoring/
├── alertmanager-telegram-bot/
│   ├── .env.demo                      ← 新创建
│   ├── .env.example
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── package.json
│   ├── README.md
│   └── src/
│       └── server.ts
├── alertmanager-lark-webhook/
│   ├── .env.demo                      ← 新创建
│   ├── .env.example
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── package.json
│   ├── README.md
│   └── src/
│       └── server.ts
├── scripts/
│   └── test-webhook-notifications.sh  ← 新创建
├── WEBHOOK_DEPLOYMENT_GUIDE.md        ← 新创建
└── prometheus/
    └── alertmanager.yml
```

### B. 环境变量参考

**Telegram Bot**:
```bash
TELEGRAM_BOT_TOKEN=<从 @BotFather 获取>
TELEGRAM_CHAT_ID=<群组或频道 ID>
PORT=5002
PARSE_MODE=HTML
LOG_LEVEL=info
```

**Lark Webhook**:
```bash
LARK_WEBHOOK_URL=<从飞书管理后台获取>
LARK_SECRET=<可选，签名密钥>
PORT=5001
LOG_LEVEL=info
```

### C. Docker Compose 命令速查

```bash
# 构建镜像
docker compose build

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f

# 停止服务
docker compose stop

# 重启服务
docker compose restart

# 删除服务
docker compose down

# 查看状态
docker compose ps
```

---

## 总结

### 完成情况

| 任务 | 状态 | 说明 |
|------|------|------|
| 创建环境配置模板 | ✅ | .env.demo 包含完整示例 |
| 编写部署文档 | ✅ | 50+ 页详细指南 |
| 开发测试脚本 | ✅ | 全自动测试脚本 |
| 代码审查 | ✅ | 验证所有配置文件 |
| 网络准备 | ✅ | cloudphone-network 就绪 |

### 交付物

1. ✅ **配置模板**: 2 个 .env.demo 文件，包含详细说明
2. ✅ **部署文档**: 完整的分步指南（WEBHOOK_DEPLOYMENT_GUIDE.md）
3. ✅ **测试脚本**: 自动化验证脚本（test-webhook-notifications.sh）
4. ✅ **部署清单**: 生产环境检查清单
5. ✅ **故障排查指南**: 常见问题和解决方案

### 用户下一步

用户只需:
1. 获取第三方服务凭据（10-15 分钟）
2. 配置环境变量（2-3 分钟）
3. 运行部署命令（5 分钟）
4. 执行验证测试（2 分钟）

**预计总时间**: 20-30 分钟完成完整部署

---

**报告完成时间**: 2025-11-05
**创建者**: Claude Code
**状态**: ✅ 配置就绪，待部署

_所有 Webhook 通知服务的配置、文档和测试工具已准备完成。用户可以按照 WEBHOOK_DEPLOYMENT_GUIDE.md 中的步骤快速完成部署。_
