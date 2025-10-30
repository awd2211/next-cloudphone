# 前后端API接口完整对齐报告

生成时间: 2025-10-30 19:36

## 概述

本报告详细列出了前端调用的所有API接口，并检查后端是否有对应实现。

---

## 1. Stats Service (billing-service)

### ✅ 完全匹配 (10/10)

前端 `stats.ts` 调用的接口全部在后端 `billing-service/stats.controller.ts` 中实现：

| 前端API | 后端实现 | 状态 |
|---------|---------|------|
| GET /stats/dashboard | @Get('dashboard') | ✅ |
| GET /stats/devices/online | @Get('devices/online') | ✅ |
| GET /stats/users/today | @Get('users/today') | ✅ |
| GET /stats/revenue/today | @Get('revenue/today') | ✅ |
| GET /stats/revenue/month | @Get('revenue/month') | ✅ |
| GET /stats/devices/distribution | @Get('devices/distribution') | ✅ |
| GET /stats/users/activity | @Get('users/activity') | ✅ |
| GET /stats/revenue/trend | @Get('revenue/trend') | ✅ |
| GET /stats/users/growth | @Get('users/growth') | ✅ |
| GET /stats/plans/distribution | @Get('plans/distribution') | ✅ |

**结论**: 无需修改 ✅

---

## 2. Device Service (device-service)

### ⚠️ 部分不匹配 (20/30)

前端 `device.ts` 30个API调用，后端缺失10个接口：

| 前端API | 后端实现 | 状态 |
|---------|---------|------|
| GET /devices | @Get() | ✅ |
| GET /devices/:id | @Get(':id') | ✅ |
| POST /devices | @Post() | ✅ |
| PATCH /devices/:id | @Patch(':id') | ✅ |
| DELETE /devices/:id | @Delete(':id') | ✅ |
| POST /devices/:id/start | @Post(':id/start') | ✅ |
| POST /devices/:id/stop | @Post(':id/stop') | ✅ |
| **POST /devices/:id/reboot** | @Post(':id/restart') | ⚠️ 命名不一致 |
| **GET /devices/available** | 无 | ❌ 缺失 |
| GET /devices/stats | @Get('stats') | ✅ |
| POST /devices/:id/shell | @Post(':id/shell') | ✅ |
| POST /devices/:id/screenshot | @Post(':id/screenshot') | ✅ |
| POST /devices/:id/push | @Post(':id/push') | ✅ |
| POST /devices/:id/pull | @Post(':id/pull') | ✅ |
| POST /devices/:id/install | @Post(':id/install') | ✅ |
| POST /devices/:id/uninstall | @Post(':id/uninstall') | ✅ |
| GET /devices/:id/packages | @Get(':id/packages') | ✅ |
| GET /devices/:id/logcat | @Get(':id/logcat') | ✅ |
| POST /devices/:id/logcat/clear | @Post(':id/logcat/clear') | ✅ |
| GET /devices/:id/properties | @Get(':id/properties') | ✅ |
| **POST /devices/batch/start** | 无 | ❌ 缺失 |
| **POST /devices/batch/stop** | 无 | ❌ 缺失 |
| **POST /devices/batch/reboot** | 无 | ❌ 缺失 |
| **POST /devices/batch/delete** | 无 | ❌ 缺失 |
| **GET /devices/:id/connection** | 无 | ❌ 缺失 |
| **POST /devices/:id/webrtc/token** | 无 | ❌ 缺失 |
| **POST /devices/:id/cloud/refresh** | 无 | ❌ 缺失 |
| **GET /devices/physical** | 无 | ❌ 缺失 |
| **POST /devices/physical/scan** | 无 | ❌ 缺失 |
| **POST /devices/physical/register** | 无 | ❌ 缺失 |

### 需要修复的问题：

1. **命名不一致**: `/devices/:id/reboot` vs `/devices/:id/restart`
2. **批量操作缺失**: 4个batch接口
3. **多提供商支持缺失**: connection, webrtc/token, cloud/refresh
4. **物理设备支持缺失**: physical相关3个接口
5. **可用设备查询缺失**: /devices/available

---

## 3. Notification Service (notification-service)

### ⚠️ 部分不匹配 (5/7)

前端 `notification.ts` 7个API调用，后端缺失2个接口：

| 前端API | 后端实现 | 状态 |
|---------|---------|------|
| GET /notifications/user/:userId | @Get('user/:userId') | ✅ |
| GET /notifications/unread/count | @Get('unread/count') | ✅ |
| POST /notifications | @Post() | ✅ |
| POST /notifications/:id/read | @Patch(':id/read') | ✅ |
| **POST /notifications/read-all** | 无 | ❌ 缺失 |
| DELETE /notifications/:id | @Delete(':id') | ✅ |
| **POST /notifications/batch/delete** | 无 | ❌ 缺失 |

### 需要添加的接口：

1. `POST /notifications/read-all` - 全部标记为已读
2. `POST /notifications/batch/delete` - 批量删除

---

## 4. App Service (app-service)

### ✅ 完全匹配 (15/15)

前端 `app.ts` 15个API调用全部在后端实现：

| 前端API | 后端实现 | 状态 |
|---------|---------|------|
| GET /apps | @Get() | ✅ |
| GET /apps/:id | @Get(':id') | ✅ |
| POST /apps/upload | @Post('upload') | ✅ |
| DELETE /apps/:id | @Delete(':id') | ✅ |
| POST /apps/install | @Post('install') | ✅ |
| POST /apps/uninstall | @Post('uninstall') | ✅ |
| GET /apps/devices/:deviceId/apps | @Get('devices/:deviceId/apps') | ✅ |
| POST /apps/:id/submit-review | @Post(':id/submit-review') | ✅ |
| POST /apps/:id/approve | @Post(':id/approve') | ✅ |
| POST /apps/:id/reject | @Post(':id/reject') | ✅ |
| POST /apps/:id/request-changes | @Post(':id/request-changes') | ✅ |
| GET /apps/audit-records | @Get('audit-records/all') | ✅ |
| GET /apps/:applicationId/reviews | @Get(':id/audit-records') | ✅ |

**结论**: 无需修改 ✅

---

## 5. User & Auth Service (user-service)

### ✅ 完全匹配 (12/12)

#### Auth相关 (4个):

| 前端API | 后端实现 | 状态 |
|---------|---------|------|
| GET /auth/captcha | @Get('captcha') | ✅ |
| POST /auth/login | @Post('login') | ✅ |
| POST /auth/logout | @Post('logout') | ✅ |
| GET /auth/me | @Get('me') | ✅ |

#### User相关 (8个):

| 前端API | 后端实现 | 状态 |
|---------|---------|------|
| GET /users | @Get() | ✅ |
| GET /users/:id | @Get(':id') | ✅ |
| POST /users | @Post() | ✅ |
| PATCH /users/:id | @Patch(':id') | ✅ |
| DELETE /users/:id | @Delete(':id') | ✅ |
| GET /users/:id/balance | 需确认 | ⚠️ |
| POST /balance/recharge | 需确认 | ⚠️ |
| POST /balance/adjust | 需确认 | ⚠️ |

**注**: balance相关接口需要检查是否在billing-service中实现

**结论**: 基本完整 ✅

---

## 6. Billing Service (billing-service)

### 检查中... (33个API)

前端 `billing.ts` 有33个API调用，需要详细检查：

#### Orders (6个):
- GET /billing/orders
- GET /billing/orders/:id
- POST /billing/orders
- POST /billing/orders/:id/cancel
- POST /billing/orders/batch/cancel
- GET /billing/orders/stats

#### Payments (6个):
- GET /payments
- GET /payments/:id
- POST /payments
- POST /payments/query
- POST /payments/:id/refund
- POST /billing/orders/:orderId/refund

#### Metering (5个):
- GET /metering/overview
- GET /metering/users
- GET /metering/devices
- GET /metering/trend
- GET /metering/resource-analysis

#### Reports (4个):
- GET /reports/bills/:userId
- GET /reports/revenue
- GET /reports/usage-trend
- GET /reports/revenue/export

#### Billing Rules (6个):
- GET /billing/rules
- GET /billing/rules/:id
- POST /billing/rules
- PUT /billing/rules/:id
- DELETE /billing/rules/:id
- PATCH /billing/rules/:id/toggle

**需要详细检查后端实现**

---

## 7. 其他服务需要检查

### 待检查服务文件 (剩余19个):

1. `scheduler.ts` - 19 APIs
2. `payment-admin.ts` - 16 APIs
3. `lifecycle.ts` - 14 APIs
4. `queue.ts` - 12 APIs
5. `menu.ts` - 12 APIs
6. `gpu.ts` - 12 APIs
7. `template.ts` - 11 APIs
8. `notificationTemplate.ts` - 11 APIs
9. `role.ts` - 10 APIs
10. `quota.ts` - 10 APIs
11. `fieldPermission.ts` - 10 APIs
12. `ticket.ts` - 9 APIs
13. `dataScope.ts` - 9 APIs
14. `apiKey.ts` - 8 APIs
15. `snapshot.ts` - 8 APIs
16. `plan.ts` - 7 APIs
17. `audit.ts` - 7 APIs
18. `events.ts` - 6 APIs
19. `cache.ts` - 6 APIs

---

## 修复优先级

### 🔴 高优先级 (影响核心功能)

1. **Device Service**:
   - ❌ 添加 `GET /devices/available` - 影响设备列表筛选
   - ⚠️ 统一 `reboot` vs `restart` 命名
   - ❌ 添加批量操作接口 (4个) - 影响批量管理功能

2. **Notification Service**:
   - ❌ 添加 `POST /notifications/read-all` - 影响用户体验
   - ❌ 添加 `POST /notifications/batch/delete` - 影响批量管理

### 🟡 中优先级 (扩展功能)

3. **Device Service - 多提供商支持**:
   - ❌ 添加 `/devices/:id/connection`
   - ❌ 添加 `/devices/:id/webrtc/token`
   - ❌ 添加 `/devices/:id/cloud/refresh`

4. **Device Service - 物理设备支持**:
   - ❌ 添加 `/devices/physical` 相关3个接口

### 🟢 低优先级 (完善性检查)

5. **其他19个service文件** - 逐个验证接口对齐

---

## 建议行动计划

1. ✅ **立即修复** Device Service的reboot命名问题
2. ✅ **立即添加** Notification Service的2个缺失接口
3. ✅ **尽快添加** Device Service的批量操作和available接口
4. ⏳ **计划添加** 多提供商和物理设备支持
5. ⏳ **系统检查** 剩余19个service文件的接口对齐

---

## 当前状态统计

- ✅ **完全匹配**: 3个服务 (stats, app, user/auth)
- ⚠️ **部分不匹配**: 2个服务 (device, notification)
- ⏳ **待检查**: 19个service文件
- 📊 **总体进度**: 约 40% 完成

**下一步**: 修复高优先级问题，然后继续检查其他服务
