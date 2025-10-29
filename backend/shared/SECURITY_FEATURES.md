# 安全功能使用指南

本文档说明 @cloudphone/shared 模块提供的所有安全功能及其使用方法。

## 目录

1. [API 速率限制](#api-速率限制)
2. [输入验证和清理](#输入验证和清理)
3. [SQL 注入防护](#sql-注入防护)
4. [自定义验证装饰器](#自定义验证装饰器)
5. [数据库查询审计](#数据库查询审计)
6. [集成示例](#集成示例)

---

## API 速率限制

### 功能概述

提供三层速率限制保护:
- **RateLimitMiddleware** - 基于 Redis 滑动窗口的速率限制
- **IPBlacklistMiddleware** - IP 黑名单管理
- **AutoBanMiddleware** - 自动封禁恶意 IP

### 基本使用

#### 方法 1: 导入 SecurityModule（推荐）

在 `app.module.ts` 中:

```typescript
import { SecurityModule } from '@cloudphone/shared';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SecurityModule, // 自动启用所有安全中间件
    // ... 其他模块
  ],
})
export class AppModule {}
```

#### 方法 2: 手动配置中间件

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import {
  RateLimitMiddleware,
  IPBlacklistMiddleware,
  AutoBanMiddleware,
} from '@cloudphone/shared';

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // IP 黑名单 - 应用到所有路由
    consumer
      .apply(IPBlacklistMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // 速率限制 - 排除健康检查端点
    consumer
      .apply(RateLimitMiddleware)
      .exclude({ path: 'health', method: RequestMethod.GET })
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // 自动封禁
    consumer
      .apply(AutoBanMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
```

### 环境变量配置

```bash
# 速率限制
RATE_LIMIT_ENABLED=true
RATE_LIMIT_DEFAULT=100           # 默认限制: 100 请求/分钟
RATE_LIMIT_WINDOW=60             # 时间窗口: 60 秒

# IP 黑名单
IP_BLACKLIST_ENABLED=true

# 自动封禁
AUTO_BAN_ENABLED=true
AUTO_BAN_MAX_FAILURES=10         # 失败次数阈值
AUTO_BAN_DURATION=3600           # 封禁时长: 3600 秒

# Redis 连接
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 端点级别的速率限制

默认限制已针对不同端点类型预配置:

| 端点类型 | 路径模式 | 限制 | 窗口 |
|---------|---------|------|------|
| 认证 | `/auth/login`, `/auth/register` | 5 次 | 60 秒 |
| 密码重置 | `/auth/reset-password` | 3 次 | 300 秒 |
| 设备创建 | `/devices` POST | 100 次 | 60 秒 |
| 设备控制 | `/devices/:id/control` | 200 次 | 60 秒 |
| 支付 | `/payments` | 5 次 | 300 秒 |

### 手动管理 IP 黑名单

```typescript
import { IPBlacklistMiddleware } from '@cloudphone/shared';

@Injectable()
export class AdminService {
  constructor(private ipBlacklist: IPBlacklistMiddleware) {}

  async banIP(ip: string) {
    await this.ipBlacklist.addToBlacklist(ip, 86400); // 封禁 24 小时
  }

  async unbanIP(ip: string) {
    await this.ipBlacklist.removeFromBlacklist(ip);
  }
}
```

---

## 输入验证和清理

### 功能概述

**SanitizationPipe** 提供全面的输入清理:
- HTML/XSS 清理
- SQL 注入检测
- NoSQL 注入检测
- 字符串长度限制
- 自定义黑名单
- 集成 class-validator

### 基本使用

#### 方法 1: 全局启用（推荐）

在 `main.ts` 中:

```typescript
import { SanitizationPipe } from '@cloudphone/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局启用输入清理
  app.useGlobalPipes(new SanitizationPipe({
    strictMode: false,              // 严格模式（检测到可疑内容直接拒绝）
    maxStringLength: 10000,         // 最大字符串长度
    enableHtmlSanitization: true,   // HTML 清理
    enableSqlKeywordDetection: true,
    enableNoSqlInjectionDetection: true,
  }));

  await app.listen(3000);
}
```

#### 方法 2: 控制器级别

```typescript
import { SanitizationPipe } from '@cloudphone/shared';

@Controller('users')
export class UsersController {
  @Post()
  async create(@Body(new SanitizationPipe()) dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
```

#### 方法 3: 导入 ValidationModule

在 `app.module.ts` 中:

```typescript
import { ValidationModule } from '@cloudphone/shared';

@Module({
  imports: [
    ValidationModule, // 自动启用全局验证和清理
  ],
})
export class AppModule {}
```

### 清理模式

#### 严格模式

检测到可疑内容直接拒绝请求:

```typescript
import { StrictSanitizationPipe } from '@cloudphone/shared';

app.useGlobalPipes(new StrictSanitizationPipe());
```

#### 宽松模式

仅清理但不检测 SQL/NoSQL 注入:

```typescript
import { LooseSanitizationPipe } from '@cloudphone/shared';

app.useGlobalPipes(new LooseSanitizationPipe());
```

### 配置选项

```typescript
interface SanitizationOptions {
  enableHtmlSanitization?: boolean;        // 是否启用 HTML 清理
  enableSqlKeywordDetection?: boolean;     // 是否检测 SQL 注入
  enableNoSqlInjectionDetection?: boolean; // 是否检测 NoSQL 注入
  trimWhitespace?: boolean;                // 是否移除空白字符
  escapeSpecialChars?: boolean;            // 是否转义特殊字符
  customBlacklist?: string[];              // 自定义黑名单关键字
  maxStringLength?: number;                // 最大字符串长度
  allowedTags?: string[];                  // 允许的 HTML 标签
  strictMode?: boolean;                    // 是否启用严格模式
}
```

### 自定义黑名单示例

```typescript
app.useGlobalPipes(new SanitizationPipe({
  customBlacklist: ['admin', 'root', 'system', 'superuser'],
}));
```

---

## SQL 注入防护

### 功能概述

**SqlInjectionGuard** 提供多层 SQL 注入防护:
- 检测 15+ 种 SQL 注入模式
- 风险评分系统（0-100）
- 三级严重程度（LOW/MEDIUM/HIGH）
- 详细的审计日志

### 基本使用

#### 方法 1: 全局启用

在 `main.ts` 中:

```typescript
import { SqlInjectionGuard } from '@cloudphone/shared';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalGuards(new SqlInjectionGuard(app.get(Reflector)));

  await app.listen(3000);
}
```

#### 方法 2: 控制器级别

```typescript
import { SqlInjectionGuard } from '@cloudphone/shared';

@Controller('users')
@UseGuards(SqlInjectionGuard)
export class UsersController {
  // ... 路由
}
```

#### 方法 3: 路由级别

```typescript
import { SqlInjectionGuard, SqlInjectionCheck, SqlInjectionSeverity } from '@cloudphone/shared';

@Controller('users')
export class UsersController {
  @Get()
  @SqlInjectionCheck(SqlInjectionSeverity.HIGH) // 高严重程度，直接拒绝
  async findAll(@Query() query: QueryDto) {
    return this.usersService.findAll(query);
  }

  @Post()
  @SqlInjectionCheck(SqlInjectionSeverity.MEDIUM) // 中等严重程度，记录警告
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
```

### 严重程度级别

| 级别 | 行为 | 使用场景 |
|-----|------|---------|
| `LOW` | 仅记录日志 | 内部 API、受信任的输入 |
| `MEDIUM` | 记录警告并标记请求 | 一般 API 端点 |
| `HIGH` | 直接拒绝请求 | 敏感操作（支付、管理员功能） |

### 严格模式

自动拒绝风险评分 >= 20 的请求:

```typescript
import { StrictSqlInjectionGuard } from '@cloudphone/shared';

app.useGlobalGuards(new StrictSqlInjectionGuard(app.get(Reflector)));
```

### 检测的 SQL 注入模式

- **DML 语句**: SELECT, INSERT, UPDATE, DELETE
- **DDL 语句**: DROP, CREATE, ALTER, TRUNCATE
- **UNION 注入**: `UNION SELECT`
- **布尔盲注**: `OR 1=1`, `AND 1=1`
- **时间盲注**: SLEEP, BENCHMARK, WAITFOR
- **堆叠查询**: `;SELECT`
- **SQL 注释**: `--`, `/* */`
- **存储过程**: xp_, sp_cmdshell
- **信息泄露**: INFORMATION_SCHEMA
- **编码绕过**: 十六进制、CHAR、CONCAT

---

## 自定义验证装饰器

### 功能概述

提供 14+ 个实用的验证装饰器,覆盖常见业务场景。

### 可用装饰器

#### 1. 中国手机号验证

```typescript
import { IsChinesePhoneNumber } from '@cloudphone/shared';

export class CreateUserDto {
  @IsChinesePhoneNumber()
  phone: string; // 必须是 11 位中国大陆手机号
}
```

#### 2. 中国身份证号验证

```typescript
import { IsChineseIdCard } from '@cloudphone/shared';

export class VerifyIdentityDto {
  @IsChineseIdCard()
  idCard: string; // 18 位身份证号，含校验位验证
}
```

#### 3. 用户名验证

```typescript
import { IsUsername } from '@cloudphone/shared';

export class RegisterDto {
  @IsUsername()
  username: string; // 4-20位，字母开头，字母/数字/下划线/连字符
}
```

#### 4. 强密码验证

```typescript
import { IsStrongPassword } from '@cloudphone/shared';

export class ChangePasswordDto {
  @IsStrongPassword({
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  })
  newPassword: string;
}
```

#### 5. 端口号验证

```typescript
import { IsPort } from '@cloudphone/shared';

export class CreateDeviceDto {
  @IsPort()
  adbPort: number; // 1-65535
}
```

#### 6. MAC 地址验证

```typescript
import { IsMacAddress } from '@cloudphone/shared';

export class NetworkConfigDto {
  @IsMacAddress()
  macAddress: string; // 支持 00:1A:2B:3C:4D:5E 或 00-1A-2B-3C-4D-5E 或 001A.2B3C.4D5E
}
```

#### 7. 安全 URL 验证

```typescript
import { IsSafeUrl } from '@cloudphone/shared';

export class WebhookDto {
  @IsSafeUrl({ blockLocalhost: true })
  webhookUrl: string; // 禁止 javascript:, data:, file: 协议
}
```

#### 8. Unix 文件路径验证

```typescript
import { IsUnixPath } from '@cloudphone/shared';

export class FileOperationDto {
  @IsUnixPath()
  filePath: string; // 禁止路径遍历（..）
}
```

#### 9. JSON 字符串验证

```typescript
import { IsJsonString } from '@cloudphone/shared';

export class ConfigDto {
  @IsJsonString()
  metadata: string; // 必须是有效的 JSON 字符串
}
```

#### 10. 日期范围验证

```typescript
import { IsDateInRange } from '@cloudphone/shared';

export class ScheduleDto {
  @IsDateInRange({
    minDate: '2024-01-01',
    maxDate: '2024-12-31',
  })
  scheduledDate: string;
}
```

#### 11. 数组长度验证

```typescript
import { ArrayLength } from '@cloudphone/shared';

export class BatchOperationDto {
  @ArrayLength({ min: 1, max: 100 })
  deviceIds: string[];
}
```

#### 12. UUID 版本验证

```typescript
import { IsUuidVersion } from '@cloudphone/shared';

export class DeviceDto {
  @IsUuidVersion(4)
  deviceId: string; // 必须是 UUID v4
}
```

#### 13. 枚举值验证（大小写不敏感）

```typescript
import { IsEnumCaseInsensitive } from '@cloudphone/shared';

enum DeviceStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error',
}

export class UpdateDeviceDto {
  @IsEnumCaseInsensitive(DeviceStatus)
  status: string; // 可以是 'RUNNING', 'running', 'RuNnInG'
}
```

---

## 数据库查询审计

### 功能概述

**QueryAudit** 提供全面的 TypeORM 查询审计:
- 自动记录所有数据库查询
- 慢查询检测
- 危险操作识别（DROP, DELETE 缺少 WHERE 等）
- 强制参数化查询
- 查询统计分析

### 基本使用

在 `main.ts` 中启用:

```typescript
import { QueryAudit } from '@cloudphone/shared';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const dataSource = app.get(DataSource);

  QueryAudit.install(dataSource, {
    enabled: true,
    logAllQueries: false,           // 是否记录所有查询
    logSlowQueries: true,            // 是否记录慢查询
    slowQueryThreshold: 1000,        // 慢查询阈值（毫秒）
    detectDangerousOperations: true, // 检测危险操作
    blockDangerousOperations: false, // 是否阻止危险操作
    enforceParameterizedQueries: true, // 强制参数化查询
  });

  await app.listen(3000);
}
```

### 手动审计查询

```typescript
import { QueryAudit } from '@cloudphone/shared';

const result = QueryAudit.auditQuery(
  'SELECT * FROM users WHERE id = ?',
  [userId]
);

if (result.isDangerous) {
  console.warn('Dangerous query detected:', result.warnings);
}
```

### 使用审计 QueryBuilder

```typescript
import { createAuditedQueryBuilder } from '@cloudphone/shared';

const queryBuilder = this.userRepository.createQueryBuilder('user');
const auditedQB = createAuditedQueryBuilder(queryBuilder);

const users = await auditedQB.getMany(); // 自动审计
```

### 查询统计

```typescript
import { QueryAudit } from '@cloudphone/shared';

// 获取最慢的 10 个查询
const slowQueries = QueryAudit.getSlowQueries(10);

// 获取最频繁的 10 个查询
const topQueries = QueryAudit.getTopQueries(10);

// 获取所有统计
const allStats = QueryAudit.getStats();

// 清除统计
QueryAudit.clearStats();
```

### 检测的危险模式

| 模式 | 严重程度 | 描述 |
|-----|---------|------|
| `DROP TABLE` | Critical | 删除表操作 |
| `TRUNCATE TABLE` | Critical | 清空表操作 |
| `DELETE FROM ... 缺少 WHERE` | High | 可能删除所有数据 |
| `UPDATE ... 缺少 WHERE` | High | 可能更新所有数据 |
| `SELECT ... 缺少 WHERE/LIMIT` | Medium | 可能查询大量数据 |
| `UNION SELECT` | High | 可能是 SQL 注入 |
| 堆叠查询 | Critical | 可能是 SQL 注入 |

---

## 集成示例

### 完整的安全配置

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityModule, ValidationModule } from '@cloudphone/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SecurityModule,     // 启用速率限制、IP 黑名单、自动封禁
    ValidationModule,   // 启用输入验证和 SQL 注入防护
    // ... 其他模块
  ],
})
export class AppModule {}
```

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { QueryAudit } from '@cloudphone/shared';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用查询审计
  const dataSource = app.get(DataSource);
  QueryAudit.install(dataSource, {
    enabled: true,
    logSlowQueries: true,
    slowQueryThreshold: 1000,
    detectDangerousOperations: true,
    blockDangerousOperations: false, // 生产环境可设为 true
  });

  await app.listen(3000);
}
bootstrap();
```

### DTO 示例

```typescript
import {
  IsEmail,
  IsString,
  MinLength,
} from 'class-validator';
import {
  IsChinesePhoneNumber,
  IsStrongPassword,
  IsUsername,
} from '@cloudphone/shared';

export class RegisterUserDto {
  @IsUsername()
  username: string;

  @IsEmail()
  email: string;

  @IsStrongPassword({
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  })
  password: string;

  @IsChinesePhoneNumber()
  phone: string;

  @IsString()
  @MinLength(2)
  realName: string;
}
```

### 控制器示例

```typescript
import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import {
  SqlInjectionGuard,
  SqlInjectionCheck,
  SqlInjectionSeverity,
  SanitizationPipe,
} from '@cloudphone/shared';

@Controller('users')
@UseGuards(SqlInjectionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @SqlInjectionCheck(SqlInjectionSeverity.HIGH) // 严格检查注册请求
  async register(@Body(new SanitizationPipe()) dto: RegisterUserDto) {
    return this.usersService.register(dto);
  }

  @Get('search')
  @SqlInjectionCheck(SqlInjectionSeverity.MEDIUM) // 中等检查搜索请求
  async search(@Query('keyword') keyword: string) {
    return this.usersService.search(keyword);
  }
}
```

---

## 环境变量完整配置

```bash
# ========== 速率限制 ==========
RATE_LIMIT_ENABLED=true
RATE_LIMIT_DEFAULT=100
RATE_LIMIT_WINDOW=60

# ========== IP 黑名单 ==========
IP_BLACKLIST_ENABLED=true

# ========== 自动封禁 ==========
AUTO_BAN_ENABLED=true
AUTO_BAN_MAX_FAILURES=10
AUTO_BAN_DURATION=3600

# ========== 输入验证 ==========
VALIDATION_STRICT_MODE=false
VALIDATION_SQL_INJECTION_SEVERITY=medium
VALIDATION_MAX_STRING_LENGTH=10000
VALIDATION_ENABLE_HTML_SANITIZATION=true

# ========== Redis ==========
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

---

## 测试

运行测试:

```bash
cd backend/shared
pnpm test
```

测试覆盖:
- 速率限制中间件: `middleware/__tests__/rate-limit.middleware.spec.ts`
- 输入清理管道: `validators/__tests__/sanitization.pipe.spec.ts`
- SQL 注入守卫: `validators/__tests__/sql-injection-guard.spec.ts`
- 自定义验证器: `validators/__tests__/custom-validators.spec.ts`

---

## 性能影响

| 功能 | 每请求开销 | 说明 |
|-----|-----------|------|
| 速率限制 | ~1-2ms | Redis 操作 |
| 输入清理 | ~2-5ms | 依赖输入大小 |
| SQL 注入检测 | ~1-3ms | 正则匹配 |
| 查询审计 | ~0.5-1ms | 日志记录 |

**总计**: 约 5-10ms/请求

---

## 最佳实践

1. **生产环境配置**:
   - 启用严格模式速率限制
   - 设置 `blockDangerousOperations: true`
   - 使用 HIGH 严重程度的 SQL 注入检查

2. **开发环境配置**:
   - 使用 MEDIUM 或 LOW 严重程度
   - 记录但不阻止可疑请求
   - 启用详细日志

3. **监控和告警**:
   - 定期检查 QueryAudit 统计
   - 监控 IP 黑名单增长
   - 设置慢查询告警

4. **定期审查**:
   - 审查被阻止的请求日志
   - 分析慢查询并优化
   - 更新黑名单和速率限制规则

---

## 故障排除

### 问题: 合法请求被错误拦截

**解决方案**:
- 降低严重程度级别（HIGH → MEDIUM → LOW）
- 调整速率限制阈值
- 将受信任的 IP 加入白名单

### 问题: Redis 连接错误导致所有请求被拒绝

**解决方案**:
速率限制中间件默认采用 "fail-open" 策略，Redis 错误时允许请求通过。

### 问题: 性能下降

**解决方案**:
- 禁用 `logAllQueries`，仅启用 `logSlowQueries`
- 提高 `slowQueryThreshold` 阈值
- 使用 Redis 集群提高速率限制性能

---

## 更新日志

### Day 1-3 完成 (2025-10-28)

#### ✅ 完成功能

1. **API 速率限制** (Day 1-2)
   - ✅ RateLimitMiddleware - 多级速率限制
   - ✅ IPBlacklistMiddleware - IP 黑名单管理
   - ✅ AutoBanMiddleware - 自动封禁
   - ✅ SecurityModule - 一键集成
   - ✅ 完整单元测试

2. **输入验证和 SQL 注入防护** (Day 3)
   - ✅ SanitizationPipe - 全面输入清理
   - ✅ SqlInjectionGuard - SQL 注入检测
   - ✅ 14+ 自定义验证装饰器
   - ✅ QueryAudit - 数据库查询审计
   - ✅ ValidationModule - 一键集成
   - ✅ 完整单元测试

#### 📦 新增模块

```
backend/shared/src/
├── middleware/
│   ├── rate-limit.middleware.ts
│   ├── security.module.ts
│   └── __tests__/
│       └── rate-limit.middleware.spec.ts
├── validators/
│   ├── sanitization.pipe.ts
│   ├── sql-injection-guard.ts
│   ├── custom-validators.ts
│   ├── validation.module.ts
│   └── __tests__/
│       ├── sanitization.pipe.spec.ts
│       ├── sql-injection-guard.spec.ts
│       └── custom-validators.spec.ts
└── utils/
    └── query-audit.ts
```

---

## 联系和支持

如有问题或建议,请在项目仓库提交 Issue。
