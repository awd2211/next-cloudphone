# API 快速查询指南

## 快速导航

### 用户相关
- 登录: `POST /auth/login`
- 注册: `POST /auth/register`
- 获取当前用户: `GET /auth/me`
- 登出: `POST /auth/logout`
- 修改密码: `POST /users/:id/change-password`
- 启用2FA: `POST /auth/2fa/enable`

### 设备相关
- 创建设备: `POST /devices` (需要检查配额)
- 列表设备: `GET /devices`
- 启动设备: `POST /devices/:id/start`
- 停止设备: `POST /devices/:id/stop`
- 重启设备: `POST /devices/:id/restart`
- 设备截图: `GET /devices/:id/screenshot`
- 执行命令: `POST /devices/:id/shell`
- 批量操作: `POST /devices/batch/*`

### 应用相关
- 上传APK: `POST /apps/upload` (multipart, 最大200MB)
- 应用列表: `GET /apps`
- 安装应用: `POST /apps/install` (Saga模式)
- 卸载应用: `POST /apps/uninstall`
- 获取设备应用: `GET /apps/devices/:deviceId/apps`
- 提交审核: `POST /apps/:id/submit-review`
- 批准应用: `POST /apps/:id/approve` (需要app.approve权限)

### 计费相关
- 获取套餐: `GET /billing/plans`
- 创建订单: `POST /billing/orders`
- 获取用户订单: `GET /billing/orders/:userId`
- 获取余额: `GET /balance/user/:userId`
- 余额充值: `POST /balance/recharge`
- 创建支付: `POST /payments`
- 申请退款: `POST /payments/:id/refund`

### 通知相关
- 创建通知: `POST /notifications`
- 获取通知: `GET /notifications/user/:userId`
- 标记已读: `PATCH /notifications/:id/read`
- 获取未读数: `GET /notifications/unread/count`
- 创建模板: `POST /templates`
- 渲染模板: `POST /templates/render`

### 权限相关
- 获取用户配额: `GET /quotas/user/:userId`
- 检查配额: `POST /quotas/check`
- 获取角色: `GET /roles`
- 获取权限: `GET /permissions`

### 系统相关
- 健康检查: `GET /health` (公开)
- 熔断器状态: `GET /circuit-breaker/stats` (公开)
- 清除缓存: `DELETE /cache` (Query: key)
- 获取指标: `GET /metrics` (公开)

---

## 常用HTTP方法

| 操作 | 方法 | 示例 |
|------|------|------|
| 创建资源 | POST | `POST /devices` |
| 获取列表 | GET | `GET /devices?page=1&limit=10` |
| 获取详情 | GET | `GET /devices/:id` |
| 更新资源 | PATCH | `PATCH /devices/:id` |
| 替换资源 | PUT | `PUT /quotas/:id` |
| 删除资源 | DELETE | `DELETE /devices/:id` |
| 执行操作 | POST | `POST /devices/:id/start` |
| 调用方法 | POST | `POST /notifications/broadcast` |

---

## 认证方式

### JWT Bearer Token
```bash
curl -H "Authorization: Bearer {token}" https://api.example.com/users
```

### API Key (仅支持api-keys端点测试)
```bash
curl -H "X-API-Key: {key}" https://api.example.com/api-keys/test/auth
```

---

## 请求/响应示例

### 成功请求
```http
POST /devices HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "name": "Device-01",
  "userId": "user123",
  "cpu": 4,
  "memory": 4096
}

HTTP/1.1 201 Created
{
  "success": true,
  "data": {
    "id": "device123",
    "name": "Device-01",
    "status": "IDLE"
  },
  "message": "Device created successfully"
}
```

### 分页请求
```http
GET /devices?page=1&limit=10&status=IDLE HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGc...

HTTP/1.1 200 OK
{
  "success": true,
  "data": [ /* ... */ ],
  "page": 1,
  "total": 100,
  "limit": 10,
  "totalPages": 10
}
```

### 游标分页请求
```http
GET /devices?cursor=abc123&limit=20 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGc...

HTTP/1.1 200 OK
{
  "success": true,
  "data": [ /* ... */ ],
  "nextCursor": "xyz789",
  "hasMore": true,
  "count": 20
}
```

### 错误请求
```http
POST /users HTTP/1.1
Host: api.example.com
Authorization: Bearer invalid-token

HTTP/1.1 401 Unauthorized
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Invalid token"
}
```

---

## 限流限制

| 端点 | 限制 | 说明 |
|------|------|------|
| POST /auth/login | 5/分钟 | 防暴力破解 |
| POST /auth/register | 3/分钟 | 防滥用注册 |
| GET /auth/captcha | 10/分钟 | 验证码获取 |
| POST /auth/refresh | 10/分钟 | Token刷新 |
| POST /apps/upload | 20/5分钟 | APK上传 |
| POST /payments | 10/5分钟 | 创建支付单 |
| POST /payments/:id/refund | 5/5分钟 | 申请退款 |

超限返回 HTTP 429 Too Many Requests

---

## 常见错误代码

| 代码 | 含义 | 可能原因 |
|------|------|--------|
| 400 | Bad Request | 参数格式错误、缺少必需参数 |
| 401 | Unauthorized | Token过期、无效或缺失 |
| 403 | Forbidden | 权限不足、配额超限、账户被锁定 |
| 404 | Not Found | 资源不存在 |
| 429 | Too Many Requests | 请求过于频繁，触发限流 |
| 500 | Internal Server Error | 服务器内部错误 |

---

## 权限清单

### User Service 权限
```
user.create - 创建用户
user.read - 查看用户
user.update - 更新用户
user.delete - 删除用户
role.create - 创建角色
role.read - 查看角色
role.update - 更新角色
role.delete - 删除角色
permission.create - 创建权限
permission.read - 查看权限
permission.update - 更新权限
permission.delete - 删除权限
```

### Device Service 权限
```
device.create - 创建设备
device.read - 查看设备
device.update - 更新设备
device.delete - 删除设备
device.control - 控制设备(Shell、截图等)
device:sms:request - 请求虚拟号码
device:sms:cancel - 取消虚拟号码
device:snapshot-create - 创建快照
device:snapshot-restore - 恢复快照
device:snapshot-delete - 删除快照
device:app-operate - 操作应用(启动/停止)
```

### App Service 权限
```
app.create - 创建/上传应用
app.read - 查看应用
app.update - 更新应用
app.delete - 删除应用
app.approve - 审核应用
```

### Billing Service 权限
```
billing:read - 查看计费
billing:create - 创建订单
billing:update - 更新订单
billing:delete - 删除订单
```

### Notification Service 权限
```
notification.create - 创建通知
notification.read - 查看通知
notification.update - 更新通知
notification.delete - 删除通知
notification.broadcast - 广播通知
notification.template-create - 创建模板
notification.template-read - 查看模板
notification.template-update - 更新模板
notification.template-delete - 删除模板
notification.template-toggle - 激活/停用模板
notification.template-render - 渲染模板
```

---

## 常用工具命令

### cURL

登录:
```bash
curl -X POST http://localhost:30000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456","captcha":"xxxx"}'
```

获取用户列表:
```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:30000/users?page=1&limit=10
```

创建设备:
```bash
curl -X POST http://localhost:30000/devices \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Device-01","cpu":4,"memory":4096,"userId":"user123"}'
```

上传APK:
```bash
curl -X POST http://localhost:30000/apps/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@app.apk" \
  -F "name=MyApp" \
  -F "version=1.0.0"
```

### Postman

1. 在Headers中添加: `Authorization: Bearer {token}`
2. 在Body中选择 `application/json` 格式
3. 对于文件上传，选择 `form-data` 类型

### 在线API文档

访问 Swagger UI 查看完整API文档（如果启用）:
```
http://localhost:30000/api/docs
```

---

## 最佳实践

### 1. 错误处理
```javascript
async function apiCall(url, options) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    // 处理错误
  }
}
```

### 2. 重试逻辑
```javascript
async function apiCallWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall(url, options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

### 3. Token刷新
```javascript
async function getValidToken() {
  let token = localStorage.getItem('token');
  const expiresAt = localStorage.getItem('expiresAt');
  
  if (new Date() > new Date(expiresAt)) {
    const response = await fetch('http://api.example.com/auth/refresh', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    token = data.data.accessToken;
    localStorage.setItem('token', token);
    localStorage.setItem('expiresAt', data.data.expiresAt);
  }
  
  return token;
}
```

### 4. 分页处理
```javascript
async function getAllPaginatedData(url, pageSize = 10) {
  const allData = [];
  let page = 1;
  
  while (true) {
    const response = await apiCall(`${url}?page=${page}&limit=${pageSize}`);
    allData.push(...response.data);
    
    if (page >= response.totalPages) break;
    page++;
  }
  
  return allData;
}
```

---

## 常见问题

### Q: 如何获取访问令牌?
A: 使用 `POST /auth/login` 端点，提供用户名、密码和验证码。

### Q: Token多久过期?
A: 根据服务器配置，通常为7天。可以使用 `POST /auth/refresh` 来刷新Token。

### Q: 配额不足时会发生什么?
A: 会返回 HTTP 403 Forbidden，并在响应中说明原因。

### Q: 如何取消已提交的异步操作?
A: 对于使用Saga模式的操作（如设备创建），可以监控Saga ID查询状态，但不支持取消已启动的Saga。

### Q: 是否支持WebSocket?
A: 是的，Notification Service支持WebSocket实时推送通知。

### Q: 文件上传的大小限制是多少?
A: APK上传限制200MB，其他文件根据具体端点配置。

---

## 更新日志

- **2024-11-03**: 首次发布，包含260+个API端点的完整分析

---

## 相关文档

- [完整API分析](./API_ENDPOINTS_COMPLETE_ANALYSIS.md)
- [摘要总览](./API_ENDPOINTS_SUMMARY.md)
- [架构文档](./ARCHITECTURE.md)
- [开发指南](./DEVELOPMENT_GUIDE.md)
