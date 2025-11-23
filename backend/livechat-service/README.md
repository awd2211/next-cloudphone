# LiveChat Service (在线客服系统)

云手机平台在线客服微服务，提供实时聊天、智能排队、AI 辅助、设备远程协助等功能。

## 功能特性

### 核心功能
- **实时聊天**: 基于 WebSocket (Socket.IO) 的实时消息通信
- **AI 智能客服**: OpenAI 集成，支持意图分类、回复建议、自动回复
- **多媒体消息**: 支持图片、文件、语音消息上传 (MinIO 存储)
- **会话转工单**: 复杂问题可转工单由专业人员处理
- **设备远程协助**: 客服可远程查看用户设备状态、执行 ADB 命令

### 客服管理
- **多客服分组**: 按技能/业务划分客服分组
- **智能排队分配**: 5 种路由策略 (Round Robin, Least Busy, Skill-based, Priority, Random)
- **绩效统计分析**: 响应时间、解决率、评分等指标
- **会话质检**: 敏感词检测、人工质检评分

### 存储与安全
- **消息永久存储**: PostgreSQL 持久化
- **定期清理策略**: 可配置的归档和删除周期
- **端到端加密**: AES-256-GCM 消息加密
- **合规审计**: 完整的操作日志

## 技术栈

- **框架**: NestJS (TypeScript)
- **数据库**: PostgreSQL + TypeORM
- **缓存**: Redis
- **消息队列**: RabbitMQ
- **实时通信**: Socket.IO
- **文件存储**: MinIO
- **AI 服务**: OpenAI API

## API 路由

所有 API 路由使用 `/livechat` 前缀，便于区分服务归属：

| 模块 | 路由前缀 | 功能 |
|------|----------|------|
| Chat | `/livechat/chat` | 会话管理、消息收发 |
| Agents | `/livechat/agents` | 客服管理、分组、快捷回复 |
| Queues | `/livechat/queues` | 排队配置、统计 |
| AI | `/livechat/ai` | 意图分类、回复建议 |
| Analytics | `/livechat/analytics` | 数据统计、趋势分析 |
| Quality | `/livechat/quality` | 质检评分、敏感词 |
| Archives | `/livechat/archives` | 消息归档、搜索 |
| Device Assist | `/livechat/device-assist` | 设备协助 |
| Tickets | `/livechat/tickets` | 会话转工单 |
| Media | `/livechat/media` | 文件上传 |

## 快速开始

### 1. 安装依赖

```bash
cd backend/livechat-service
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

关键配置项：
- `JWT_SECRET`: 必须与其他服务一致
- `DB_DATABASE`: `cloudphone_livechat`
- `OPENAI_API_KEY`: AI 功能所需
- `ENCRYPTION_KEY`: 32 字符加密密钥

### 3. 初始化数据库

```bash
# 创建数据库
psql -U postgres -c "CREATE DATABASE cloudphone_livechat;"

# 应用迁移
psql -U postgres -d cloudphone_livechat < migrations/001_initial_schema.sql

# (可选) 导入示例数据
psql -U postgres -d cloudphone_livechat < scripts/init-sample-data.sql
```

### 4. 启动服务

```bash
# 开发模式
pnpm dev

# 生产模式
pnpm build
pnpm start:prod
```

### 5. 验证服务

```bash
# 健康检查
curl http://localhost:30010/health

# API 文档
open http://localhost:30010/docs

# 运行测试脚本
./scripts/test-api.sh YOUR_JWT_TOKEN
```

## WebSocket 连接

### 连接示例

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:30010/livechat', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

// 监听新消息
socket.on('message:new', (message) => {
  console.log('收到消息:', message);
});

// 发送消息
socket.emit('message:send', {
  conversationId: 'xxx',
  content: '你好',
  type: 'text'
});
```

### 事件列表

**客户端发送:**
- `conversation:create` - 创建会话
- `conversation:join` - 加入会话
- `message:send` - 发送消息
- `message:read` - 标记已读
- `typing:start` / `typing:stop` - 输入状态

**服务端推送:**
- `message:new` - 新消息
- `conversation:updated` - 会话更新
- `agent:assigned` - 客服分配
- `queue:position` - 排队位置

## API 端点

### Chat 模块

```
GET    /livechat/chat/conversations          - 获取会话列表
POST   /livechat/chat/conversations          - 创建新会话
GET    /livechat/chat/conversations/:id      - 获取会话详情
PUT    /livechat/chat/conversations/:id      - 更新会话
GET    /livechat/chat/conversations/:id/messages - 获取消息历史
POST   /livechat/chat/conversations/:id/assign   - 分配客服
POST   /livechat/chat/conversations/:id/transfer - 转接会话
POST   /livechat/chat/conversations/:id/close    - 关闭会话
GET    /livechat/chat/stats/waiting          - 等待队列统计
GET    /livechat/chat/stats/active           - 活跃会话统计
```

### Agents 模块

```
GET    /livechat/agents                      - 客服列表
POST   /livechat/agents                      - 创建客服
GET    /livechat/agents/me                   - 当前客服信息
PUT    /livechat/agents/me/status            - 更新状态
GET    /livechat/agents/available            - 可用客服
GET    /livechat/agents/groups/list          - 分组列表
POST   /livechat/agents/groups               - 创建分组
GET    /livechat/agents/canned-responses/list - 快捷回复列表
POST   /livechat/agents/canned-responses     - 创建快捷回复
```

### Analytics 模块

```
GET    /livechat/analytics/overview          - 概览统计
GET    /livechat/analytics/trends            - 会话趋势
GET    /livechat/analytics/agents            - 客服绩效
GET    /livechat/analytics/ratings           - 评分分布
GET    /livechat/analytics/peak-hours        - 高峰时段
```

## 排队策略

| 策略 | 说明 |
|------|------|
| `ROUND_ROBIN` | 轮询分配 |
| `LEAST_BUSY` | 最空闲优先 |
| `SKILL_BASED` | 技能匹配 |
| `PRIORITY` | 优先级分配 |
| `RANDOM` | 随机分配 |

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `30010` |
| `DB_DATABASE` | 数据库名 | `cloudphone_livechat` |
| `JWT_SECRET` | JWT 密钥 | - |
| `AI_ENABLED` | 启用 AI | `true` |
| `OPENAI_API_KEY` | OpenAI 密钥 | - |
| `ENCRYPTION_ENABLED` | 启用加密 | `true` |
| `ENCRYPTION_KEY` | 加密密钥 (32字符) | - |
| `QUEUE_MAX_WAIT_TIME` | 最大等待时间(秒) | `300` |
| `SESSION_IDLE_TIMEOUT` | 会话空闲超时(秒) | `600` |
| `ARCHIVE_AFTER_DAYS` | 归档天数 | `90` |

## 测试

```bash
# 运行测试脚本
./scripts/test-api.sh YOUR_JWT_TOKEN

# 无认证测试 (仅健康检查)
./scripts/test-api.sh
```

## 相关文档

- [API 文档](http://localhost:30010/docs) - Swagger UI
- [CLAUDE.md](../../CLAUDE.md) - 项目整体文档
- [数据库迁移](./migrations/) - Schema 定义
