# AlertManager Lark (飞书) Webhook 集成

## 概述

本目录包含 AlertManager 与 Lark (飞书) 集成的 Webhook 适配器服务。由于 AlertManager 原生不支持飞书的消息格式，需要一个中间服务将 AlertManager 的 Webhook 请求转换为飞书机器人接受的格式。

## 架构

```
Prometheus → AlertManager → Webhook 适配器 → Lark 机器人
```

## 快速开始

### 1. 获取飞书 Webhook URL

1. 登录飞书管理后台
2. 创建自定义机器人
3. 获取 Webhook URL（格式: `https://open.feishu.cn/open-apis/bot/v2/hook/xxx`）
4. 可选：配置自定义关键词或签名验证

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 Lark Webhook URL
```

### 3. 启动 Webhook 适配器

```bash
# 使用 Docker
docker-compose up -d

# 或使用 Node.js
pnpm install
pnpm start
```

### 4. 测试 Webhook

```bash
curl -X POST http://localhost:5001/lark-webhook \
  -H "Content-Type: application/json" \
  -d @test-alert.json
```

## 配置文件

### AlertManager 配置

在 `alertmanager.yml` 中配置飞书接收器：

```yaml
receivers:
- name: 'lark-critical'
  webhook_configs:
  - url: 'http://alertmanager-lark-webhook:5001/lark-webhook'
    send_resolved: true
    http_config:
      follow_redirects: true
```

### 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `LARK_WEBHOOK_URL` | 飞书机器人 Webhook URL | `https://open.feishu.cn/open-apis/bot/v2/hook/xxx` |
| `LARK_SECRET` | 可选：签名密钥 | `xxx` |
| `PORT` | 服务监听端口 | `5001` |

## 消息格式

Webhook 适配器会将 AlertManager 告警转换为飞书消息卡片格式：

```json
{
  "msg_type": "interactive",
  "card": {
    "header": {
      "title": {
        "content": "🚨 告警通知",
        "tag": "plain_text"
      },
      "template": "red"
    },
    "elements": [
      {
        "tag": "div",
        "text": {
          "content": "**告警名称**: ServiceDown\n**严重程度**: critical\n**服务**: user-service",
          "tag": "lark_md"
        }
      }
    ]
  }
}
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/lark-webhook` | POST | 接收 AlertManager 告警 |
| `/test` | POST | 发送测试消息到飞书 |

## 开发

### 项目结构

```
alertmanager-lark-webhook/
├── src/
│   ├── server.ts           # Express 服务器
│   ├── lark-formatter.ts   # 飞书消息格式化
│   └── alert-processor.ts  # 告警处理逻辑
├── test/
│   ├── test-alert.json     # 测试数据
│   └── integration.test.ts # 集成测试
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
docker build -t alertmanager-lark-webhook:latest .
```

## 故障排查

### 1. 消息发送失败

检查日志：
```bash
docker logs alertmanager-lark-webhook
```

常见问题：
- Webhook URL 错误
- 网络连接问题
- 签名验证失败

### 2. 消息格式错误

验证飞书 Webhook：
```bash
curl -X POST "${LARK_WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d '{"msg_type":"text","content":{"text":"test"}}'
```

## 参考资料

- [飞书机器人开发文档](https://open.feishu.cn/document/ukTMukTMukTM/ucTM5YjL3ETO24yNxkjN)
- [AlertManager Webhook 配置](https://prometheus.io/docs/alerting/latest/configuration/#webhook_config)
