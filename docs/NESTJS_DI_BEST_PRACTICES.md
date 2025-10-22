# NestJS 依赖注入最佳实践

## 📋 目录
- [问题分析](#问题分析)
- [核心原则](#核心原则)
- [最佳实践](#最佳实践)
- [常见陷阱](#常见陷阱)
- [标准化方案](#标准化方案)
- [检查清单](#检查清单)

---

## 问题分析

### 本次问题回顾

**错误信息**：
```
UnknownDependenciesException: Nest can't resolve dependencies of the CacheService (?).
```

**根本原因**：
```typescript
// ❌ 问题代码
constructor(config?: Partial<CacheConfig>) {
  this.config = { ...defaultCacheConfig, ...config };
}
```

当 TypeScript 启用 `emitDecoratorMetadata` 时：
- 构造函数参数类型会被记录为 metadata
- `Partial<CacheConfig>` 被记录为 `Object`
- NestJS 尝试查找 `Object` 类型的 provider
- 找不到匹配的 provider → 抛出异常

---

## 核心原则

### 1️⃣ **明确依赖，避免歧义**
所有依赖注入必须显式声明，避免让 NestJS 推断。

### 2️⃣ **使用 Token 而非类型**
对于非类依赖（配置、常量等），使用自定义 Token。

### 3️⃣ **配置与逻辑分离**
配置通过 ConfigModule 管理，不要直接注入配置对象。

### 4️⃣ **单一职责**
Service 只负责业务逻辑，配置获取交给 ConfigService。

---

## 最佳实践

### ✅ 方案一：使用自定义 Token（推荐）

```typescript
// cache/cache.constants.ts
export const CACHE_CONFIG = 'CACHE_CONFIG';

// cache/cache.config.ts
export interface CacheConfig {
  redis: { host: string; port: number };
  local: { ttl: number };
}

export const defaultCacheConfig: CacheConfig = {
  redis: { host: 'localhost', port: 6379 },
  local: { ttl: 300 }
};

// cache/cache.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_CONFIG } from './cache.constants';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_CONFIG) private readonly config: CacheConfig
  ) {}
}

// cache/cache.module.ts
import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CACHE_CONFIG, defaultCacheConfig } from './cache.config';

@Global()
@Module({
  providers: [
    {
      provide: CACHE_CONFIG,
      useValue: defaultCacheConfig,
    },
    CacheService,
  ],
  exports: [CacheService],
})
export class CacheModule {}
```

**优点**：
- ✅ 明确的依赖关系
- ✅ 易于测试（可以 mock config）
- ✅ 类型安全
- ✅ 可以在不同环境提供不同配置

---

### ✅ 方案二：使用 ConfigService

```typescript
// cache/cache.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheService {
  private readonly config: CacheConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      redis: {
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
      },
      local: {
        ttl: this.configService.get('CACHE_TTL', 300),
      }
    };
  }
}

// cache/cache.module.ts
@Global()
@Module({
  imports: [ConfigModule], // 确保导入 ConfigModule
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
```

**优点**：
- ✅ 标准化的配置管理
- ✅ 支持环境变量
- ✅ 统一的配置验证
- ✅ 适合微服务架构

---

### ✅ 方案三：使用工厂模式

```typescript
// cache/cache.module.ts
@Global()
@Module({
  providers: [
    {
      provide: CacheService,
      useFactory: (configService: ConfigService) => {
        const config = {
          redis: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
          }
        };
        return new CacheService(config);
      },
      inject: [ConfigService],
    },
  ],
  exports: [CacheService],
})
export class CacheModule {}
```

**优点**：
- ✅ 灵活的初始化逻辑
- ✅ 支持异步初始化
- ✅ 可以注入其他服务

---

### ✅ 方案四：无参构造函数（最简单）

```typescript
// cache/cache.service.ts
@Injectable()
export class CacheService {
  private readonly config: CacheConfig;

  constructor() {
    this.config = { ...defaultCacheConfig };
  }
}

// cache/cache.module.ts
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
```

**适用场景**：
- ✅ 配置固定不变
- ✅ 不需要根据环境调整
- ✅ 快速原型开发

---

## 常见陷阱

### ❌ 陷阱 1：可选参数 + 接口类型

```typescript
// ❌ 错误
constructor(config?: CacheConfig) {}

// ❌ 错误
constructor(config: Partial<CacheConfig>) {}

// ✅ 正确
constructor(@Inject(CACHE_CONFIG) config: CacheConfig) {}
```

---

### ❌ 陷阱 2：使用接口作为依赖

```typescript
// ❌ 错误 - TypeScript 接口在运行时不存在
interface Logger { log(msg: string): void; }

constructor(logger: Logger) {}

// ✅ 正确 - 使用抽象类或 Token
abstract class Logger { abstract log(msg: string): void; }

constructor(logger: Logger) {}

// ✅ 或使用 Token
const LOGGER = 'LOGGER';
constructor(@Inject(LOGGER) logger: ILogger) {}
```

---

### ❌ 陷阱 3：循环依赖

```typescript
// ❌ 错误
// user.service.ts
constructor(private authService: AuthService) {}

// auth.service.ts
constructor(private userService: UserService) {}

// ✅ 正确 - 使用 forwardRef
constructor(
  @Inject(forwardRef(() => AuthService))
  private authService: AuthService
) {}
```

---

### ❌ 陷阱 4：忘记导入模块

```typescript
// app.module.ts
@Module({
  imports: [
    UsersModule,
    // ❌ 忘记导入 CacheModule
  ],
  providers: [
    CacheWarmupService, // ❌ 依赖 CacheService 但未导入 CacheModule
  ]
})

// ✅ 正确
@Module({
  imports: [
    UsersModule,
    CacheModule, // ✅ 导入提供 CacheService 的模块
  ],
  providers: [
    CacheWarmupService,
  ]
})
```

---

### ❌ 陷阱 5：作用域问题

```typescript
// ❌ 错误 - REQUEST 作用域的服务注入到 SINGLETON
@Injectable({ scope: Scope.REQUEST })
export class RequestService {}

@Injectable() // 默认 SINGLETON
export class AppService {
  constructor(private requestService: RequestService) {} // ❌ 作用域不匹配
}

// ✅ 正确
@Injectable({ scope: Scope.REQUEST })
export class AppService {
  constructor(private requestService: RequestService) {}
}
```

---

## 标准化方案

### 📦 配置管理标准

**1. 使用 ConfigModule 管理所有配置**

```typescript
// config/cache.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  local: {
    ttl: parseInt(process.env.CACHE_TTL, 10) || 300,
    maxKeys: parseInt(process.env.CACHE_MAX_KEYS, 10) || 2000,
  }
}));

// app.module.ts
import cacheConfig from './config/cache.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [cacheConfig],
      isGlobal: true,
    }),
  ]
})

// cache.service.ts
@Injectable()
export class CacheService {
  constructor(
    @Inject(cacheConfig.KEY)
    private config: ConfigType<typeof cacheConfig>
  ) {}
}
```

---

### 🏗️ 依赖注入模式

**项目统一采用以下模式**：

1. **服务依赖** → 直接注入类
2. **配置依赖** → 使用 `ConfigService` 或自定义 Token
3. **可选依赖** → 使用 `@Optional()` 装饰器
4. **动态依赖** → 使用工厂模式
5. **循环依赖** → 使用 `forwardRef`

---

### 📝 代码规范

```typescript
// ✅ 标准模板

import { Injectable, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  // 1. 私有属性声明
  private readonly config: MyConfig;

  constructor(
    // 2. 必需依赖放前面
    private readonly configService: ConfigService,
    private readonly logger: Logger,

    // 3. 可选依赖放后面，使用 @Optional()
    @Optional()
    @Inject(CUSTOM_TOKEN)
    private readonly customDep?: CustomType,
  ) {
    // 4. 配置初始化放在构造函数中
    this.config = this.initConfig();
  }

  // 5. 配置初始化逻辑独立方法
  private initConfig(): MyConfig {
    return {
      key: this.configService.get('MY_KEY', 'default'),
    };
  }
}
```

---

## 检查清单

### 开发时检查

- [ ] 所有 Service 的构造函数依赖都有对应的 provider
- [ ] 使用接口类型的地方都添加了 `@Inject()` 装饰器
- [ ] 可选参数都使用了 `@Optional()` 装饰器
- [ ] 配置参数通过 ConfigService 或自定义 Token 注入
- [ ] 所有需要的模块都已在 `imports` 中导入
- [ ] 没有循环依赖（或已使用 `forwardRef` 处理）

### 代码审查检查

- [ ] 构造函数参数列表清晰易懂
- [ ] 依赖注入使用了明确的类型
- [ ] 避免使用 `any` 或 `Object` 类型
- [ ] Module 的 exports 包含了需要共享的 provider
- [ ] 全局模块使用了 `@Global()` 装饰器

### 测试检查

- [ ] 单元测试能够正确 mock 所有依赖
- [ ] 集成测试能够正确初始化模块
- [ ] 错误情况下有清晰的错误提示

---

## 自动化检查

### ESLint 规则（下一步实施）

```json
{
  "rules": {
    "@typescript-eslint/no-inferrable-types": "off",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_"
    }]
  }
}
```

### 启动时验证

```typescript
// common/utils/validate-modules.ts
export function validateModuleImports() {
  // 在开发环境启动时检查常见问题
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 验证模块依赖...');
    // 检查逻辑
  }
}
```

---

## 总结

### 🎯 核心要点

1. **永远使用明确的依赖声明**
2. **配置通过 ConfigService 或 Token 管理**
3. **避免在构造函数中使用接口或可选参数**
4. **确保所有依赖的模块都已导入**
5. **遵循单一职责原则**

### 🚀 下一步行动

1. [ ] 在所有微服务中应用这些最佳实践
2. [ ] 添加 ESLint 规则自动检查
3. [ ] 创建 Service 和 Module 的代码模板
4. [ ] 编写单元测试验证依赖注入
5. [ ] 在 CI/CD 中添加依赖检查步骤

---

**参考资源**：
- [NestJS 官方文档 - Dependency Injection](https://docs.nestjs.com/fundamentals/custom-providers)
- [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
- [NestJS Common Errors](https://docs.nestjs.com/faq/common-errors)
