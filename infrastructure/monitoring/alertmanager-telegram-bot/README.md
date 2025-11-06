# AlertManager Telegram Bot 集成

## 概述

本目录包含 AlertManager 与 Telegram Bot 集成的 Webhook 适配器服务。将 AlertManager 的 Webhook 请求转换为 Telegram Bot API 接受的格式，支持富文本消息和交互按钮。

## 架构

```
Prometheus → AlertManager → Webhook 适配器 → Telegram Bot API → Telegram 群组/频道
```

## 快速开始

### 1. 创建 Telegram Bot

1. 在 Telegram 中找到 [@BotFather](https://t.me/botfather)
2. 发送 `/newbot` 命令创建新机器人
3. 按提示设置机器人名称和用户名
4. 获取 Bot Token（格式：`123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`）
5. **保存此 Token**（需要配置到环境变量）

### 2. 获取 Chat ID

#### 方法 1: 群组 Chat ID

1. 将 Bot 添加到 Telegram 群组
2. 发送一条消息到群组（如：`/start`）
3. 访问 `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. 在响应中找到 `"chat":{"id":-123456789}`
5. 群组 Chat ID 是负数（如：`-123456789`）

#### 方法 2: 私聊 Chat ID

1. 在 Telegram 中搜索你的 Bot
2. 发送 `/start` 消息
3. 访问 `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. 找到 `"chat":{"id":123456789}`
5. 私聊 Chat ID 是正数

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件
```

**必填配置**:
```bash
# Telegram Bot Token（必填）
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Telegram Chat ID（必填，可以是群组或私聊）
# 多个 Chat ID 用逗号分隔
TELEGRAM_CHAT_ID=-123456789,-987654321

# 服务端口（可选，默认 5002）
PORT=5002
```

### 4. 启动适配器服务

```bash
# 使用 Docker Compose
docker-compose up -d

# 或使用 Node.js
pnpm install
pnpm start
```

### 5. 测试 Telegram 通知

```bash
# 健康检查
curl http://localhost:5002/health

# 发送测试消息
curl -X POST http://localhost:5002/test

# 测试告警消息
curl -X POST http://localhost:5002/telegram-webhook \
  -H "Content-Type: application/json" \
  -d @test-alert.json
```

## 配置文件

### AlertManager 配置

在 `alertmanager.yml` 中配置 Telegram 接收器：

```yaml
receivers:
- name: 'telegram-critical'
  webhook_configs:
  - url: 'http://alertmanager-telegram-bot:5002/telegram-webhook'
    send_resolved: true
    http_config:
      follow_redirects: true
```

### 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token | `123456:ABC-DEF...` |
| `TELEGRAM_CHAT_ID` | Chat ID（可多个，逗号分隔） | `-123456789,-987654321` |
| `PORT` | 服务监听端口 | `5002` |
| `PARSE_MODE` | 消息解析模式 | `HTML` 或 `Markdown` |

## 消息格式

Webhook 适配器会将 AlertManager 告警转换为 Telegram 富文本消息：

**Critical 告警消息**:
```
🚨 严重告警

告警名称: ServiceDown
服务: user-service
集群: cloudphone-cluster
状态: FIRING
数量: 1 个实例

───────────────────
📍 实例 1
• host.docker.internal:30001
• 服务已下线超过 1 分钟
• 开始时间: 2025-11-04 18:39:49

[查看 AlertManager] [查看 Prometheus]
```

**Resolved 消息**:
```
✅ 告警已恢复

告警名称: ServiceDown
服务: user-service
集群: cloudphone-cluster
解决时间: 2025-11-04 18:45:30

[查看详情]
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/telegram-webhook` | POST | 接收 AlertManager 告警 |
| `/test` | POST | 发送测试消息到 Telegram |

## 消息特性

### 1. 富文本格式

使用 HTML 格式化消息：
- **粗体**: `<b>文本</b>`
- *斜体*: `<i>文本</i>`
- `代码`: `<code>文本</code>`
- 链接: `<a href="url">文本</a>`

### 2. 交互按钮

使用 Inline Keyboard 提供快捷操作：
```javascript
{
  inline_keyboard: [
    [
      { text: '查看 AlertManager', url: 'http://...' },
      { text: '查看 Prometheus', url: 'http://...' }
    ]
  ]
}
```

### 3. 表情图标

根据告警严重程度显示不同图标：
- 🚨 Critical (严重)
- ⚠️ Warning (警告)
- ✅ Resolved (已恢复)

### 4. 消息长度限制

Telegram 消息限制：
- 文本消息: 4096 字符
- 如果超过限制，会自动截断并显示提示

## 开发

### 项目结构

```
alertmanager-telegram-bot/
├── src/
│   ├── server.ts              # Express 服务器
│   ├── telegram-formatter.ts  # 消息格式化
│   └── telegram-client.ts     # Telegram API 客户端
├── test/
│   ├── test-alert.json        # 测试数据
│   └── integration.test.ts    # 集成测试
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

### 运行测试

```bash
pnpm test
```

### 构建 Docker 镜像

```bash
docker build -t alertmanager-telegram-bot:latest .
```

## 故障排查

### 1. 消息发送失败

**检查 Bot Token**:
```bash
# 验证 Token 是否有效
curl https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe
```

**常见错误**:
- `401 Unauthorized`: Bot Token 错误
- `400 Bad Request: chat not found`: Chat ID 错误
- `403 Forbidden: bot was blocked by the user`: Bot 被用户屏蔽

### 2. 无法接收消息

**检查 Bot 权限**:
1. 确保 Bot 已添加到群组
2. 群组管理员需要给 Bot 发送消息权限
3. 对于频道，Bot 需要是管理员

### 3. Chat ID 获取失败

**使用脚本获取**:
```bash
# 发送消息后运行
curl https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates | jq '.result[].message.chat.id'
```

### 4. 服务日志

```bash
# 查看服务日志
docker logs -f alertmanager-telegram-bot

# 或本地开发
pnpm dev
```

## 高级功能

### 1. 多群组通知

配置多个 Chat ID 向不同群组发送：
```bash
TELEGRAM_CHAT_ID=-123456789,-987654321,-111222333
```

### 2. 消息模板

自定义消息模板（编辑 `src/telegram-formatter.ts`）：
```typescript
const customTemplate = `
🔔 <b>${alertName}</b>

📊 服务: ${service}
🎯 严重程度: ${severity}
⏰ 时间: ${timestamp}

${description}
`;
```

### 3. 静默时间

配置静默时间避免夜间打扰（可在 AlertManager 中配置）：
```yaml
time_intervals:
  - name: 'working-hours'
    time_intervals:
      - weekdays: ['monday:friday']
        times:
          - start_time: '09:00'
            end_time: '18:00'
```

### 4. 消息线程

对于群组，可以使用消息线程功能：
```typescript
await bot.sendMessage(chatId, text, {
  reply_to_message_id: threadId  // 回复特定消息创建线程
});
```

## 安全建议

### 1. Bot Token 保护

- ✅ 使用环境变量存储 Token
- ✅ 不要提交到版本控制
- ✅ 定期轮换 Token

### 2. Chat ID 验证

```typescript
// 只允许特定 Chat ID 接收消息
const allowedChatIds = process.env.TELEGRAM_CHAT_ID.split(',');
if (!allowedChatIds.includes(chatId)) {
  throw new Error('Unauthorized chat ID');
}
```

### 3. 速率限制

Telegram Bot API 速率限制：
- **群组消息**: 20 条/分钟
- **私聊消息**: 30 条/秒

建议配置 AlertManager 的 `group_wait` 和 `repeat_interval` 避免超限。

### 4. HTTPS 配置

生产环境建议使用 HTTPS：
```typescript
app.use(helmet());  // 安全头
app.use(cors());    // CORS 配置
```

## 参考资料

- [Telegram Bot API 文档](https://core.telegram.org/bots/api)
- [Telegram Bot 开发指南](https://core.telegram.org/bots)
- [AlertManager Webhook 配置](https://prometheus.io/docs/alerting/latest/configuration/#webhook_config)

## 常见问题

**Q: 如何创建 Telegram 频道通知？**
A:
1. 创建公开或私有频道
2. 将 Bot 添加为频道管理员
3. 获取频道 Chat ID（通常是 `-100` 开头的负数）

**Q: 如何添加消息按钮回调？**
A: Telegram 支持回调查询，需要额外配置 Webhook 接收回调

**Q: 消息格式如何自定义？**
A: 编辑 `src/telegram-formatter.ts` 中的模板

**Q: 如何发送图片或文件？**
A: 使用 `sendPhoto` 或 `sendDocument` API（需要额外开发）

## 示例配置

### 完整的 AlertManager 配置

```yaml
receivers:
- name: 'telegram-all'
  webhook_configs:
  - url: 'http://alertmanager-telegram-bot:5002/telegram-webhook'
    send_resolved: true

- name: 'telegram-critical'
  webhook_configs:
  - url: 'http://alertmanager-telegram-bot:5002/telegram-webhook?priority=critical'
    send_resolved: true

route:
  routes:
  - match:
      severity: critical
    receiver: 'telegram-critical'
  - match:
      severity: warning
    receiver: 'telegram-all'
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## License

MIT
