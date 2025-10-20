# API 文档

云手机平台 RESTful API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: `application/json`

## 认证

### 用户注册

**POST** `/auth/register`

注册新用户账号

**请求体:**
```json
{
  "username": "string (必填, 最小长度3)",
  "email": "string (必填, 邮箱格式)",
  "password": "string (必填, 最小长度6)"
}
```

**响应:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@example.com",
    "role": "user"
  }
}
```

**状态码:**
- `201` - 注册成功
- `409` - 用户名或邮箱已存在
- `400` - 请求参数错误

---

### 用户登录

**POST** `/auth/login`

用户登录获取 Token

**请求体:**
```json
{
  "username": "string (必填)",
  "password": "string (必填)"
}
```

**响应:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@example.com",
    "role": "user"
  }
}
```

**状态码:**
- `200` - 登录成功
- `401` - 用户名或密码错误

---

### 获取当前用户信息

**GET** `/auth/me`

获取当前登录用户的信息

**请求头:**
```
Authorization: Bearer {token}
```

**响应:**
```json
{
  "id": "uuid",
  "username": "admin",
  "email": "admin@example.com",
  "role": "user",
  "tenantId": "uuid",
  "status": "active",
  "createdAt": "2025-01-20T10:00:00.000Z",
  "updatedAt": "2025-01-20T10:00:00.000Z"
}
```

**状态码:**
- `200` - 成功
- `401` - 未授权（Token 无效或过期）

---

## 设备管理

### 获取设备列表

**GET** `/devices`

获取云手机设备列表

**请求头:**
```
Authorization: Bearer {token}
```

**查询参数:**
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 10
- `status` (可选): 设备状态过滤 (online|offline|busy)

**响应:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Android-1",
      "status": "online",
      "androidVersion": "11.0",
      "cpu": "4核",
      "memory": "4GB",
      "storage": "64GB",
      "tenantId": "uuid",
      "currentUserId": null,
      "createdAt": "2025-01-20T10:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

**状态码:**
- `200` - 成功
- `401` - 未授权

---

### 创建设备

**POST** `/devices`

创建新的云手机设备

**请求头:**
```
Authorization: Bearer {token}
```

**请求体:**
```json
{
  "name": "string (必填)",
  "androidVersion": "string (必填)",
  "cpu": "string (必填)",
  "memory": "string (必填)",
  "storage": "string (必填)"
}
```

**响应:**
```json
{
  "id": "uuid",
  "name": "Android-2",
  "status": "offline",
  "androidVersion": "11.0",
  "cpu": "4核",
  "memory": "4GB",
  "storage": "64GB",
  "tenantId": "uuid",
  "createdAt": "2025-01-20T10:00:00.000Z"
}
```

**状态码:**
- `201` - 创建成功
- `400` - 请求参数错误
- `401` - 未授权
- `403` - 无权限

---

### 获取设备详情

**GET** `/devices/:id`

获取指定设备的详细信息

**请求头:**
```
Authorization: Bearer {token}
```

**URL 参数:**
- `id`: 设备 ID (uuid)

**响应:**
```json
{
  "id": "uuid",
  "name": "Android-1",
  "status": "online",
  "androidVersion": "11.0",
  "cpu": "4核",
  "memory": "4GB",
  "storage": "64GB",
  "tenantId": "uuid",
  "currentUserId": "uuid",
  "createdAt": "2025-01-20T10:00:00.000Z",
  "updatedAt": "2025-01-20T10:30:00.000Z"
}
```

**状态码:**
- `200` - 成功
- `404` - 设备不存在
- `401` - 未授权

---

### 更新设备

**PATCH** `/devices/:id`

更新设备信息

**请求头:**
```
Authorization: Bearer {token}
```

**请求体:**
```json
{
  "name": "string (可选)",
  "status": "string (可选)",
  "cpu": "string (可选)",
  "memory": "string (可选)"
}
```

**响应:**
```json
{
  "id": "uuid",
  "name": "Android-1-Updated",
  "status": "online",
  ...
}
```

**状态码:**
- `200` - 更新成功
- `404` - 设备不存在
- `401` - 未授权
- `403` - 无权限

---

### 删除设备

**DELETE** `/devices/:id`

删除指定设备

**请求头:**
```
Authorization: Bearer {token}
```

**状态码:**
- `204` - 删除成功
- `404` - 设备不存在
- `401` - 未授权
- `403` - 无权限

---

## 应用管理

### 获取应用列表

**GET** `/apps`

获取应用列表

**请求头:**
```
Authorization: Bearer {token}
```

**查询参数:**
- `page` (可选): 页码
- `limit` (可选): 每页数量
- `search` (可选): 搜索关键词

**响应:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "微信",
      "packageName": "com.tencent.mm",
      "version": "8.0.32",
      "iconUrl": "https://example.com/icon.png",
      "apkUrl": "https://example.com/wechat.apk",
      "size": 209715200,
      "downloads": 1520,
      "createdAt": "2025-01-20T10:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

---

### 上传应用

**POST** `/apps/upload`

上传 APK 文件

**请求头:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**请求体 (FormData):**
- `file`: APK 文件
- `name`: 应用名称
- `packageName`: 包名
- `version`: 版本号

**响应:**
```json
{
  "id": "uuid",
  "name": "微信",
  "packageName": "com.tencent.mm",
  "version": "8.0.32",
  "apkUrl": "https://minio.example.com/apps/wechat-8.0.32.apk",
  "size": 209715200
}
```

---

## 设备调度

### 获取可用设备

**GET** `/scheduler/devices/available`

获取当前可用的设备列表

**请求头:**
```
Authorization: Bearer {token}
```

**响应:**
```json
{
  "devices": [
    {
      "id": "uuid",
      "name": "Android-1",
      "status": "online",
      "load": 0.2
    }
  ],
  "total": 10
}
```

---

### 分配设备

**POST** `/scheduler/devices/allocate`

为用户分配一个可用设备

**请求头:**
```
Authorization: Bearer {token}
```

**请求体:**
```json
{
  "userId": "uuid (必填)"
}
```

**响应:**
```json
{
  "deviceId": "uuid",
  "status": "allocated",
  "userId": "uuid"
}
```

---

### 释放设备

**POST** `/scheduler/devices/:deviceId/release`

释放设备，使其可被其他用户使用

**请求头:**
```
Authorization: Bearer {token}
```

**响应:**
```json
{
  "deviceId": "uuid",
  "status": "released"
}
```

---

## 计费服务

### 获取套餐列表

**GET** `/billing/plans`

获取所有可用的计费套餐

**响应:**
```json
[
  {
    "id": "uuid",
    "name": "基础套餐",
    "description": "每月 100 小时使用时长",
    "price": 99.00,
    "billingCycle": "monthly",
    "features": {
      "hours": 100,
      "devices": 1
    },
    "isActive": true
  }
]
```

---

### 创建订单

**POST** `/billing/orders`

创建新订单

**请求头:**
```
Authorization: Bearer {token}
```

**请求体:**
```json
{
  "planId": "uuid (可选)",
  "amount": 99.00,
  "metadata": {}
}
```

**响应:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "amount": 99.00,
  "status": "pending",
  "createdAt": "2025-01-20T10:00:00.000Z"
}
```

---

### 获取用户订单

**GET** `/billing/orders/:userId`

获取用户的所有订单

**请求头:**
```
Authorization: Bearer {token}
```

**响应:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "amount": 99.00,
    "status": "paid",
    "paidAt": "2025-01-20T10:00:00.000Z",
    "createdAt": "2025-01-20T09:50:00.000Z"
  }
]
```

---

### 获取使用记录

**GET** `/billing/usage/:userId`

获取用户的使用记录

**请求头:**
```
Authorization: Bearer {token}
```

**查询参数:**
- `startDate` (可选): 开始日期
- `endDate` (可选): 结束日期

**响应:**
```json
{
  "records": [
    {
      "id": "uuid",
      "userId": "uuid",
      "deviceId": "uuid",
      "startTime": "2025-01-20T10:00:00.000Z",
      "endTime": "2025-01-20T11:30:00.000Z",
      "duration": 5400,
      "cost": 1.50,
      "status": "completed"
    }
  ],
  "summary": {
    "totalDuration": 18000,
    "totalCost": 5.00,
    "recordCount": 5
  }
}
```

---

### 开始计费

**POST** `/billing/usage/start`

开始记录设备使用时间

**请求头:**
```
Authorization: Bearer {token}
```

**请求体:**
```json
{
  "userId": "uuid",
  "deviceId": "uuid",
  "tenantId": "uuid"
}
```

**响应:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "deviceId": "uuid",
  "startTime": "2025-01-20T10:00:00.000Z",
  "status": "active"
}
```

---

### 停止计费

**POST** `/billing/usage/stop`

停止计费并计算费用

**请求头:**
```
Authorization: Bearer {token}
```

**请求体:**
```json
{
  "recordId": "uuid"
}
```

**响应:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "deviceId": "uuid",
  "startTime": "2025-01-20T10:00:00.000Z",
  "endTime": "2025-01-20T11:30:00.000Z",
  "duration": 5400,
  "cost": 1.50,
  "status": "completed"
}
```

---

## 健康检查

### API 网关健康检查

**GET** `/health`

检查 API 网关服务状态

**响应:**
```json
{
  "status": "ok",
  "service": "api-gateway",
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

---

## 错误响应

所有 API 在发生错误时返回统一格式：

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 常见状态码

- `200` - 成功
- `201` - 创建成功
- `204` - 删除成功（无内容）
- `400` - 请求参数错误
- `401` - 未授权
- `403` - 无权限
- `404` - 资源不存在
- `409` - 资源冲突
- `500` - 服务器内部错误

---

## 认证示例

### 完整流程示例

**1. 注册用户**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**2. 登录获取 Token**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

**3. 使用 Token 访问受保护的 API**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## WebSocket 事件 (实时通信)

### 连接

```javascript
const socket = io('http://localhost:3003', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});
```

### 事件列表

- `device:status` - 设备状态变化
- `usage:update` - 使用时长更新
- `webrtc:offer` - WebRTC Offer
- `webrtc:answer` - WebRTC Answer
- `webrtc:ice-candidate` - ICE Candidate

---

**版本**: 1.0
**最后更新**: 2025-01-20
