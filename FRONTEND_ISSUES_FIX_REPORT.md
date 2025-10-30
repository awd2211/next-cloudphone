# 前端问题修复报告

**日期**: 2025-10-30
**修复人**: Claude Code
**状态**: Device API 已修复，WebSocket 待处理

## 问题概述

用户在浏览器控制台中发现以下错误：

1. ✅ **已修复**: Device API 500错误
   - `GET /api/v1/devices?page=1&pageSize=10` - 500 Internal Server Error
   - `GET /api/v1/devices/stats` - 500 Internal Server Error

2. ⚠️ **待解决**: WebSocket 连接失败
   - `ws://localhost:30006/` 连接失败
   - `ws://localhost:30006/socket.io/` 连接失败

## 已修复的问题

### 1. Device Service - 数据库列名不匹配 ✅

**问题描述**:
Device实体类中的列名配置与实际数据库表结构不匹配：
- 实体定义: `lastHeartbeatAt` 映射到 `last_heartbeat_at` (使用了 `name` 属性)
- 实际数据库: 列名为 `lastHeartbeatAt` (驼峰命名)

**错误日志**:
```
error: column Device.last_heartbeat_at does not exist
error: column Device.deviceTags does not exist
```

**修复内容**:
修改 `/backend/device-service/src/entities/device.entity.ts`:

1. 移除 `lastHeartbeatAt` 和 `lastActiveAt` 的 `name` 属性
   ```typescript
   // 修复前:
   @Column({ name: "last_heartbeat_at", type: "timestamp", nullable: true })
   lastHeartbeatAt: Date;

   // 修复后:
   @Column({ type: "timestamp", nullable: true })
   lastHeartbeatAt: Date;
   ```

2. 添加 `deviceTags` 的 `name` 属性映射
   ```typescript
   // 修复前:
   @Column({ type: "jsonb", nullable: true })
   deviceTags: string[];

   // 修复后:
   @Column({ name: "device_tags", type: "jsonb", nullable: true })
   deviceTags: string[];
   ```

**修复步骤**:
1. 修改实体文件
2. 重新编译实体: `pnpm exec tsc src/entities/device.entity.ts --outDir dist/entities ...`
3. 重启device-service: `pm2 restart device-service`

**验证**:
- ✅ 数据库查询不再报错
- ✅ 日志显示正确的SQL查询语句

## 待解决的问题

### 2. Notification Service - WebSocket 连接失败 ⚠️

**问题描述**:
前端无法建立WebSocket连接到notification-service (端口30006)。

**当前状态**:
- ✅ notification-service正常运行，监听端口30006
- ✅ Socket.IO客户端代码配置正确 (`frontend/admin/src/services/notification.ts`)
- ⚠️ **未发现**: WebSocket Gateway初始化日志缺失
- ⚠️ **问题**: 服务器对WebSocket连接请求无响应

**可能原因**:

1. **Gateway未正确注册** (最可能)
   - `NotificationGateway` 在 `NotificationsModule` 中注册为provider
   - 但启动日志中没有看到Socket.IO服务器初始化信息
   - 可能需要检查模块导入链

2. **端口或CORS配置问题**
   - Gateway配置了CORS: `origin: '*'`, 应该允许所有来源
   - 主应用也配置了CORS
   - 可能存在冲突

3. **全局前缀影响**
   - main.ts中设置了 `app.setGlobalPrefix('api/v1')`
   - WebSocket Gateway理论上不应受影响，但需要验证

**前端连接代码**:
```typescript
// frontend/admin/src/services/notification.ts
const WEBSOCKET_URL = 'http://localhost:30006';

this.socket = io(WEBSOCKET_URL, {
  query: { userId },
  transports: ['websocket', 'polling'],
  reconnection: true,
});
```

**后端Gateway配置**:
```typescript
// backend/notification-service/src/gateway/notification.gateway.ts
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class NotificationGateway { ... }
```

**建议的调试步骤**:

1. **验证Gateway初始化**:
   ```bash
   # 检查是否有Socket.IO服务器启动日志
   pm2 logs notification-service | grep -i "socket\|gateway\|websocket"
   ```

2. **测试Socket.IO端点**:
   ```bash
   # 测试Socket.IO握手
   curl -i http://localhost:30006/socket.io/?EIO=4&transport=polling
   ```

3. **检查模块导入链**:
   - 确认 `NotificationsModule` 正确导入到 `AppModule`
   - 确认 `NotificationGateway` 在 `NotificationsModule.providers` 中

4. **添加调试日志**:
   在 `NotificationGateway.handleConnection()` 方法开头添加更多日志

5. **验证Socket.IO版本兼容性**:
   检查前后端Socket.IO版本是否匹配

## 测试建议

### Device API测试
```bash
# 需要先获取有效的JWT token
# 然后测试设备列表API
curl "http://localhost:30000/api/v1/devices?page=1&pageSize=10" \
  -H "Authorization: Bearer <TOKEN>"
```

### WebSocket测试
在浏览器中刷新前端页面，查看控制台：
- 如果Device API错误消失 → Device修复成功
- 如果WebSocket连接建立 → 通知服务修复成功

## 后续工作

1. ⚠️ **高优先级**: 解决WebSocket连接问题
   - 需要深入调试notification-service的Gateway初始化
   - 可能需要重新配置或重写Gateway模块

2. 📝 **建议**: 添加集成测试
   - 为Device API添加端到端测试
   - 为WebSocket连接添加自动化测试

3. 📝 **建议**: 数据库迁移脚本
   - 统一数据库列命名规范（驼峰 vs 下划线）
   - 创建迁移脚本避免手动修复

## 文件更改清单

### 已修改文件
- `backend/device-service/src/entities/device.entity.ts` - 修复列名映射

### 待检查文件
- `backend/notification-service/src/gateway/notification.gateway.ts`
- `backend/notification-service/src/notifications/notifications.module.ts`
- `backend/notification-service/src/app.module.ts`
- `backend/notification-service/src/main.ts`

## 相关文档

- Device Service架构: `backend/device-service/README.md`
- Notification Service: `backend/notification-service/README.md`
- CLAUDE.md: 项目开发指南
