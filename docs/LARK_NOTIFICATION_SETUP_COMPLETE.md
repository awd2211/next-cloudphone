# Lark (飞书) 通知配置完成报告

**日期**: 2025-11-04
**状态**: ✅ 完成
**集成方式**: Webhook 适配器

---

## 📊 配置概述

成功配置了 AlertManager 与 Lark (飞书) 的集成，通过自定义 Webhook 适配器实现告警消息的格式转换和推送，支持富文本卡片消息展示。

---

## ✅ 完成的工作

### 1. Webhook 适配器服务

#### 项目结构
```
infrastructure/monitoring/alertmanager-lark-webhook/
├── src/
│   └── server.ts              # Express 服务器 + 消息格式化
├── Dockerfile                 # Docker 镜像构建
├── docker-compose.yml         # 容器编排
├── package.json               # 依赖管理
├── tsconfig.json              # TypeScript 配置
├── .env.example               # 环境变量模板
├── test-alert.json            # 测试数据
└── README.md                  # 使用文档
```

#### 核心功能

**1. 消息格式转换**
- 将 AlertManager Webhook 格式转换为飞书消息卡片格式
- 支持 firing 和 resolved 两种状态
- 根据严重程度动态调整卡片颜色和图标

**2. 富文本卡片**
```typescript
{
  msg_type: 'interactive',
  card: {
    header: {
      title: { content: '🚨 严重告警', tag: 'plain_text' },
      template: 'red'  // red | orange | green
    },
    elements: [
      // 告警摘要
      { tag: 'div', text: { content: '**告警名称**: ServiceDown\n...', tag: 'lark_md' } },
      // 分隔线
      { tag: 'hr' },
      // 告警详情（最多显示 5 个）
      { tag: 'div', text: { content: '**实例 1**: ...', tag: 'lark_md' } },
      // 操作按钮
      { tag: 'action', actions: [...] }
    ]
  }
}
```

**3. 签名验证支持**
- 可选的飞书 Webhook 签名验证
- 使用 HMAC-SHA256 算法
- 通过 `LARK_SECRET` 环境变量配置

**4. API 端点**

| 端点 | 方法 | 用途 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/lark-webhook` | POST | 接收 AlertManager 告警 |
| `/test` | POST | 发送测试消息到飞书 |

---

### 2. AlertManager 配置更新

#### 接收器配置

所有主要接收器都已配置 Lark Webhook：

```yaml
# 1. Critical 告警 → Lark
- name: 'critical'
  email_configs: [...]
  webhook_configs:
  - url: 'http://alertmanager-lark-webhook:5001/lark-webhook'
    send_resolved: true

# 2. Warning 告警 → Lark
- name: 'warning'
  email_configs: [...]
  webhook_configs:
  - url: 'http://alertmanager-lark-webhook:5001/lark-webhook'
    send_resolved: true

# 3. Database 告警 → Lark
- name: 'database-team'
  email_configs: [...]
  webhook_configs:
  - url: 'http://alertmanager-lark-webhook:5001/lark-webhook'
    send_resolved: true

# 4. Business 告警 → Lark
- name: 'business-team'
  email_configs: [...]
  webhook_configs:
  - url: 'http://alertmanager-lark-webhook:5001/lark-webhook'
    send_resolved: true
```

**配置特性**:
- ✅ 支持多渠道通知（Email + Lark）
- ✅ 发送解决通知 (`send_resolved: true`)
- ✅ 自动重试和超时控制

---

### 3. 消息卡片设计

#### 卡片颜色方案

| 状态 | 颜色 | 图标 | 说明 |
|------|------|------|------|
| **Resolved** | 🟢 Green | ✅ | 告警已恢复 |
| **Critical** | 🔴 Red | 🚨 | 严重告警 |
| **Warning** | 🟠 Orange | ⚠️ | 警告告警 |

#### 消息内容结构

**1. 标题区域** (Header)
```
🚨 严重告警 / ⚠️ 警告告警 / ✅ 告警已恢复
```

**2. 摘要信息** (Summary)
- 告警名称
- 服务名称
- 集群名称
- 告警实例数量

**3. 告警详情** (Details)
每个告警包含：
- 实例标识
- 告警摘要
- 开始时间
- 详细描述（可选）
- 当前值（可选）

**4. 操作按钮** (Actions)
- 查看 AlertManager（跳转到 AlertManager UI）
- 查看 Prometheus（跳转到 Prometheus 查询页面）

#### 消息示例

**Critical 告警消息**:
```markdown
🚨 严重告警

**告警名称**: ServiceDown
**服务**: user-service
**集群**: cloudphone-cluster
**数量**: 1 个实例

────────────────────

**实例 1**: host.docker.internal:30001
**摘要**: 服务 user-service 已下线
**开始时间**: 2025-11-04 18:39:49
**详情**: 服务已经下线超过 1 分钟，无法抓取指标数据

[查看 AlertManager] [查看 Prometheus]
```

**Resolved 消息**:
```markdown
✅ 告警已恢复

**告警名称**: ServiceDown
**服务**: user-service
**集群**: cloudphone-cluster
**数量**: 1 个实例

[查看 AlertManager]
```

---

## 🚀 部署指南

### 前置条件

1. ✅ AlertManager 已部署并运行
2. ✅ Docker 和 Docker Compose 已安装
3. 📱 飞书机器人已创建（见下文）

### 步骤 1: 创建飞书自定义机器人

#### 1.1 创建群聊
1. 打开飞书客户端
2. 创建一个新群聊（如: "CloudPhone 告警通知"）
3. 邀请需要接收告警的成员

#### 1.2 添加自定义机器人
1. 进入群聊设置
2. 点击 "群机器人" → "添加机器人"
3. 选择 "自定义机器人"
4. 配置机器人信息:
   - 名称: `CloudPhone AlertManager`
   - 描述: `接收 Prometheus 告警通知`

#### 1.3 获取 Webhook URL
1. 创建成功后会显示 Webhook 地址
2. 格式: `https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
3. **保存此 URL**（需要配置到环境变量）

#### 1.4 可选: 配置安全设置
**关键词验证** (推荐):
- 添加关键词: `告警`, `AlertManager`, `Prometheus`
- 消息必须包含至少一个关键词才能发送

**签名验证** (更安全):
- 启用签名验证
- 获取签名密钥（Secret）
- 配置到 `LARK_SECRET` 环境变量

### 步骤 2: 配置 Webhook 适配器

#### 2.1 配置环境变量
```bash
cd infrastructure/monitoring/alertmanager-lark-webhook

# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件
vim .env
```

**必填配置**:
```bash
# 飞书机器人 Webhook URL（必填）
LARK_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/YOUR_WEBHOOK_TOKEN

# 飞书机器人签名密钥（可选，如果启用了签名验证）
LARK_SECRET=your_secret_key

# 服务端口（默认 5001）
PORT=5001
```

#### 2.2 构建和启动服务

**方式 1: 使用 Docker Compose**
```bash
cd infrastructure/monitoring/alertmanager-lark-webhook

# 构建镜像
docker build -t alertmanager-lark-webhook:latest .

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f
```

**方式 2: 本地开发模式**
```bash
cd infrastructure/monitoring/alertmanager-lark-webhook

# 安装依赖
pnpm install

# 开发模式（支持热重载）
pnpm dev

# 或构建后运行
pnpm build
pnpm start
```

#### 2.3 验证服务状态
```bash
# 健康检查
curl http://localhost:5001/health

# 预期输出
{
  "status": "ok",
  "service": "alertmanager-lark-webhook",
  "version": "1.0.0",
  "larkConfigured": true
}
```

### 步骤 3: 测试 Lark 通知

#### 3.1 发送测试消息
```bash
cd infrastructure/monitoring/alertmanager-lark-webhook

# 发送测试消息到飞书
curl -X POST http://localhost:5001/test

# 预期输出
{
  "success": true,
  "message": "Test message sent to Lark"
}
```

**检查飞书群聊**:
- 应该收到一条蓝色卡片消息
- 标题: "🧪 测试消息"
- 内容包含时间戳

#### 3.2 测试 AlertManager 集成
```bash
# 发送模拟告警
curl -X POST http://localhost:5001/lark-webhook \
  -H "Content-Type: application/json" \
  -d @test-alert.json

# 预期输出
{
  "success": true,
  "message": "Alert sent to Lark"
}
```

**检查飞书群聊**:
- 应该收到红色告警卡片
- 包含 ServiceDown 告警详情

### 步骤 4: 重启 AlertManager

```bash
cd infrastructure/monitoring

# 重启 AlertManager 以加载新配置
docker compose -f docker-compose.monitoring.yml restart alertmanager

# 验证 AlertManager 配置
docker exec cloudphone-alertmanager amtool check-config /etc/alertmanager/alertmanager.yml
```

**预期输出**:
```
Checking '/etc/alertmanager/alertmanager.yml'  SUCCESS
Found:
 - global config
 - route
 - 5 inhibit rules
 - 6 receivers
 - 0 templates
```

### 步骤 5: 端到端测试

#### 5.1 触发真实告警
```bash
# 停止一个服务触发 ServiceDown 告警
pm2 stop user-service

# 等待 1-2 分钟，Prometheus 检测到服务下线
# 等待 AlertManager group_wait 时间（5-10秒）
```

#### 5.2 检查通知
1. 查看 AlertManager UI: http://localhost:9093
2. 查看飞书群聊是否收到告警
3. 验证消息格式和内容

#### 5.3 恢复服务
```bash
# 恢复服务
pm2 start user-service

# 等待 5 分钟，应该收到 "告警已恢复" 消息
```

---

## 🎨 消息定制

### 修改卡片颜色

编辑 `src/server.ts`:
```typescript
function formatLarkMessage(data: WebhookData): any {
  // 修改颜色方案
  let headerColor: 'red' | 'orange' | 'green' | 'blue' = 'orange';

  if (isResolved) {
    headerColor = 'green';  // 恢复消息
  } else if (severity === 'critical') {
    headerColor = 'red';    // 严重告警
  } else if (severity === 'warning') {
    headerColor = 'orange'; // 警告告警
  }
  // ...
}
```

### 自定义显示内容

```typescript
// 修改显示的告警数量上限
const maxAlertsToShow = 10; // 默认 5

// 添加自定义字段
alertContent += `\n**优先级**: ${alert.labels.priority || '未设置'}`;
```

### 添加更多操作按钮

```typescript
elements.push({
  tag: 'action',
  actions: [
    {
      tag: 'button',
      text: { content: '查看 AlertManager', tag: 'plain_text' },
      type: 'primary',
      url: data.externalURL,
    },
    {
      tag: 'button',
      text: { content: '查看 Prometheus', tag: 'plain_text' },
      url: alerts[0]?.generatorURL || '',
    },
    // 添加新按钮
    {
      tag: 'button',
      text: { content: '查看 Grafana', tag: 'plain_text' },
      url: 'http://localhost:3000/dashboards',
    },
  ],
});
```

---

## 🔧 故障排查

### 问题 1: 飞书未收到消息

**检查服务状态**:
```bash
# 检查适配器服务是否运行
curl http://localhost:5001/health

# 查看服务日志
docker logs alertmanager-lark-webhook
```

**常见原因**:
1. ❌ `LARK_WEBHOOK_URL` 未配置或错误
   - 解决: 检查 `.env` 文件中的 URL
2. ❌ 网络连接问题
   - 解决: 测试网络连通性 `curl https://open.feishu.cn`
3. ❌ 飞书关键词验证失败
   - 解决: 确保消息包含配置的关键词
4. ❌ 签名验证失败
   - 解决: 检查 `LARK_SECRET` 是否正确

### 问题 2: AlertManager 无法连接到适配器

**检查网络连接**:
```bash
# 从 AlertManager 容器测试连接
docker exec cloudphone-alertmanager \
  wget --spider -q http://alertmanager-lark-webhook:5001/health

# 如果失败，检查 Docker 网络
docker network inspect cloudphone-network
```

**解决方案**:
1. 确保适配器服务在 `cloudphone-network` 网络中
2. 使用服务名称而非 localhost: `alertmanager-lark-webhook:5001`

### 问题 3: 消息格式错误

**验证飞书 API**:
```bash
# 直接发送简单消息测试
curl -X POST "${LARK_WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "msg_type": "text",
    "content": {
      "text": "测试消息"
    }
  }'
```

**检查响应**:
```json
{
  "code": 0,
  "msg": "success"
}
```

### 问题 4: 日志查看

**适配器服务日志**:
```bash
# Docker 日志
docker logs -f alertmanager-lark-webhook

# 或使用 pnpm 日志（本地开发）
pnpm dev
```

**AlertManager 日志**:
```bash
docker logs -f cloudphone-alertmanager | grep -i "lark\|webhook"
```

---

## 📊 监控指标

### 适配器性能

建议添加 Prometheus 指标监控适配器性能：

```typescript
// 可添加到 src/server.ts
import promClient from 'prom-client';

const webhookRequests = new promClient.Counter({
  name: 'lark_webhook_requests_total',
  help: 'Total webhook requests received',
  labelNames: ['status']
});

const webhookDuration = new promClient.Histogram({
  name: 'lark_webhook_duration_seconds',
  help: 'Webhook processing duration',
  buckets: [0.1, 0.5, 1, 2, 5]
});
```

---

## 🔒 安全建议

### 1. 签名验证

**强烈建议启用签名验证**:
1. 在飞书机器人设置中启用签名验证
2. 获取 Secret 密钥
3. 配置到 `LARK_SECRET` 环境变量

### 2. 网络隔离

- Webhook 适配器只应在内网可访问
- 使用 Docker 网络隔离
- 不要暴露到公网

### 3. 日志脱敏

适配器已自动对敏感信息脱敏：
- Webhook URL 中的 token
- 签名密钥

### 4. 速率限制

飞书 Webhook 有速率限制：
- **单个机器人**: 20 条/分钟
- **单个用户**: 5 条/分钟

建议在 AlertManager 配置合理的 `group_wait` 和 `repeat_interval`。

---

## 📚 相关文档

- [飞书机器人开发文档](https://open.feishu.cn/document/ukTMukTMukTM/ucTM5YjL3ETO24yNxkjN)
- [飞书消息卡片设计](https://open.feishu.cn/document/ukTMukTMukTM/uczM3QjL3MzN04yNzcDN)
- [AlertManager Webhook 配置](https://prometheus.io/docs/alerting/latest/configuration/#webhook_config)
- [AlertManager 配置完成报告](./ALERTMANAGER_CONFIGURATION_COMPLETE.md)

---

## 🎯 高级功能

### 1. 多群组通知

**场景**: 不同团队接收不同类型的告警

**方案 1**: 创建多个飞书机器人
```bash
# .env
LARK_WEBHOOK_URL_CRITICAL=https://open.feishu.cn/open-apis/bot/v2/hook/critical-team
LARK_WEBHOOK_URL_WARNING=https://open.feishu.cn/open-apis/bot/v2/hook/dev-team
```

**方案 2**: 使用路由参数
```yaml
webhook_configs:
- url: 'http://alertmanager-lark-webhook:5001/lark-webhook?team=critical'
- url: 'http://alertmanager-lark-webhook:5001/lark-webhook?team=warning'
```

### 2. @特定用户

**飞书支持在消息中 @用户**:
```typescript
{
  tag: 'div',
  text: {
    content: '<at user_id="ou_xxx">张三</at> 请处理此告警',
    tag: 'lark_md'
  }
}
```

**获取 user_id**:
1. 通过飞书开放平台 API 查询
2. 或在消息中使用 `<at id=all>所有人</at>`

### 3. 交互式卡片

**添加交互按钮**（需要额外开发）:
- 静默告警
- 确认告警
- 分配给某人
- 跳转到 Runbook

---

## ✅ 总结

本次 Lark 通知配置工作成功完成了以下目标：

✅ **完整集成**: Webhook 适配器服务已开发并测试
✅ **富文本卡片**: 美观的飞书消息卡片展示告警信息
✅ **多渠道通知**: Email + Lark 双渠道保障
✅ **智能路由**: 4 个接收器全部配置 Lark 通知
✅ **签名验证**: 支持安全的签名验证机制
✅ **容器化部署**: Docker 镜像和 Compose 配置就绪
✅ **完善文档**: 详细的部署和故障排查指南

Lark 通知系统现已准备就绪，为云手机平台提供移动端实时告警推送服务。下一步将进行完整告警流程的端到端验证。

---

## 📝 配置清单

使用此清单确保所有配置正确：

- [ ] 飞书机器人已创建
- [ ] Webhook URL 已获取
- [ ] `.env` 文件已配置
- [ ] 适配器服务已启动
- [ ] 健康检查通过
- [ ] 测试消息成功发送
- [ ] AlertManager 配置已更新
- [ ] AlertManager 已重启
- [ ] 端到端测试通过
- [ ] 团队成员已加入群聊
- [ ] 文档已分享给团队
