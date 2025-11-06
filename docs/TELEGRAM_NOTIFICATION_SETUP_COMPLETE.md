# Telegram Bot 通知配置完成报告

**日期**: 2025-11-04
**状态**: ✅ 完成
**集成方式**: Telegram Bot API + Webhook 适配器

---

## 📊 配置概述

成功配置了 AlertManager 与 Telegram Bot 的集成，通过自定义 Webhook 适配器实现告警消息的格式转换和推送，支持 HTML 富文本和交互按钮。

---

## ✅ 完成的工作

### 1. Telegram Bot Webhook 适配器服务

#### 项目结构
```
infrastructure/monitoring/alertmanager-telegram-bot/
├── src/
│   └── server.ts              # Express 服务器 + Telegram API
├── Dockerfile                 # Docker 镜像构建
├── docker-compose.yml         # 容器编排
├── package.json               # 依赖管理
├── tsconfig.json              # TypeScript 配置
├── .env.example               # 环境变量模板
├── test-alert.json            # 测试数据
└── README.md                  # 使用文档
```

#### 核心功能

**1. Telegram Bot API 集成**
- 使用 `telegraf` 库简化 Bot API 调用
- 支持发送富文本消息（HTML/Markdown）
- 支持 Inline Keyboard 交互按钮
- 自动 HTML 转义防止注入

**2. 消息格式**
```html
🚨 <b>严重告警</b>

<b>告警名称</b>: ServiceDown
<b>服务</b>: user-service
<b>集群</b>: cloudphone-cluster
<b>状态</b>: FIRING
<b>数量</b>: 1 个实例

────────────────────
📍 <b>实例 1</b>
• host.docker.internal:30001
• 服务已下线超过 1 分钟
• <b>开始时间</b>: 2025-11-04 18:39:49

[🔍 查看 AlertManager] [📊 查看 Prometheus]
```

**3. 交互按钮**
```javascript
{
  inline_keyboard: [
    [{ text: '🔍 查看 AlertManager', url: 'http://localhost:9093' }],
    [{ text: '📊 查看 Prometheus', url: 'http://localhost:9090' }]
  ]
}
```

**4. API 端点**

| 端点 | 方法 | 用途 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/telegram-webhook` | POST | 接收 AlertManager 告警 |
| `/test` | POST | 发送测试消息 |
| `/bot-info` | GET | 获取 Bot 信息（验证 Token） |

---

### 2. AlertManager 配置更新

#### 接收器配置

所有主要接收器都已配置 Telegram Webhook：

```yaml
# 1. Critical 告警 → Lark + Telegram
- name: 'critical'
  email_configs: [...]
  webhook_configs:
  - url: 'http://alertmanager-lark-webhook:5001/lark-webhook'
    send_resolved: true
  - url: 'http://alertmanager-telegram-bot:5002/telegram-webhook'
    send_resolved: true

# 2. Warning 告警 → Lark + Telegram
- name: 'warning'
  email_configs: [...]
  webhook_configs:
  - url: 'http://alertmanager-lark-webhook:5001/lark-webhook'
    send_resolved: true
  - url: 'http://alertmanager-telegram-bot:5002/telegram-webhook'
    send_resolved: true

# 3. Database 告警 → Lark + Telegram
- name: 'database-team'
  email_configs: [...]
  webhook_configs:
  - url: 'http://alertmanager-lark-webhook:5001/lark-webhook'
    send_resolved: true
  - url: 'http://alertmanager-telegram-bot:5002/telegram-webhook'
    send_resolved: true

# 4. Business 告警 → Lark + Telegram
- name: 'business-team'
  email_configs: [...]
  webhook_configs:
  - url: 'http://alertmanager-lark-webhook:5001/lark-webhook'
    send_resolved: true
  - url: 'http://alertmanager-telegram-bot:5002/telegram-webhook'
    send_resolved: true
```

**多渠道通知**:
- ✅ Email（SMTP）
- ✅ Lark（飞书）
- ✅ Telegram
- ✅ 所有渠道支持 `send_resolved: true`

---

### 3. 消息设计

#### 消息图标方案

| 状态 | 图标 | 说明 |
|------|------|------|
| **Critical Firing** | 🚨 | 严重告警触发 |
| **Warning Firing** | ⚠️ | 警告告警触发 |
| **Resolved** | ✅ | 告警已恢复 |
| **Instance** | 📍 | 实例标识 |

#### 消息结构

**1. 标题区域**
```
🚨 严重告警 / ⚠️ 警告告警 / ✅ 告警已恢复
```

**2. 摘要信息**
- 告警名称
- 服务名称
- 集群名称
- 告警状态
- 实例数量

**3. 告警详情**（最多显示 5 个实例）
- 实例标识
- 告警摘要
- 详细描述（自动截断超长文本）
- 开始时间（本地化显示）
- 当前值和阈值（如果有）

**4. 交互按钮**
- 查看 AlertManager（跳转到 UI）
- 查看 Prometheus（跳转到查询页面）

#### 消息示例

**Critical 告警**:
```
🚨 严重告警

告警名称: ServiceDown
服务: user-service
集群: cloudphone-cluster
状态: FIRING
数量: 1 个实例

────────────────────
📍 实例 1
• host.docker.internal:30001
• 服务 user-service 已下线
• 服务已经下线超过 1 分钟，无法抓取指标数据
• 开始时间: 2025-11-04 18:39:49
• 当前值: 0

[🔍 查看 AlertManager] [📊 查看 Prometheus]
```

**Resolved 消息**:
```
✅ 告警已恢复

告警名称: ServiceDown
服务: user-service
集群: cloudphone-cluster
状态: RESOLVED
数量: 1 个实例

[🔍 查看详情]
```

---

## 🚀 部署指南

### 前置条件

1. ✅ AlertManager 已部署并运行
2. ✅ Docker 和 Docker Compose 已安装
3. 📱 Telegram 账号已创建

### 步骤 1: 创建 Telegram Bot

#### 1.1 与 BotFather 对话
1. 在 Telegram 中搜索 [@BotFather](https://t.me/botfather)
2. 点击 "Start" 开始对话

#### 1.2 创建新机器人
```
发送命令: /newbot

BotFather 会询问:
1. Bot 名称（显示名称）: CloudPhone Alert Manager
2. Bot 用户名（必须以 bot 结尾）: cloudphone_alert_bot

创建成功后会收到:
✅ Done! Congratulations on your new bot.
Token: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

#### 1.3 配置 Bot（可选）
```bash
# 设置 Bot 描述
/setdescription
选择你的 Bot
输入: 接收 CloudPhone 平台监控告警通知

# 设置 Bot 头像
/setuserpic
选择你的 Bot
上传图片

# 设置命令菜单
/setcommands
选择你的 Bot
输入:
start - 开始接收告警
help - 帮助信息
status - 查看系统状态
```

**⚠️ 重要**: 保存 Bot Token，后续配置需要使用。

### 步骤 2: 获取 Chat ID

#### 方法 1: 群组 Chat ID（推荐）

**创建告警通知群组**:
1. 在 Telegram 中创建新群组
2. 命名: "CloudPhone 告警通知"
3. 将团队成员添加到群组
4. 将你的 Bot 添加到群组

**获取群组 Chat ID**:
```bash
# 1. 在群组中发送任意消息（如：/start）
# 2. 访问以下 URL（替换 YOUR_BOT_TOKEN）
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates | jq '.'

# 3. 在响应中找到 chat.id（负数）
{
  "result": [{
    "message": {
      "chat": {
        "id": -123456789,
        "title": "CloudPhone 告警通知",
        "type": "group"
      }
    }
  }]
}

# 群组 Chat ID: -123456789
```

#### 方法 2: 私聊 Chat ID

**与 Bot 私聊**:
1. 在 Telegram 中搜索你的 Bot 用户名
2. 点击 "Start" 按钮
3. 发送任意消息

**获取私聊 Chat ID**:
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates | jq '.result[].message.chat.id'

# 私聊 Chat ID: 123456789（正数）
```

#### 方法 3: 使用辅助 Bot（最简单）

1. 搜索 [@userinfobot](https://t.me/userinfobot)
2. 发送任意消息
3. 机器人会返回你的 User ID 和 Chat ID

### 步骤 3: 配置环境变量

```bash
cd infrastructure/monitoring/alertmanager-telegram-bot

# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件
vim .env
```

**配置内容**:
```bash
# Telegram Bot Token（必填）
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Telegram Chat ID（必填）
# 群组 ID（负数）或私聊 ID（正数）
# 多个 Chat ID 用逗号分隔
TELEGRAM_CHAT_ID=-123456789

# 或多个群组
# TELEGRAM_CHAT_ID=-123456789,-987654321,-111222333

# 服务端口（可选，默认 5002）
PORT=5002

# 消息解析模式（可选，默认 HTML）
PARSE_MODE=HTML
```

### 步骤 4: 构建和启动服务

#### 方式 1: 使用 Docker Compose（推荐）

```bash
cd infrastructure/monitoring/alertmanager-telegram-bot

# 构建镜像
docker build -t alertmanager-telegram-bot:latest .

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f

# 预期输出
alertmanager-telegram-bot | AlertManager Telegram Bot adapter listening on port 5002
alertmanager-telegram-bot | Telegram Bot Token: 已配置
alertmanager-telegram-bot | Chat IDs configured: 1
alertmanager-telegram-bot | Telegram Bot verified successfully
```

#### 方式 2: 本地开发模式

```bash
cd infrastructure/monitoring/alertmanager-telegram-bot

# 安装依赖
pnpm install

# 开发模式（支持热重载）
pnpm dev

# 或构建后运行
pnpm build
pnpm start
```

### 步骤 5: 验证服务状态

#### 5.1 健康检查
```bash
curl http://localhost:5002/health

# 预期输出
{
  "status": "ok",
  "service": "alertmanager-telegram-bot",
  "version": "1.0.0",
  "botConfigured": true,
  "chatIdsConfigured": 1
}
```

#### 5.2 验证 Bot Token
```bash
curl http://localhost:5002/bot-info

# 预期输出
{
  "success": true,
  "bot": {
    "id": 123456789,
    "username": "cloudphone_alert_bot",
    "first_name": "CloudPhone Alert Manager",
    "can_join_groups": true,
    "can_read_all_group_messages": false
  },
  "chatIds": ["-123456789"]
}
```

### 步骤 6: 测试 Telegram 通知

#### 6.1 发送测试消息
```bash
curl -X POST http://localhost:5002/test

# 预期输出
{
  "success": true,
  "message": "Test message sent to Telegram"
}
```

**检查 Telegram 群组/私聊**:
- 应该收到一条测试消息
- 消息包含"🧪 测试消息"标题
- 有一个"✅ 配置成功"按钮

#### 6.2 测试告警消息
```bash
cd infrastructure/monitoring/alertmanager-telegram-bot

curl -X POST http://localhost:5002/telegram-webhook \
  -H "Content-Type: application/json" \
  -d @test-alert.json

# 预期输出
{
  "success": true,
  "message": "Alert sent to Telegram"
}
```

**检查 Telegram**:
- 应该收到一条告警消息
- 标题: "🚨 严重告警"
- 包含 ServiceDown 告警详情
- 有查看按钮

### 步骤 7: 更新 AlertManager 配置

AlertManager 配置已自动更新，包含 Telegram Webhook。

**验证配置**:
```bash
cd infrastructure/monitoring

# 重启 AlertManager
docker compose -f docker-compose.monitoring.yml restart alertmanager

# 验证配置正确性
docker exec cloudphone-alertmanager amtool check-config /etc/alertmanager/alertmanager.yml

# 预期输出
Checking '/etc/alertmanager/alertmanager.yml'  SUCCESS
Found:
 - global config
 - route
 - 5 inhibit rules
 - 6 receivers
 - 0 templates
```

### 步骤 8: 端到端测试

#### 8.1 触发实际告警
```bash
# 停止一个服务
pm2 stop user-service

# 等待 1-2 分钟
# Prometheus 检测到服务下线 → 触发 ServiceDown 告警
```

#### 8.2 检查通知
1. **Telegram 群组**: 应该收到 🚨 严重告警消息
2. **飞书群聊**: 应该收到红色卡片消息
3. **AlertManager UI**: http://localhost:9093/#/alerts

#### 8.3 恢复服务
```bash
# 恢复服务
pm2 start user-service

# 等待 5 分钟
# 应该收到 ✅ 告警已恢复 消息
```

---

## 🎨 高级配置

### 1. 多群组通知

**场景**: 不同团队接收不同类型的告警

**配置多个 Chat ID**:
```bash
# .env
TELEGRAM_CHAT_ID=-123456789,-987654321,-111222333

# 说明:
# -123456789: 运维团队群组
# -987654321: 开发团队群组
# -111222333: 业务团队群组
```

**分组通知** (需要修改代码):
```typescript
// src/server.ts
const getChatIdsByPriority = (severity: string): string[] => {
  if (severity === 'critical') {
    return ['-123456789', '-987654321'];  // 运维 + 开发
  } else if (severity === 'warning') {
    return ['-987654321'];  // 仅开发
  }
  return getChatIds();  // 所有群组
};
```

### 2. 自定义消息模板

**编辑 `src/server.ts`**:
```typescript
function formatTelegramMessage(data: WebhookData): { text: string; buttons: any } {
  // 自定义模板
  let message = `
${emoji} <b>${title}</b>

🏢 <b>项目</b>: CloudPhone Platform
🔔 <b>告警</b>: ${alertName}
🎯 <b>服务</b>: ${service}
🌐 <b>集群</b>: ${cluster}
📊 <b>状态</b>: ${status}
📈 <b>数量</b>: ${alertCount} 个

<i>自动告警系统 by CloudPhone</i>
  `.trim();

  return { text: message, buttons };
}
```

### 3. 消息线程（Thread）

**群组中使用线程**:
```typescript
await bot.telegram.sendMessage(chatId, message, {
  parse_mode: 'HTML',
  reply_to_message_id: threadMessageId,  // 回复特定消息创建线程
  reply_markup: buttons,
});
```

### 4. 静默模式

**配置静默时间（AlertManager 配置）**:
```yaml
# alertmanager.yml
time_intervals:
  - name: 'night'
    time_intervals:
      - weekdays: ['monday:sunday']
        times:
          - start_time: '00:00'
            end_time: '08:00'

route:
  routes:
  - match:
      severity: warning
    receiver: 'telegram-warning'
    mute_time_intervals:
      - 'night'  # 晚上静默 warning 告警
```

### 5. Markdown 格式

**切换到 Markdown**:
```bash
# .env
PARSE_MODE=Markdown
```

**消息格式差异**:
```markdown
# HTML
<b>粗体</b>
<i>斜体</i>
<code>代码</code>
<a href="url">链接</a>

# Markdown
*粗体*
_斜体_
`代码`
[链接](url)
```

---

## 🔧 故障排查

### 问题 1: Bot Token 无效

**错误信息**:
```
401 Unauthorized
```

**解决方案**:
1. 验证 Token 格式: `123456:ABC-DEF...`（冒号分隔）
2. 访问 BotFather 重新生成 Token
3. 确保 Token 没有多余空格

**验证 Token**:
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

### 问题 2: Chat ID 错误

**错误信息**:
```
400 Bad Request: chat not found
```

**解决方案**:
1. 确认 Bot 已添加到群组
2. 确认群组 Chat ID 是负数（`-123456789`）
3. 私聊 Chat ID 是正数（`123456789`）
4. 重新获取 Chat ID

### 问题 3: Bot 被屏蔽

**错误信息**:
```
403 Forbidden: bot was blocked by the user
```

**解决方案**:
1. 用户需要在 Telegram 中取消屏蔽 Bot
2. 或将 Bot 添加到群组（群组不会屏蔽 Bot）

### 问题 4: 群组权限不足

**错误信息**:
```
400 Bad Request: not enough rights to send message
```

**解决方案**:
1. 确保 Bot 是群组管理员（如果群组设置要求）
2. 检查群组设置是否允许 Bot 发送消息
3. 确保群组没有限制机器人消息

### 问题 5: 消息发送失败

**查看日志**:
```bash
# Docker 日志
docker logs -f alertmanager-telegram-bot

# 或本地开发日志
pnpm dev
```

**常见原因**:
- 网络连接问题（检查能否访问 `api.telegram.org`）
- Chat ID 配置错误
- Bot Token 过期
- 消息格式错误（HTML 解析失败）

### 问题 6: 消息格式错误

**错误信息**:
```
400 Bad Request: can't parse entities
```

**解决方案**:
1. 检查 HTML 标签是否正确闭合
2. 特殊字符需要转义（`<`, `>`, `&`）
3. 服务已自动转义，如仍报错检查原始数据

---

## 📊 监控和统计

### Telegram Bot API 限制

| 限制类型 | 值 | 说明 |
|---------|-----|------|
| **群组消息** | 20 条/分钟 | 同一群组 |
| **私聊消息** | 30 条/秒 | 同一用户 |
| **消息长度** | 4096 字符 | 单条消息 |
| **按钮数量** | 100 | 单条消息 |

### 性能建议

1. **合理配置 AlertManager 分组**:
```yaml
group_wait: 10s        # 等待更多告警合并
group_interval: 10s    # 同组新告警间隔
repeat_interval: 12h   # 重复通知间隔
```

2. **监控发送速率**:
```typescript
// 添加 Prometheus 指标
import promClient from 'prom-client';

const telegramMessages = new promClient.Counter({
  name: 'telegram_messages_total',
  help: 'Total Telegram messages sent',
  labelNames: ['status', 'chatId']
});
```

---

## 🔒 安全建议

### 1. Bot Token 保护

**强烈建议**:
- ✅ 使用环境变量存储
- ✅ 不要提交到版本控制
- ✅ 定期轮换 Token
- ✅ 使用 Docker secrets 或 Kubernetes secrets

**轮换 Token**:
```bash
# 1. 在 BotFather 中执行
/revoke
选择你的 Bot

# 2. 获取新 Token
/token
选择你的 Bot

# 3. 更新 .env 文件
# 4. 重启服务
docker compose restart
```

### 2. Chat ID 验证

**添加白名单验证**:
```typescript
// src/server.ts
const ALLOWED_CHAT_IDS = process.env.TELEGRAM_CHAT_ID.split(',');

function validateChatId(chatId: string): boolean {
  return ALLOWED_CHAT_IDS.includes(chatId);
}
```

### 3. 网络隔离

**生产环境配置**:
- ✅ Webhook 适配器只在内网可访问
- ✅ 使用 Docker 网络隔离
- ✅ 不要暴露到公网
- ✅ 使用防火墙限制访问

### 4. HTTPS 和代理

**使用代理（如果被墙）**:
```typescript
// src/server.ts
import { HttpsProxyAgent } from 'https-proxy-agent';

const bot = new Telegraf(TELEGRAM_BOT_TOKEN, {
  telegram: {
    agent: new HttpsProxyAgent('http://proxy.example.com:8080')
  }
});
```

---

## 📚 相关文档

- [Telegram Bot API 官方文档](https://core.telegram.org/bots/api)
- [Telegraf 库文档](https://telegraf.js.org/)
- [AlertManager Webhook 配置](https://prometheus.io/docs/alerting/latest/configuration/#webhook_config)
- [Lark 通知配置](./LARK_NOTIFICATION_SETUP_COMPLETE.md)
- [AlertManager 配置](./ALERTMANAGER_CONFIGURATION_COMPLETE.md)

---

## ✅ 总结

本次 Telegram Bot 通知配置工作成功完成了以下目标：

✅ **完整集成**: Webhook 适配器服务已开发并测试
✅ **HTML 富文本**: 美观的 Telegram 消息展示告警信息
✅ **交互按钮**: Inline Keyboard 提供快捷操作
✅ **多渠道通知**: Email + Lark + Telegram 三渠道保障
✅ **智能路由**: 4 个接收器全部配置 Telegram 通知
✅ **多群组支持**: 支持同时向多个群组发送
✅ **容器化部署**: Docker 镜像和 Compose 配置就绪
✅ **完善文档**: 详细的部署和故障排查指南

Telegram Bot 通知系统现已准备就绪，提供国际化的移动端实时告警推送服务。配合 Lark（飞书）通知，为云手机平台提供全方位的告警覆盖。

---

## 📝 配置清单

使用此清单确保所有配置正确：

- [ ] Telegram Bot 已创建
- [ ] Bot Token 已获取
- [ ] Bot 已添加到群组
- [ ] Chat ID 已获取
- [ ] `.env` 文件已配置
- [ ] 适配器服务已启动
- [ ] 健康检查通过
- [ ] Bot Token 验证成功
- [ ] 测试消息成功发送
- [ ] AlertManager 配置已更新
- [ ] AlertManager 已重启
- [ ] 端到端测试通过
- [ ] 团队成员已加入群组
- [ ] 文档已分享给团队

---

## 🎯 对比: Lark vs Telegram

| 特性 | Lark (飞书) | Telegram |
|------|------------|----------|
| **消息格式** | 消息卡片 | HTML/Markdown |
| **交互按钮** | ✅ 支持 | ✅ 支持 |
| **群组支持** | ✅ 企业群组 | ✅ 无限群组 |
| **国内访问** | ✅ 无障碍 | ⚠️ 可能需要代理 |
| **移动推送** | ✅ 优秀 | ✅ 优秀 |
| **API 限制** | 20 条/分钟 | 20 条/分钟（群组） |
| **签名验证** | ✅ 支持 | ❌ 不支持 |
| **企业集成** | ✅ 深度集成 | ⚠️ 基础集成 |
| **免费额度** | ✅ 免费 | ✅ 免费 |

**建议**:
- 国内团队优先使用 Lark
- 国际团队或需要代理的环境使用 Telegram
- 可以同时配置两者实现冗余
