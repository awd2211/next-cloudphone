# 🔧 架构彻底修复方案

## 🔴 当前架构问题

### 核心问题：认证逻辑重复

```
问题 1: 两个服务都有用户表
├─ API Gateway (30000)
│  ├─ database: cloudphone_auth
│  ├─ User Entity (有 twoFactorEnabled)
│  └─ AuthService (完整登录逻辑)
│
└─ User Service (30001)
   ├─ database: cloudphone_user  
   ├─ User Entity (无 twoFactorEnabled)
   └─ 无登录接口 ❌

结果: 数据不一致，登录失败！
```

### 问题 2: 数据库 Schema 不一致

```
cloudphone_auth.users (API Gateway):
- twoFactorEnabled ✅
- twoFactorSecret ✅
- 但表是空的！

cloudphone_user.users (User Service):
- 没有 twoFactorEnabled ❌
- 没有 twoFactorSecret ❌
- 但有 admin 用户！
```

---

## ✅ 彻底解决方案

### 方案 A: 移除 API Gateway 的认证逻辑（推荐）⭐⭐⭐⭐⭐

**原则**: API Gateway 只做**路由和 JWT 验证**，不做认证

```
架构改造:

前端
  ↓ POST /api/auth/login
API Gateway (无数据库)
  ↓ 代理请求 (不验证JWT)
User Service
  ├─ 验证用户名密码
  ├─ 生成 JWT Token
  └─ 返回 Token

后续请求:
前端
  ↓ GET /api/users (带 Token)
API Gateway
  ├─ 验证 JWT ✅
  └─ 代理到各服务
```

**改造步骤**:

1. **User Service 添加认证接口**
   - 添加 AuthController
   - 实现 login、register、captcha 接口
   - 生成 JWT Token

2. **API Gateway 改为纯代理**
   - 保留 JWT 验证
   - `/auth/*` 代理到 User Service
   - 移除自己的数据库连接
   - 移除 AuthService 中的登录逻辑

3. **统一数据库**
   - 只用 cloudphone_user
   - 删除 cloudphone_auth

---

### 方案 B: 统一数据库 Schema（临时方案）⭐⭐⭐

**原则**: 两个服务都能访问同一个数据库

```
改造:
1. cloudphone_user 添加 twoFactor 字段
2. API Gateway 和 User Service 都连接 cloudphone_user
3. 保持当前代码结构
```

**问题**: 
- ⚠️ 违反微服务原则（共享数据库）
- ⚠️ 代码重复
- ⚠️ 维护困难

---

## 🎯 推荐方案详解：方案 A

### 第一步：User Service 添加认证接口

#### 1. 创建 AuthController

```typescript
// backend/user-service/src/auth/auth.controller.ts
import { Controller, Post, Get, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Get('captcha')
  async getCaptcha() {
    return this.authService.getCaptcha();
  }

  @Get('me')
  async getProfile(@Req() req) {
    return this.authService.getProfile(req.user.id);
  }
}
```

#### 2. 创建 AuthService

```typescript
// backend/user-service/src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    // 1. 验证验证码
    // 2. 查找用户
    const user = await this.userRepository.findOne({
      where: { username: loginDto.username },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 3. 验证密码
    const isValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 4. 生成 Token
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles?.map(r => r.name) || [],
      tenantId: user.tenantId,
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles?.map(r => r.name) || [],
      },
    };
  }

  async getCaptcha() {
    // 生成验证码逻辑
    // 可以复用 API Gateway 的 CaptchaService
  }
}
```

---

### 第二步：API Gateway 改为纯代理

#### 1. 修改 app.module.ts - 移除数据库

```typescript
// backend/api-gateway/src/app.module.ts

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule.forRoot(createLoggerConfig('api-gateway')),
    ThrottlerModule.forRoot([...]),
    
    // ❌ 移除 TypeOrmModule.forRoot
    // TypeOrmModule.forRoot({
    //   database: process.env.DB_DATABASE || 'cloudphone_auth',
    //   ...
    // }),
    
    // ✅ 只保留 JWT 模块用于验证 Token
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '7d' },
    }),
    
    // ✅ 保留代理模块
    ProxyModule,
    ConsulModule,
  ],
  controllers: [HealthController],
  providers: [AppService],
})
export class AppModule {}
```

#### 2. 修改 ProxyController - 添加 auth 代理

```typescript
// backend/api-gateway/src/proxy/proxy.controller.ts

/**
 * 认证服务路由（公开访问）
 */
@Public()
@All('auth/*path')
async proxyAuth(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy('users', req, res);  // 代理到 user-service
}

/**
 * 认证服务路由（精确匹配）
 */
@Public()
@All('auth')
async proxyAuthExact(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy('users', req, res);
}
```

#### 3. 移除 AuthModule 和 AuthService

```bash
# 删除或重命名
backend/api-gateway/src/auth/auth.service.ts
backend/api-gateway/src/auth/auth.controller.ts
backend/api-gateway/src/auth/entities/user.entity.ts
backend/api-gateway/src/auth/entities/role.entity.ts
```

#### 4. 只保留 JWT 验证

```typescript
// backend/api-gateway/src/auth/strategies/jwt.strategy.ts
// 这个保留，用于验证 Token（不查询数据库）

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: any) {
    // 直接从 Token 中提取信息，不查询数据库
    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      roles: payload.roles || [],
      tenantId: payload.tenantId,
    };
  }
}
```

---

### 第三步：前端配置恢复

```typescript
// frontend/admin/vite.config.ts
server: {
  host: '0.0.0.0',
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:30000',  // 统一通过 API Gateway
      changeOrigin: true,
    },
  },
}
```

---

## 📋 改造后的架构

### 最终架构

```
┌─────────────────────────────────────┐
│   Admin Frontend (5173)             │
│   baseURL: /api (Vite proxy)        │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│   API Gateway (30000) - 纯代理       │
│   ✅ JWT 验证                        │
│   ✅ 请求路由                        │
│   ❌ 无数据库                        │
│   ❌ 无业务逻辑                      │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┬──────────────┐
       ↓                ↓              ↓
┌─────────────┐  ┌─────────────┐  ┌──────────┐
│ User Service│  │Device Service│  │ Billing  │
│   (30001)   │  │   (30002)    │  │ (30005)  │
│             │  │              │  │          │
│ ✅ 认证逻辑 │  │              │  │          │
│ ✅ 用户管理 │  │              │  │          │
│ ✅ 生成Token│  │              │  │          │
└─────────────┘  └──────────────┘  └──────────┘
       │
       ↓
┌─────────────────────────────────────┐
│   PostgreSQL                        │
│   - cloudphone_user (唯一用户库)    │
│   - cloudphone_device              │
│   - cloudphone_billing             │
└─────────────────────────────────────┘
```

### 请求流程

```
登录:
Frontend → API Gateway (proxy) → User Service
  ← Token ← User Service

访问资源:
Frontend (带 Token) → API Gateway (验证 Token) → User Service
  ← 数据 ← User Service
```

---

## 🚀 实施计划

### 立即执行（30-60分钟）

**Phase 1: User Service 添加认证** (20分钟)
- [ ] 创建 AuthController
- [ ] 创建 AuthService
- [ ] 创建 CaptchaService
- [ ] 添加 JwtModule
- [ ] 测试登录接口

**Phase 2: API Gateway 精简** (15分钟)
- [ ] 移除 TypeOrmModule
- [ ] 移除 AuthService 登录逻辑
- [ ] 移除 User/Role Entity
- [ ] 添加 /auth 代理路由
- [ ] 保留 JWT 验证

**Phase 3: 测试验证** (15分钟)
- [ ] 测试登录流程
- [ ] 测试所有微服务访问
- [ ] 测试权限控制

---

## 💡 或者...更简单的方案

### 快速修复：给 cloudphone_user 添加缺失字段

**最快解决**（5分钟）:

```sql
-- 添加 2FA 字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "twoFactorEnabled" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "twoFactorSecret" varchar;
```

**然后**:
- API Gateway 继续使用 cloudphone_user 数据库
- 登录立即可用

**优势**:
- ✅ 5分钟解决
- ✅ 立即可用

**劣势**:
- ⚠️ 架构问题依然存在
- ⚠️ 需要后续重构

---

## 🎯 我的建议

### 现在（立即）
**快速修复：添加缺失字段**
→ 让你能登录，继续开发

### 本周（重构）
**方案 A：彻底重构架构**
→ 符合微服务最佳实践

---

## 📝 你的选择

**选项 1**: 快速修复（5分钟）
- 添加数据库字段
- 立即能用
- 后续再重构

**选项 2**: 彻底重构（1小时）
- 完美的微服务架构
- 一劳永逸
- 需要一些时间

**我建议**: 先快速修复让你能用，然后我们慢慢重构架构。

你想选哪个？

