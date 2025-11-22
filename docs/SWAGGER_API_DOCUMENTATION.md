# Swagger API 文档指南

**生成时间:** 2025-11-02
**配置状态:** ✅ 所有服务已完成配置
**访问方式:** 统一路径 `/docs`

---

## 📊 总览

Cloud Phone 平台所有8个后端微服务均已配置 Swagger/OpenAPI 文档，提供完整的 API 交互式文档界面。

### 配置统一标准

| 配置项 | 标准值 | 说明 |
|--------|--------|------|
| **Swagger 路径** | `/docs` | 所有服务统一使用此路径 |
| **API 版本** | `1.0.0` | 语义化版本号 |
| **JWT 认证** | Bearer Token | 所有服务支持 JWT 认证测试 |
| **文档引擎** | Swagger UI | 交互式 API 文档界面 |

---

## 🚀 快速访问

### 本地开发环境

所有服务启动后，可以直接访问以下 URL：

| 服务 | Swagger 地址 | 端口 | 说明 |
|------|--------------|------|------|
| **API Gateway** | http://localhost:30000/docs | 30000 | 统一入口，聚合路由 |
| **User Service** | http://localhost:30001/docs | 30001 | 用户、角色、权限、配额 |
| **Device Service** | http://localhost:30002/docs | 30002 | 设备管理、生命周期 |
| **App Service** | http://localhost:30003/docs | 30003 | 应用上传、安装 |
| **Billing Service** | http://localhost:30005/docs | 30005 | 计费、支付、订单 |
| **Notification Service** | http://localhost:30006/docs | 30006 | 通知、短信、模板 |
| **Proxy Service** | http://localhost:30007/docs | 30007 | 代理管理 |
| **SMS Receive Service** | http://localhost:30008/docs | 30008 | 虚拟号码、短信接收 |

### 生产环境

生产环境通过 API Gateway 统一入口访问：

```
https://api.cloudphone.run/docs  (API Gateway)
```

后端服务文档仅在内网可访问（需要VPN或跳板机）。

---

## 🔐 JWT 认证配置

### 1. 获取 JWT Token

**方法 1: 通过 Swagger UI 登录**

1. 访问任意服务的 `/docs` 页面
2. 找到 `POST /auth/login` 接口
3. 点击 "Try it out"
4. 输入用户名密码：
   ```json
   {
     "username": "admin",
     "password": "admin123"
   }
   ```
5. 执行后从响应中复制 `access_token`

**方法 2: 使用 curl**

```bash
# 登录获取 Token
curl -X POST http://localhost:30001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# 响应示例
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### 2. 在 Swagger UI 中配置认证

1. 点击页面右上角的 **"Authorize"** 按钮
2. 在 `bearerAuth (http, Bearer)` 输入框中输入 Token
3. 格式：直接输入 Token，**不需要** `Bearer ` 前缀
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. 点击 **"Authorize"** 确认
5. 关闭对话框，所有需要认证的接口将自动带上 Token

### 3. Token 刷新

Token 默认有效期为 24 小时（可在 `.env` 中配置 `JWT_EXPIRES_IN`）。

过期后需要重新登录获取新 Token。

---

## 📖 各服务 API 详解

### 1. API Gateway (30000)

**功能:** 统一入口、路由代理、熔断保护

**主要 API 分组:**
- 健康检查: `GET /health`
- 熔断器统计: `GET /circuit-breaker/stats`
- 服务缓存清除: `ALL /service-cache/clear`

**特点:**
- 作为所有后端服务的代理入口
- 提供服务健康状态聚合查询
- 熔断器状态监控

**Swagger 特性:**
- 展示所有代理路由
- 请求示例包含完整路径
- 支持直接测试所有后端接口

---

### 2. User Service (30001)

**功能:** 用户管理、认证授权、RBAC、配额

**主要 API 分组:**

#### 🔑 Authentication (认证)
- `POST /auth/login` - 用户登录
- `POST /auth/register` - 用户注册
- `POST /auth/refresh` - 刷新 Token
- `POST /auth/logout` - 登出
- `POST /auth/change-password` - 修改密码
- `POST /auth/reset-password` - 重置密码

#### 👤 Users (用户管理)
- `GET /users` - 用户列表（分页）
- `GET /users/:id` - 用户详情
- `POST /users` - 创建用户
- `PATCH /users/:id` - 更新用户
- `DELETE /users/:id` - 删除用户
- `GET /users/:id/stats` - 用户统计

#### 🛡️ Roles (角色管理)
- `GET /roles` - 角色列表
- `POST /roles` - 创建角色
- `PATCH /roles/:id` - 更新角色
- `DELETE /roles/:id` - 删除角色

#### 🔐 Permissions (权限管理)
- `GET /permissions` - 权限列表
- `POST /permissions` - 创建权限
- `GET /permissions/menu` - 菜单权限
- `GET /permissions/field` - 字段权限

#### 📊 Quotas (配额管理)
- `GET /quotas/user/:userId` - 用户配额
- `POST /quotas` - 创建配额
- `PATCH /quotas/:id` - 更新配额
- `POST /quotas/user/:userId/usage` - 上报用量

#### 🎫 Tickets (工单系统)
- `GET /tickets` - 工单列表
- `POST /tickets` - 创建工单
- `POST /tickets/:id/reply` - 回复工单
- `PATCH /tickets/:id/close` - 关闭工单

#### 🔍 Audit Logs (审计日志)
- `GET /audit-logs` - 审计日志列表
- `GET /audit-logs/:id` - 日志详情
- `GET /audit-logs/user/:userId` - 用户审计日志

#### 🔑 API Keys (API密钥)
- `GET /api-keys` - API密钥列表
- `POST /api-keys` - 创建密钥
- `DELETE /api-keys/:id` - 撤销密钥
- `POST /api-keys/:id/test` - 测试密钥

**Swagger 特性:**
- 完整的 CQRS 命令和查询分离展示
- 事件溯源相关接口
- 详细的权限控制说明

---

### 3. Device Service (30002)

**功能:** 云手机设备管理、ADB 控制、生命周期管理

**主要 API 分组:**

#### 📱 Devices (设备 CRUD)
- `GET /devices` - 设备列表（支持高级筛选）
- `POST /devices` - 创建设备
- `GET /devices/:id` - 设备详情
- `PATCH /devices/:id` - 更新设备
- `DELETE /devices/:id` - 删除设备

#### 🎮 Device Control (设备控制)
- `POST /devices/:id/start` - 启动设备
- `POST /devices/:id/stop` - 停止设备
- `POST /devices/:id/restart` - 重启设备
- `POST /devices/:id/reboot` - 重启 Android 系统
- `POST /devices/:id/shell` - 执行 ADB 命令
- `POST /devices/:id/cursor` - 模拟触摸/键盘输入

#### 📸 Snapshots (快照管理)
- `GET /snapshots` - 快照列表
- `POST /snapshots/create` - 创建快照
- `POST /snapshots/:id/restore` - 恢复快照
- `POST /snapshots/:id/compress` - 压缩快照
- `DELETE /snapshots/:id` - 删除快照

#### ♻️ Lifecycle (生命周期)
- `GET /lifecycle/cleanup/stats` - 清理统计
- `POST /lifecycle/cleanup/execute` - 执行清理
- `GET /lifecycle/autoscaling/status` - 自动扩容状态
- `POST /lifecycle/autoscaling/trigger` - 触发扩容
- `GET /lifecycle/backup/config` - 备份配置
- `POST /lifecycle/backup/device/:id` - 备份设备

#### 🔄 Failover (故障转移)
- `GET /failover/config` - 故障转移配置
- `GET /failover/stats` - 故障转移统计
- `POST /failover/detect` - 检测故障
- `POST /failover/recover` - 恢复设备

#### 🩺 State Recovery (状态恢复)
- `GET /state-recovery/config` - 配置
- `POST /state-recovery/check` - 检查一致性
- `POST /state-recovery/rollback/:id` - 回滚状态

#### 🖥️ GPU (GPU 管理)
- `GET /gpu/info` - GPU 信息
- `GET /gpu/diagnostics` - GPU 诊断
- `GET /gpu/recommended-config` - 推荐配置

#### 📡 Physical Devices (物理设备)
- `GET /admin/physical-devices` - 物理设备列表
- `POST /admin/physical-devices/scan` - 扫描设备
- `POST /admin/physical-devices/:id/health-check` - 健康检查

**Swagger 特性:**
- ADB 命令示例丰富
- 设备状态流转图
- 配额检查流程说明

---

### 4. App Service (30003)

**功能:** APK 管理、应用安装、应用市场

**主要 API 分组:**

#### 📦 Apps (应用管理)
- `GET /apps` - 应用列表
- `POST /apps/upload` - 上传 APK
- `GET /apps/:id` - 应用详情
- `PATCH /apps/:id` - 更新应用信息
- `DELETE /apps/:id` - 删除应用

#### 🔧 App Installation (应用安装)
- `POST /apps/:id/install` - 安装应用到设备
- `POST /apps/:id/uninstall` - 卸载应用
- `GET /apps/installation/status/:jobId` - 安装状态

#### 🏪 App Market (应用市场)
- `GET /apps/market` - 市场应用列表
- `GET /apps/market/popular` - 热门应用
- `GET /apps/market/search` - 搜索应用

#### ✅ App Review (应用审核)
- `GET /apps/pending` - 待审核应用
- `POST /apps/:id/approve` - 批准应用
- `POST /apps/:id/reject` - 拒绝应用

**Swagger 特性:**
- 文件上传示例（multipart/form-data）
- APK 解析字段说明
- 安装流程状态码

---

### 5. Billing Service (30005)

**功能:** 计费、支付、订单、发票、余额

**主要 API 分组:**

#### 💳 Orders (订单管理)
- `GET /orders` - 订单列表
- `POST /orders` - 创建订单
- `GET /orders/:id` - 订单详情
- `POST /orders/:id/cancel` - 取消订单

#### 💰 Plans (套餐管理)
- `GET /plans` - 套餐列表
- `POST /plans` - 创建套餐
- `GET /plans/:id` - 套餐详情
- `PATCH /plans/:id` - 更新套餐

#### 📄 Invoices (发票管理)
- `GET /invoices` - 发票列表
- `POST /invoices` - 生成发票
- `POST /invoices/:id/publish` - 发布发票
- `POST /invoices/:id/pay` - 支付发票

#### 💸 Payments (支付管理)
- `POST /payments/create` - 创建支付
- `GET /payments/:id` - 支付详情
- `POST /payments/:id/refund` - 退款

#### 🏦 Balance (余额管理)
- `GET /balance/user/:userId` - 用户余额
- `POST /balance/recharge` - 充值
- `POST /balance/consume` - 消费
- `GET /balance/transactions` - 交易记录

#### 📊 Metering (计量统计)
- `GET /metering/user/:userId` - 用户使用量
- `GET /metering/device/:deviceId` - 设备使用量
- `POST /metering/start` - 开始计量
- `POST /metering/stop` - 停止计量

#### 📈 Stats (统计分析)
- `GET /stats/dashboard` - 仪表盘数据
- `GET /stats/revenue` - 收入统计
- `GET /stats/users` - 用户统计

#### 📑 Reports (报表)
- `GET /reports/revenue` - 收入报表
- `GET /reports/bills` - 账单报表
- `POST /reports/export` - 导出报表

#### ⚙️ Billing Rules (计费规则)
- `GET /billing-rules` - 计费规则列表
- `POST /billing-rules` - 创建规则
- `POST /billing-rules/calculate` - 计算费用

**Swagger 特性:**
- 支付流程时序图
- Saga 编排模式说明
- 货币计算精度说明

---

### 6. Notification Service (30006)

**功能:** 多渠道通知、WebSocket、邮件、短信

**主要 API 分组:**

#### 📬 Notifications (通知管理)
- `GET /notifications` - 通知列表
- `POST /notifications` - 创建通知
- `POST /notifications/broadcast` - 广播通知
- `GET /notifications/unread-count` - 未读数量
- `PATCH /notifications/:id/read` - 标记已读
- `DELETE /notifications/:id` - 删除通知

#### 📧 Templates (模板管理)
- `GET /templates` - 模板列表
- `POST /templates` - 创建模板
- `GET /templates/:id` - 模板详情
- `PATCH /templates/:id` - 更新模板
- `POST /templates/:id/preview` - 预览模板

#### 📱 SMS (短信通知)
- `POST /sms/send` - 发送短信
- `POST /sms/send-otp` - 发送验证码
- `POST /sms/verify-otp` - 验证验证码
- `GET /sms/stats` - 短信统计

#### ⚙️ Preferences (通知偏好)
- `GET /preferences` - 用户偏好
- `PATCH /preferences` - 更新偏好
- `POST /preferences/reset` - 重置为默认

**Swagger 特性:**
- Handlebars 模板语法说明
- 通知类型枚举
- WebSocket 连接示例

---

### 7. Proxy Service (30007)

**功能:** 代理池管理、供应商适配

**主要 API 分组:**

#### 🔌 Proxy Management (代理管理)
- `POST /api/v1/proxy/assign` - 分配代理
- `POST /api/v1/proxy/release` - 释放代理
- `GET /api/v1/proxy/list` - 代理列表
- `GET /api/v1/proxy/:id` - 代理详情

#### 📊 Statistics (统计)
- `GET /api/v1/proxy/stats` - 代理统计
- `GET /api/v1/proxy/health` - 健康统计

#### ⚙️ Admin (管理)
- `POST /api/v1/proxy/providers` - 添加供应商
- `PATCH /api/v1/proxy/providers/:id` - 更新供应商
- `POST /api/v1/proxy/pool/refill` - 补充代理池

**Swagger 特性:**
- 供应商类型说明（UltraThink, Brightdata 等）
- 代理协议支持（HTTP, SOCKS5）
- 地理位置选择

---

### 8. SMS Receive Service (30008)

**功能:** 虚拟号码管理、短信接收

**主要 API 分组:**

#### 📞 Virtual Numbers (虚拟号码)
- `POST /api/v1/sms-numbers/request` - 请求虚拟号码
- `GET /api/v1/sms-numbers/:numberId` - 号码详情
- `GET /api/v1/sms-numbers/:numberId/messages` - 接收的短信
- `POST /api/v1/sms-numbers/:numberId/cancel` - 取消号码

#### 📊 Status (状态)
- `GET /numbers/polling/status` - 轮询状态
- `GET /api/v1/sms-numbers/stats` - 统计信息

**Swagger 特性:**
- 平台切换逻辑（SMS-Activate, 5sim）
- 号码池管理说明
- 轮询机制详解

---

## 🧪 API 测试指南

### 1. 完整测试流程

#### Step 1: 登录获取 Token

```bash
# 方式 1: 通过 User Service
curl -X POST http://localhost:30001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 方式 2: 通过 API Gateway
curl -X POST http://localhost:30000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

响应:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "roles": ["super_admin"]
  }
}
```

#### Step 2: 使用 Token 调用 API

```bash
# 设置 Token 环境变量
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 调用需要认证的接口
curl -X GET http://localhost:30001/users \
  -H "Authorization: Bearer $TOKEN"
```

#### Step 3: 创建设备

```bash
# 1. 检查用户配额
curl -X GET http://localhost:30001/quotas/user/YOUR_USER_ID \
  -H "Authorization: Bearer $TOKEN"

# 2. 创建设备
curl -X POST http://localhost:30002/devices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Device",
    "deviceType": "redroid",
    "specs": {
      "cpuCores": 2,
      "memoryMB": 2048,
      "storageMB": 8192
    }
  }'

# 3. 启动设备
curl -X POST http://localhost:30002/devices/DEVICE_ID/start \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Swagger UI 测试技巧

#### 技巧 1: 使用 Schemas 查看数据结构

在 Swagger UI 底部，点击 **"Schemas"** 可以查看所有 DTO 和响应模型的完整结构。

#### 技巧 2: 使用 Try it out 功能

1. 点击接口右侧的 **"Try it out"** 按钮
2. 填写必填参数（带红色星号 `*` 的字段）
3. 可选参数可以留空
4. 点击 **"Execute"** 执行请求
5. 查看响应结果和状态码

#### 技巧 3: 复制 curl 命令

在响应区域，点击 **"Copy"** 按钮可以复制等效的 curl 命令，方便在终端重现请求。

#### 技巧 4: 查看响应示例

每个接口都有预定义的响应示例，点击 **"Example Value"** 查看完整响应结构。

---

## 🛠️ 开发者指南

### 1. 添加新的 API 接口

#### Step 1: 创建 DTO

```typescript
// create-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: '用户名',
    example: 'john_doe',
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({
    description: '邮箱地址',
    example: 'john@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: '密码',
    example: 'StrongP@ssw0rd',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}
```

#### Step 2: 添加 Controller 装饰器

```typescript
// users.controller.ts
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  @Post()
  @ApiOperation({ summary: '创建用户', description: '创建一个新用户账户' })
  @ApiResponse({
    status: 201,
    description: '用户创建成功',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 409, description: '用户名或邮箱已存在' })
  async createUser(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
```

#### Step 3: 定义响应 DTO

```typescript
// user-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: '用户 ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: '用户名', example: 'john_doe' })
  username: string;

  @ApiProperty({ description: '邮箱', example: 'john@example.com' })
  email: string;

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00Z' })
  createdAt: Date;
}
```

### 2. 更新 Swagger 配置

如需修改全局 Swagger 配置，编辑 `src/main.ts`:

```typescript
const config = new DocumentBuilder()
  .setTitle('Service Name API')
  .setDescription('API description here')
  .setVersion('1.0.0')
  .addBearerAuth()
  .addTag('tag1', '标签1的描述')
  .addTag('tag2', '标签2的描述')
  .build();
```

---

## 📚 最佳实践

### 1. API 文档撰写规范

✅ **好的实践:**
- 使用 `@ApiOperation` 提供清晰的接口描述
- 使用 `@ApiResponse` 列出所有可能的响应状态码
- 使用 `@ApiProperty` 为每个 DTO 字段添加示例值
- 使用中文描述，方便团队理解

❌ **避免:**
- 遗漏必填参数说明
- 缺少响应示例
- 使用模糊的描述（如"获取数据"）
- 忘记添加 `@ApiBearerAuth` 装饰器

### 2. DTO 设计规范

```typescript
// ✅ 好的 DTO 设计
export class CreateDeviceDto {
  @ApiProperty({
    description: '设备名称',
    example: 'My Cloud Phone',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: '设备类型',
    enum: DeviceType,
    example: DeviceType.REDROID,
  })
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @ApiProperty({
    description: '设备规格',
    type: DeviceSpecsDto,
  })
  @ValidateNested()
  @Type(() => DeviceSpecsDto)
  specs: DeviceSpecsDto;
}
```

### 3. 响应格式统一

所有 API 响应应遵循统一格式：

**成功响应:**
```json
{
  "id": "uuid",
  "data": { ... },
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**错误响应:**
```json
{
  "statusCode": 400,
  "message": "请求参数错误",
  "error": "Bad Request",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## 🔍 故障排查

### 问题 1: Swagger 页面无法访问

**症状:** 访问 `/docs` 返回 404

**解决方案:**
1. 检查服务是否启动: `pm2 list`
2. 检查端口是否正确
3. 确认 `main.ts` 中 `SwaggerModule.setup` 路径为 `'docs'`
4. 重启服务: `pm2 restart service-name`

### 问题 2: JWT 认证失败

**症状:** 点击 Authorize 后，请求仍然返回 401

**解决方案:**
1. 确认 Token 是否过期（默认24小时）
2. 重新登录获取新 Token
3. 检查是否正确输入 Token（不需要 `Bearer ` 前缀）
4. 确认所有服务的 `JWT_SECRET` 配置一致

### 问题 3: 接口没有显示在 Swagger 中

**症状:** 新添加的接口不在文档中

**解决方案:**
1. 确保 Controller 添加了 `@ApiTags()` 装饰器
2. 确保方法添加了 `@ApiOperation()` 装饰器
3. 检查 Controller 是否在 Module 中注册
4. 重启服务让配置生效

### 问题 4: 文件上传接口测试失败

**症状:** 上传 APK 返回 400 或超时

**解决方案:**
1. 检查文件大小是否超过限制（默认 200MB）
2. 确认使用 `multipart/form-data` 格式
3. 在 Swagger UI 中选择文件而非粘贴内容
4. 检查 MinIO 服务是否正常运行

---

## 📊 Swagger 配置对比

### 修复前 vs 修复后

| 服务 | 修复前路径 | 修复后路径 | 修复前版本 | 修复后版本 | JWT 认证 |
|------|-----------|-----------|-----------|-----------|---------|
| api-gateway | /docs | /docs | 1.0.0 | 1.0.0 | ✅ → ✅ |
| user-service | /docs | /docs | 1.0.0 | 1.0.0 | ✅ → ✅ |
| device-service | /docs | /docs | 1.0.0 | 1.0.0 | ✅ → ✅ |
| app-service | /docs | /docs | 1.0.0 | 1.0.0 | ✅ → ✅ |
| billing-service | /docs | /docs | 1.0.0 | 1.0.0 | ✅ → ✅ |
| notification-service | /docs | /docs | 1.0.0 | 1.0.0 | ✅ → ✅ |
| **proxy-service** | **/api-docs** | **/docs** ✅ | **1.0** | **1.0.0** ✅ | ✅ → ✅ |
| **sms-receive-service** | **/api/docs** | **/docs** ✅ | **1.0** | **1.0.0** ✅ | **❌ → ✅** |

### 修复内容

**proxy-service:**
- ✅ 路径统一: `/api-docs` → `/docs`
- ✅ 版本规范: `1.0` → `1.0.0`
- ✅ 启动日志更新

**sms-receive-service:**
- ✅ 路径统一: `/api/docs` → `/docs`
- ✅ 版本规范: `1.0` → `1.0.0`
- ✅ **新增 JWT 认证配置** (addBearerAuth)
- ✅ 启动日志更新
- ✅ 默认端口修正: 30007 → 30008

---

## ✅ 验证清单

- [x] 所有8个服务已配置 Swagger
- [x] 所有服务路径统一为 `/docs`
- [x] 所有服务版本统一为 `1.0.0`
- [x] 所有服务已配置 JWT 认证（addBearerAuth）
- [x] proxy-service 路径和版本已修正
- [x] sms-receive-service 路径、版本和认证已修正
- [x] 所有服务启动日志已更新

---

## 📞 支持

**文档相关问题:**
- 查看 [NestJS Swagger 官方文档](https://docs.nestjs.com/openapi/introduction)
- 查看 [OpenAPI 规范](https://swagger.io/specification/)

**平台相关问题:**
- 项目文档: `/docs` 目录
- 健康检查: `http://localhost:PORT/health`
- 日志查看: `pm2 logs service-name`

---

**文档版本:** 1.0.0
**最后更新:** 2025-11-02
**维护者:** Cloud Phone Platform Team
