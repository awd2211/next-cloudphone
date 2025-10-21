# 通知系统快速开始指南

## 🎉 已完成功能

### 后端 - Notification Service

✅ **核心功能**:
- WebSocket 实时通知系统
- Email 邮件通知服务
- 多渠道通知支持（WebSocket、Email、应用内）
- 通知模板系统
- 16 种通知类型（工单、余额、配额、设备、系统等）

✅ **文件结构**:
```
backend/notification-service/
├── src/
│   ├── notifications/
│   │   ├── entities/
│   │   │   ├── notification.entity.ts      # 通知实体
│   │   │   └── notification-template.entity.ts  # 模板实体
│   │   ├── notifications.service.ts        # 通知服务
│   │   ├── notifications.controller.ts     # REST APIs
│   │   └── notifications.module.ts
│   ├── websocket/
│   │   ├── websocket.gateway.ts            # WebSocket 网关
│   │   └── websocket.module.ts
│   ├── email/
│   │   ├── email.service.ts                # 邮件服务
│   │   └── email.module.ts
│   ├── app.module.ts
│   └── main.ts
├── package.json
└── .env.example
```

✅ **REST APIs** (4个核心接口):
- `POST /api/notifications/send` - 发送通知
- `GET /api/notifications/user/:userId` - 获取用户通知
- `PUT /api/notifications/:id/read` - 标记已读
- `GET /api/notifications/unread-count/:userId` - 未读数量

✅ **WebSocket 事件**:
- 连接: `ws://localhost:30006/notifications?userId=xxx`
- 接收: `notification` 事件
- 发送: `ping/pong` 心跳
- 发送: `mark_read` 标记已读

---

## 🚀 启动服务

### 1. 安装依赖
```bash
cd backend/notification-service
npm install
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库和邮件参数
```

### 3. 启动服务
```bash
npm run dev
```

访问:
- API: http://localhost:30006/api/docs
- WebSocket: ws://localhost:30006/notifications

---

## 📝 使用示例

### 发送通知

```bash
curl -X POST http://localhost:30006/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "type": "ticket_reply",
    "title": "工单有新回复",
    "content": "您的工单 #TKT-001 有新回复",
    "channels": ["websocket", "email"],
    "resourceType": "ticket",
    "resourceId": "ticket-uuid",
    "actionUrl": "/tickets/ticket-uuid"
  }'
```

### WebSocket 连接（前端）

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:30006/notifications', {
  query: { userId: 'user-uuid' }
});

socket.on('connect', () => {
  console.log('WebSocket connected');
});

socket.on('notification', (notification) => {
  console.log('New notification:', notification);
  // 显示通知...
});

socket.on('disconnect', () => {
  console.log('WebSocket disconnected');
});
```

---

## 📊 下一步：前端开发

### 需要开发的前端界面：

#### 1. 通知中心组件 (NotificationCenter.vue)
- WebSocket 连接管理
- 实时接收通知
- 未读标记和数量显示
- 通知列表和详情

#### 2. 配额管理界面
- `views/quotas/QuotaList.vue` - 配额列表
- `views/quotas/QuotaEdit.vue` - 编辑配额
- `components/QuotaUsageChart.vue` - 使用图表

#### 3. 余额&账单界面
- `views/billing/BalanceOverview.vue` - 余额概览
- `views/billing/TransactionHistory.vue` - 交易记录
- `views/billing/InvoiceList.vue` - 账单列表

#### 4. 工单系统界面
- `views/tickets/TicketList.vue` - 工单列表
- `views/tickets/TicketDetail.vue` - 工单详情

#### 5. 数据分析仪表板
- `views/dashboard/Analytics.vue` - 数据仪表板
- 使用 ECharts 展示配额、费用、工单统计图表

---

## 🔧 Docker 集成

添加到 `docker-compose.dev.yml`:

```yaml
notification-service:
  build:
    context: ./backend/notification-service
    dockerfile: Dockerfile
  container_name: cloudphone-notification-service
  ports:
    - "30006:30006"
  environment:
    - NODE_ENV=development
    - DB_HOST=postgres
    - DB_PORT=5432
    - DB_USERNAME=postgres
    - DB_PASSWORD=postgres
    - DB_DATABASE=cloudphone
    - EMAIL_HOST=smtp.gmail.com
    - EMAIL_PORT=587
  depends_on:
    - postgres
  networks:
    - cloudphone-network
  volumes:
    - ./backend/notification-service:/app
    - /app/node_modules
  command: npm run dev
```

---

## 📚 API 文档

启动服务后访问 Swagger 文档：
http://localhost:30006/api/docs

---

## ✨ 特性

- ✅ **实时推送**: WebSocket 实现毫秒级通知推送
- ✅ **多渠道**: WebSocket、Email、应用内通知
- ✅ **可靠性**: 连接断线重连、消息持久化
- ✅ **可扩展**: 支持添加 SMS 短信渠道
- ✅ **模板化**: Handlebars 模板引擎
- ✅ **用户房间**: 每个用户独立房间，支持多设备同时在线

---

*文档版本: v1.0*
*最后更新: 2024-10-20*
