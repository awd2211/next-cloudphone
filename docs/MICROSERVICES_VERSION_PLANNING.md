# 微服务版本规划方案

**制定时间:** 2025-11-02
**适用范围:** Cloud Phone Platform 所有后端微服务
**版本规范:** Semantic Versioning 2.0.0

---

## 📋 目录

1. [版本规范概述](#版本规范概述)
2. [语义化版本详解](#语义化版本详解)
3. [API 版本控制策略](#api-版本控制策略)
4. [服务版本管理](#服务版本管理)
5. [版本兼容性策略](#版本兼容性策略)
6. [版本升级路线图](#版本升级路线图)
7. [版本命名规范](#版本命名规范)
8. [实施指南](#实施指南)

---

## 🎯 版本规范概述

### 版本号格式

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
```

**示例:**
- `1.0.0` - 稳定版本
- `1.1.0-beta.1` - Beta 测试版
- `1.1.0-rc.2` - Release Candidate
- `1.1.0+20251102` - 带构建元数据

### 当前版本现状

| 服务 | 当前版本 | API 版本 | 下一版本 |
|------|---------|---------|---------|
| api-gateway | 1.0.0 | - | 1.1.0 |
| user-service | 1.0.0 | v1 | 1.1.0 |
| device-service | 1.0.0 | v1 | 1.1.0 |
| app-service | 1.0.0 | v1 | 1.0.1 |
| billing-service | 1.0.0 | v1 | 1.1.0 |
| notification-service | 1.0.0 | v1 | 1.0.1 |
| proxy-service | 1.0.0 | v1 | 1.0.1 |
| sms-receive-service | 1.0.0 | v1 | 1.0.1 |

---

## 📖 语义化版本详解

### MAJOR 版本（主版本号）

**升级场景:**
- ❌ **破坏性变更**（Breaking Changes）
- 🔄 API 接口不兼容的修改
- 🗑️ 移除已弃用的功能
- 🏗️ 架构重大重构

**示例:**
```
1.x.x → 2.0.0  # 移除旧 API，不向后兼容
2.x.x → 3.0.0  # 数据库 Schema 重大变更
```

**Breaking Changes 示例:**
- 修改已有 API 的响应格式
- 移除必填字段
- 修改字段数据类型
- 修改端点路径

### MINOR 版本（次版本号）

**升级场景:**
- ✨ **新增功能**（向后兼容）
- 🆕 新增 API 接口
- ⚡ 性能优化
- 🔧 内部重构（不影响 API）

**示例:**
```
1.0.x → 1.1.0  # 新增设备快照功能
1.1.x → 1.2.0  # 新增批量操作接口
```

**功能示例:**
- 新增可选字段
- 新增查询参数
- 新增 API 端点
- 新增事件类型

### PATCH 版本（补丁版本号）

**升级场景:**
- 🐛 **Bug 修复**
- 🔒 安全漏洞修补
- 📝 文档更新
- 🧪 测试完善

**示例:**
```
1.0.0 → 1.0.1  # 修复设备状态同步 Bug
1.0.1 → 1.0.2  # 修复内存泄漏
```

**修复示例:**
- 修复逻辑错误
- 修复数据验证问题
- 修复性能问题
- 修复并发问题

### 预发布版本

**格式:** `MAJOR.MINOR.PATCH-PRERELEASE`

**类型:**

1. **alpha** - 内部测试版
   ```
   1.1.0-alpha.1  # 第1个 Alpha 版本
   1.1.0-alpha.2  # 第2个 Alpha 版本
   ```

2. **beta** - 公开测试版
   ```
   1.1.0-beta.1   # 第1个 Beta 版本
   1.1.0-beta.2   # 第2个 Beta 版本
   ```

3. **rc (Release Candidate)** - 候选发布版
   ```
   1.1.0-rc.1     # 第1个 RC 版本
   1.1.0-rc.2     # 第2个 RC 版本
   ```

**发布流程:**
```
1.1.0-alpha.1 → 1.1.0-alpha.2 → 1.1.0-beta.1 → 1.1.0-rc.1 → 1.1.0
```

### 构建元数据

**格式:** `MAJOR.MINOR.PATCH+BUILD`

**示例:**
```
1.0.0+20251102.1234    # 日期 + 构建号
1.0.0+git.abc123       # Git commit hash
1.0.0+ci.456           # CI 构建号
```

---

## 🌐 API 版本控制策略

### 方案对比

| 方案 | 示例 | 优点 | 缺点 | 推荐度 |
|------|------|------|------|--------|
| **URL 路径** | `/api/v1/users` | 清晰、易缓存 | URL 变长 | ⭐⭐⭐⭐⭐ |
| **Header** | `Accept-Version: v1` | URL 简洁 | 调试困难 | ⭐⭐⭐ |
| **Query 参数** | `/users?version=v1` | 灵活 | 容易遗忘 | ⭐⭐ |
| **自定义 Header** | `X-API-Version: v1` | 不污染 URL | 非标准 | ⭐⭐ |

### 推荐方案：URL 路径版本

**架构设计:**

```
API Gateway (30000)
    ↓
    ├─→ /api/v1/* → 后端服务 v1
    ├─→ /api/v2/* → 后端服务 v2
    └─→ /api/v3/* → 后端服务 v3
```

**URL 结构:**

```
https://api.cloudphone.com/api/v1/users
                          ↑       ↑     ↑
                          |       |     └─ 资源
                          |       └─ API 版本
                          └─ API 前缀
```

### 版本路由实现

#### API Gateway 配置

```typescript
// backend/api-gateway/src/proxy/proxy.controller.ts

// ========== API v1 路由 ==========
@UseGuards(JwtAuthGuard)
@All('api/v1/users/*path')
async proxyUsersV1(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy('users', req, res, 'v1');
}

@UseGuards(JwtAuthGuard)
@All('api/v1/devices/*path')
async proxyDevicesV1(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy('devices', req, res, 'v1');
}

// ========== API v2 路由 (未来) ==========
@UseGuards(JwtAuthGuard)
@All('api/v2/users/*path')
async proxyUsersV2(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy('users', req, res, 'v2');
}

@UseGuards(JwtAuthGuard)
@All('api/v2/devices/*path')
async proxyDevicesV2(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy('devices', req, res, 'v2');
}
```

#### 后端服务版本控制器

```typescript
// backend/user-service/src/users/v1/users.controller.v1.ts
@ApiTags('Users v1')
@Controller('api/v1/users')
export class UsersControllerV1 {
  @Get()
  async findAll(): Promise<UserDto[]> {
    // v1 implementation
  }
}

// backend/user-service/src/users/v2/users.controller.v2.ts
@ApiTags('Users v2')
@Controller('api/v2/users')
export class UsersControllerV2 {
  @Get()
  async findAll(): Promise<UserV2Dto[]> {
    // v2 implementation with new fields
  }
}
```

### 多版本共存策略

**目录结构:**

```
backend/user-service/src/
├── users/
│   ├── v1/                    # API v1
│   │   ├── users.controller.v1.ts
│   │   ├── users.service.v1.ts
│   │   └── dto/
│   │       ├── user.dto.v1.ts
│   │       └── create-user.dto.v1.ts
│   ├── v2/                    # API v2
│   │   ├── users.controller.v2.ts
│   │   ├── users.service.v2.ts
│   │   └── dto/
│   │       ├── user.dto.v2.ts
│   │       └── create-user.dto.v2.ts
│   ├── users.module.ts        # 注册所有版本
│   └── entities/
│       └── user.entity.ts     # 共享实体
```

**Module 注册:**

```typescript
// users.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [
    UsersControllerV1,  // v1 API
    UsersControllerV2,  // v2 API
  ],
  providers: [
    UsersServiceV1,
    UsersServiceV2,
    SharedUserService,  // 共享业务逻辑
  ],
  exports: [UsersServiceV1, UsersServiceV2],
})
export class UsersModule {}
```

### Swagger 多版本展示

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ===== API v1 文档 =====
  const configV1 = new DocumentBuilder()
    .setTitle('User Service API v1')
    .setDescription('Stable API - 生产环境使用')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const documentV1 = SwaggerModule.createDocument(app, configV1, {
    include: [UsersModuleV1], // 只包含 v1 模块
  });
  SwaggerModule.setup('docs/v1', app, documentV1);

  // ===== API v2 文档 =====
  const configV2 = new DocumentBuilder()
    .setTitle('User Service API v2')
    .setDescription('New features - 测试中')
    .setVersion('2.0.0-beta.1')
    .addBearerAuth()
    .build();
  const documentV2 = SwaggerModule.createDocument(app, configV2, {
    include: [UsersModuleV2], // 只包含 v2 模块
  });
  SwaggerModule.setup('docs/v2', app, documentV2);

  await app.listen(3000);
}
```

**访问地址:**
- v1 文档: http://localhost:30001/docs/v1
- v2 文档: http://localhost:30001/docs/v2

---

## 🔧 服务版本管理

### 多层版本管理

```
┌─────────────────────────────────────┐
│   服务版本: 1.2.3                    │  ← 整体服务版本
├─────────────────────────────────────┤
│   API 版本: v1, v2                   │  ← 接口版本
├─────────────────────────────────────┤
│   Schema 版本: 20251102_001         │  ← 数据库版本
├─────────────────────────────────────┤
│   Event 版本: device.created.v1     │  ← 事件版本
└─────────────────────────────────────┘
```

### 1. 服务代码版本

**位置:** `package.json`

```json
{
  "name": "@cloudphone/user-service",
  "version": "1.2.3",
  "description": "User management microservice"
}
```

**管理方式:**
- 使用 `npm version` 命令升级
- 自动更新 package.json
- 自动创建 Git tag

```bash
# PATCH 版本 (1.0.0 → 1.0.1)
npm version patch

# MINOR 版本 (1.0.1 → 1.1.0)
npm version minor

# MAJOR 版本 (1.1.0 → 2.0.0)
npm version major

# 预发布版本 (1.1.0 → 1.1.1-beta.0)
npm version prerelease --preid=beta
```

### 2. API 接口版本

**独立于服务版本**

| 服务版本 | API v1 | API v2 | API v3 |
|---------|--------|--------|--------|
| 1.0.0 | ✅ | ❌ | ❌ |
| 1.5.0 | ✅ | ✅ Beta | ❌ |
| 2.0.0 | ⚠️ 弃用 | ✅ | ✅ Beta |
| 3.0.0 | ❌ 移除 | ✅ | ✅ |

**生命周期:**
1. **Active** - 正常维护，新功能和 Bug 修复
2. **Maintenance** - 仅 Bug 修复和安全更新
3. **Deprecated** - 计划弃用，建议迁移
4. **End of Life** - 停止支持，强制升级

**时间线示例:**

```
API v1:  [==== Active ====][== Maintenance ==][= Deprecated =][ EOL ]
API v2:                    [===== Active =====][== Maintenance ==]
API v3:                                        [===== Active =====]
         ↑                 ↑                   ↑                  ↑
      2024-01           2025-01             2026-01            2027-01
```

### 3. 数据库 Schema 版本

**使用 TypeORM 迁移**

```bash
# 生成迁移文件
npm run migration:generate -- -n AddUserPhoneNumber

# 迁移文件名包含时间戳和描述
migrations/20251102123456-AddUserPhoneNumber.ts
```

**迁移文件:**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPhoneNumber20251102123456 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Schema 升级逻辑
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN phone_number VARCHAR(20) NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚逻辑
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN phone_number
    `);
  }
}
```

### 4. 事件版本

**RabbitMQ 事件命名:**

```
{service}.{entity}.{action}.{version}
```

**示例:**

```typescript
// v1 事件（当前）
eventBus.publish('device.created.v1', {
  deviceId: 'uuid',
  userId: 'uuid',
  specs: { cpuCores: 2 }
});

// v2 事件（未来 - 新增字段）
eventBus.publish('device.created.v2', {
  deviceId: 'uuid',
  userId: 'uuid',
  tenantId: 'uuid',  // 新增
  specs: {
    cpuCores: 2,
    gpuModel: 'T4'   // 新增
  }
});
```

**消费者兼容:**

```typescript
// 同时订阅 v1 和 v2
@RabbitSubscribe({
  exchange: 'cloudphone.events',
  routingKey: ['device.created.v1', 'device.created.v2'],
  queue: 'billing-service.device-events',
})
async handleDeviceCreated(event: DeviceCreatedEvent) {
  // 根据事件版本处理
  if (event._version === 'v1') {
    // 处理 v1 逻辑
  } else if (event._version === 'v2') {
    // 处理 v2 逻辑
  }
}
```

---

## 🔄 版本兼容性策略

### 1. 向后兼容原则

**API 设计规则:**

✅ **允许的变更（向后兼容）:**
- 新增可选字段
- 新增 API 端点
- 新增查询参数（可选）
- 新增响应字段（客户端应忽略未知字段）
- 新增枚举值（客户端应有默认处理）

❌ **禁止的变更（破坏兼容性）:**
- 移除字段
- 修改字段类型
- 修改字段含义
- 移除 API 端点
- 修改必填字段

**示例:**

```typescript
// ✅ 向后兼容 - 新增可选字段
interface UserDto {
  id: string;
  username: string;
  email: string;
  phone?: string;        // 新增，可选
  avatar?: string;       // 新增，可选
}

// ❌ 不兼容 - 修改字段类型
interface UserDto {
  id: string;
  username: string;
  email: string;
  createdAt: number;     // 从 Date 改为 number - Breaking!
}

// ❌ 不兼容 - 移除字段
interface UserDto {
  id: string;
  username: string;
  // email: string;      // 移除 - Breaking!
}
```

### 2. 弃用策略

**步骤:**

1. **宣布弃用** (Deprecated)
   - 在 Swagger 中标注 `@deprecated`
   - 在响应 Header 中添加 `X-API-Deprecated: true`
   - 发布公告，说明替代方案

2. **提供迁移期** (6-12个月)
   - 老版本继续运行
   - 提供迁移指南
   - 监控使用量

3. **强制升级** (Sunset)
   - 返回 410 Gone 状态码
   - 响应中包含升级说明
   - 完全停止服务

**实现示例:**

```typescript
@ApiTags('users')
@Controller('api/v1/users')
export class UsersControllerV1 {
  @Get(':id')
  @ApiOperation({
    summary: '获取用户信息',
    deprecated: true,  // ⚠️ 标记弃用
    description: '此接口将在 2025-12-31 停止服务，请使用 /api/v2/users/:id'
  })
  @ApiResponse({
    status: 200,
    headers: {
      'X-API-Deprecated': {
        description: 'API 已弃用',
        schema: { type: 'boolean', example: true }
      },
      'X-API-Sunset-Date': {
        description: '停止服务日期',
        schema: { type: 'string', example: '2025-12-31' }
      }
    }
  })
  async findOne(
    @Param('id') id: string,
    @Res() res: Response
  ) {
    // 添加弃用警告 Header
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('X-API-Sunset-Date', '2025-12-31');
    res.setHeader('Link', '</api/v2/users>; rel="successor-version"');

    const user = await this.usersService.findOne(id);
    return res.json(user);
  }
}
```

### 3. 破坏性变更处理

**必须创建新版本 API**

```
场景: 需要修改用户响应格式

Before (v1):
{
  "id": "uuid",
  "name": "John Doe",
  "createdAt": "2024-01-01T00:00:00Z"
}

After (v2):
{
  "id": "uuid",
  "firstName": "John",     // 分离姓名
  "lastName": "Doe",
  "profile": {             // 嵌套结构
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-06-01T00:00:00Z"
  }
}

解决方案:
1. 保留 v1 API 不变
2. 创建新的 v2 API
3. 同时维护 v1 和 v2
4. 逐步迁移客户端
5. 在适当时间弃用 v1
```

---

## 📅 版本升级路线图

### 当前状态 (2025-11)

**版本:** 1.0.0
**API:** v1
**状态:** 生产环境稳定运行

**核心功能:**
- ✅ 用户管理 & 认证
- ✅ 设备 CRUD & 控制
- ✅ 应用安装
- ✅ 计费系统
- ✅ 通知服务
- ✅ 代理管理
- ✅ 短信接收

---

### Phase 1: 1.1.0 (2025-12)

**类型:** MINOR 版本（新功能）
**发布日期:** 2025-12-15
**升级服务:**
- user-service: 1.0.0 → 1.1.0
- device-service: 1.0.0 → 1.1.0
- billing-service: 1.0.0 → 1.1.0

**新增功能:**

**user-service 1.1.0**
- ✨ 多租户增强（子账户管理）
- ✨ SSO 单点登录集成
- ✨ 用户标签系统
- ⚡ 权限检查性能优化

**device-service 1.1.0**
- ✨ 设备分组批量操作
- ✨ 自动化脚本执行
- ✨ 设备健康评分
- ⚡ 端口分配优化

**billing-service 1.1.0**
- ✨ 多币种支持
- ✨ 发票自动化
- ✨ 预算告警
- ⚡ 计量精度提升

**向后兼容:** ✅ 完全兼容

---

### Phase 2: 1.2.0 (2026-03)

**类型:** MINOR 版本（新功能）
**发布日期:** 2026-03-01
**升级服务:** 全部服务

**新增功能:**

**全平台:**
- ✨ GraphQL API 支持
- ✨ WebSocket 实时推送增强
- ✨ API 限流动态调整
- 📊 分布式追踪集成 (Jaeger)

**device-service 1.2.0**
- ✨ GPU 虚拟化支持
- ✨ 设备录屏功能
- ✨ 云游戏优化

**app-service 1.2.0**
- ✨ 应用自动更新
- ✨ 应用商店集成

**向后兼容:** ✅ 完全兼容

---

### Phase 3: 2.0.0 (2026-08)

**类型:** MAJOR 版本（破坏性变更）
**发布日期:** 2026-08-01
**API 版本:** v1 → v2

**破坏性变更:**

**API v2 改进:**

1. **统一响应格式**
   ```typescript
   // v1 (各服务响应格式不一致)
   { "id": "...", "name": "..." }

   // v2 (统一格式)
   {
     "data": { "id": "...", "name": "..." },
     "meta": {
       "version": "v2",
       "timestamp": "2026-08-01T00:00:00Z",
       "requestId": "uuid"
     }
   }
   ```

2. **RESTful 规范增强**
   ```
   // v1
   POST /devices/start/:id

   // v2 (更符合 REST)
   POST /devices/:id/actions
   { "action": "start" }
   ```

3. **分页参数统一**
   ```
   // v1 (各服务不一致)
   ?page=1&limit=10
   ?offset=0&size=10

   // v2 (统一)
   ?page=1&pageSize=10
   ```

4. **错误码标准化**
   ```typescript
   // v1
   { "statusCode": 400, "message": "Bad Request" }

   // v2
   {
     "error": {
       "code": "VALIDATION_FAILED",
       "message": "请求参数验证失败",
       "details": [
         { "field": "username", "message": "用户名不能为空" }
       ]
     }
   }
   ```

**迁移策略:**
- v1 API 进入 Maintenance 阶段（18个月）
- v1 在 2028-02-01 停止服务
- 提供自动化迁移工具
- 并行运行 v1 和 v2

---

### Phase 4: 2.1.0 (2027-01)

**类型:** MINOR 版本
**发布日期:** 2027-01-01

**新增功能:**
- ✨ AI 辅助设备管理
- ✨ 智能运维告警
- ✨ 成本优化建议
- ✨ 自动扩缩容增强

**向后兼容:** ✅ 完全兼容 v2

---

### Phase 5: 3.0.0 (2028-01)

**类型:** MAJOR 版本
**发布日期:** 2028-01-01
**API 版本:** v2 → v3

**重大升级:**
- 🏗️ 微服务拆分优化
- 🔄 事件溯源全面应用
- ⚡ 性能优化 10x
- 🌐 多区域部署支持

**迁移策略:**
- v1 API 完全停止服务
- v2 API 进入 Maintenance 阶段

---

## 📜 版本命名规范

### Git 分支命名

```
main                    # 主分支，始终是最新稳定版
release/v1.0.x          # 1.0.x 系列的发布分支
release/v1.1.x          # 1.1.x 系列的发布分支
release/v2.0.x          # 2.0.x 系列的发布分支
develop                 # 开发分支
feature/USER-123        # 功能分支
bugfix/USER-456         # Bug 修复分支
hotfix/v1.0.1           # 紧急修复分支
```

### Git Tag 命名

```bash
# 格式
{service-name}/v{version}

# 示例
user-service/v1.0.0
user-service/v1.0.1
user-service/v1.1.0-beta.1
user-service/v2.0.0

# 创建 Tag
git tag -a user-service/v1.0.1 -m "Release user-service v1.0.1"
git push origin user-service/v1.0.1
```

### Docker 镜像命名

```bash
# 格式
registry/project/{service-name}:{version}

# 示例
cloudphone.azurecr.io/cloudphone/user-service:1.0.0
cloudphone.azurecr.io/cloudphone/user-service:1.0.1
cloudphone.azurecr.io/cloudphone/user-service:1.1.0-beta.1
cloudphone.azurecr.io/cloudphone/user-service:latest  # 指向最新稳定版

# 构建镜像
docker build -t cloudphone/user-service:1.0.1 .
docker tag cloudphone/user-service:1.0.1 cloudphone/user-service:latest
```

### Helm Chart 版本

```yaml
# Chart.yaml
apiVersion: v2
name: user-service
version: 1.0.1           # Chart 版本
appVersion: 1.0.1        # 应用版本
description: User management microservice
```

### NPM Package 版本

```json
{
  "name": "@cloudphone/user-service",
  "version": "1.0.1",
  "private": true
}
```

---

## 🚀 实施指南

### 1. 版本升级 Checklist

#### 升级 PATCH 版本 (Bug 修复)

```bash
# 1. 切换到 release 分支
git checkout release/v1.0.x

# 2. 创建 hotfix 分支
git checkout -b hotfix/v1.0.1

# 3. 修复 Bug
# ... 编写代码 ...

# 4. 更新版本号
npm version patch  # 1.0.0 → 1.0.1

# 5. 提交变更
git add .
git commit -m "fix: 修复设备状态同步问题"

# 6. 合并到 release 分支
git checkout release/v1.0.x
git merge hotfix/v1.0.1

# 7. 创建 Tag
git tag -a user-service/v1.0.1 -m "Release user-service v1.0.1"

# 8. 推送
git push origin release/v1.0.x
git push origin user-service/v1.0.1

# 9. 构建和部署
docker build -t cloudphone/user-service:1.0.1 .
docker push cloudphone/user-service:1.0.1

# 10. 更新 Swagger 版本
# 修改 main.ts 中的 .setVersion('1.0.1')
```

#### 升级 MINOR 版本 (新功能)

```bash
# 1. 在 develop 分支开发新功能
git checkout develop
git checkout -b feature/multi-tenant

# 2. 完成开发
# ... 编写代码 ...

# 3. 合并到 develop
git checkout develop
git merge feature/multi-tenant

# 4. 创建 release 分支
git checkout -b release/v1.1.x

# 5. 更新版本号
npm version minor  # 1.0.1 → 1.1.0

# 6. 测试
npm test
npm run build

# 7. 创建 Tag
git tag -a user-service/v1.1.0 -m "Release user-service v1.1.0"

# 8. 合并到 main
git checkout main
git merge release/v1.1.x

# 9. 推送
git push origin main
git push origin release/v1.1.x
git push origin user-service/v1.1.0

# 10. 部署
kubectl set image deployment/user-service \
  user-service=cloudphone/user-service:1.1.0
```

#### 升级 MAJOR 版本 (破坏性变更)

```bash
# 1. 创建 v2 分支
git checkout -b release/v2.0.x

# 2. 实现 v2 API
mkdir -p src/users/v2
# ... 实现 v2 controllers 和 services ...

# 3. 更新 Swagger 配置
# 添加 v2 文档配置

# 4. 更新版本号
npm version major  # 1.1.0 → 2.0.0

# 5. 全面测试
npm run test
npm run test:e2e

# 6. 创建 Tag
git tag -a user-service/v2.0.0 -m "Release user-service v2.0.0"

# 7. 并行部署
# 保留 v1 deployment
# 创建新的 v2 deployment
kubectl apply -f k8s/user-service-v2-deployment.yaml

# 8. 灰度发布
# 使用 Istio/Nginx 实现流量切分
# 10% → 50% → 100%

# 9. 监控和回滚准备
# 密切监控错误率和性能指标
```

### 2. API Gateway 版本路由配置

```typescript
// backend/api-gateway/src/proxy/proxy.service.ts

export class ProxyService {
  private readonly serviceRoutes: Map<string, ServiceVersionConfig> = new Map([
    ['users', {
      v1: {
        url: process.env.USER_SERVICE_V1_URL || 'http://localhost:30001',
        healthCheck: '/health',
      },
      v2: {
        url: process.env.USER_SERVICE_V2_URL || 'http://localhost:30011',
        healthCheck: '/health',
      },
    }],
    // ... 其他服务
  ]);

  async routeRequest(
    serviceName: string,
    version: string,
    path: string,
  ): Promise<Observable<AxiosResponse>> {
    const config = this.serviceRoutes.get(serviceName);

    if (!config || !config[version]) {
      throw new Error(`Service ${serviceName} version ${version} not found`);
    }

    const targetUrl = `${config[version].url}${path}`;
    return this.httpService.request({ url: targetUrl, ... });
  }
}
```

### 3. 版本监控和告警

```yaml
# Prometheus 告警规则
groups:
  - name: api_version_deprecation
    rules:
      - alert: DeprecatedAPIUsage
        expr: |
          sum(rate(http_requests_total{api_version="v1",deprecated="true"}[5m])) > 100
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Deprecated API v1 still receiving high traffic"
          description: "API v1 receives {{ $value }} req/s, migration needed"

      - alert: APIVersionErrorRate
        expr: |
          sum(rate(http_requests_total{api_version="v2",status=~"5.."}[5m])) /
          sum(rate(http_requests_total{api_version="v2"}[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "API v2 error rate > 5%"
          description: "Consider rolling back to v1"
```

---

## 📊 版本对比表

### 服务版本演进

| 时间 | user-service | device-service | billing-service | API Gateway |
|------|--------------|----------------|-----------------|-------------|
| 2025-11 | 1.0.0 | 1.0.0 | 1.0.0 | 1.0.0 |
| 2025-12 | 1.1.0 | 1.1.0 | 1.1.0 | 1.0.1 |
| 2026-03 | 1.2.0 | 1.2.0 | 1.2.0 | 1.1.0 |
| 2026-08 | 2.0.0 | 2.0.0 | 2.0.0 | 2.0.0 |
| 2027-01 | 2.1.0 | 2.1.0 | 2.1.0 | 2.0.1 |
| 2028-01 | 3.0.0 | 3.0.0 | 3.0.0 | 3.0.0 |

### API 版本生命周期

| API 版本 | 引入时间 | Active 期 | Maintenance 期 | Deprecated 期 | EOL 时间 |
|---------|---------|-----------|----------------|---------------|----------|
| v1 | 2025-01 | 2025-01 ~ 2026-08 | 2026-08 ~ 2027-08 | 2027-08 ~ 2028-02 | 2028-02 |
| v2 | 2026-08 | 2026-08 ~ 2028-01 | 2028-01 ~ 2029-01 | 2029-01 ~ 2029-08 | 2029-08 |
| v3 | 2028-01 | 2028-01 ~ ... | ... | ... | ... |

---

## ✅ 总结

### 版本管理核心原则

1. **语义化版本** - 遵循 SemVer 2.0.0 规范
2. **向后兼容** - MINOR 和 PATCH 必须向后兼容
3. **多版本并存** - 重大升级时保留老版本
4. **平滑迁移** - 提供充足的迁移期和工具
5. **清晰文档** - 每个版本都有详细文档和变更日志

### 快速参考

```bash
# 查看当前版本
cat package.json | grep version

# 升级补丁版本
npm version patch

# 升级次版本
npm version minor

# 升级主版本
npm version major

# 查看所有 Git Tags
git tag -l "user-service/*"

# 查看 Docker 镜像版本
docker images | grep user-service
```

---

**文档版本:** 1.0.0
**最后更新:** 2025-11-02
**维护者:** Cloud Phone Platform Architecture Team
