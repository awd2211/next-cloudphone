# 🗄️ 缓存使用指南

## 📋 缓存架构

### **技术栈**
- **Redis**: 缓存存储
- **cache-manager**: 缓存管理库
- **nestjs/cache-manager**: NestJS 集成

### **缓存策略**
- DB 0: 业务数据（会话、验证码等）
- DB 1: API 响应缓存
- TTL: 默认 5 分钟（可配置）

---

## 🚀 如何使用缓存

### **方法 1: 使用拦截器（推荐）**

```typescript
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@Controller('permissions')
export class PermissionsController {
  
  // 缓存 5 分钟（默认）
  @Get()
  @UseInterceptors(CacheInterceptor)
  async findAll() {
    return this.permissionsService.findAll();
  }
  
  // 自定义缓存时间（10 分钟）
  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600)  // 600 秒 = 10 分钟
  async findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }
}
```

---

### **方法 2: 手动缓存控制**

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class PermissionsService {
  constructor(
    @Inject(CACHE_MANAGER) 
    private cacheManager: Cache
  ) {}

  async findAll() {
    const cacheKey = 'permissions:all';
    
    // 1. 尝试从缓存获取
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // 2. 查询数据库
    const data = await this.permissionsRepository.find();
    
    // 3. 写入缓存（TTL: 300秒）
    await this.cacheManager.set(cacheKey, data, 300);
    
    return data;
  }

  async update(id: string, dto: any) {
    // 更新后清除相关缓存
    await this.cacheManager.del('permissions:all');
    await this.cacheManager.del(`permission:${id}`);
    
    return this.permissionsRepository.update(id, dto);
  }
}
```

---

## 📊 建议缓存的接口

### **User Service**

| 接口 | 缓存时间 | 原因 |
|------|----------|------|
| `GET /permissions` | 10分钟 | 权限很少变化 |
| `GET /roles` | 5分钟 | 角色变化不频繁 |
| `GET /data-scopes` | 5分钟 | 配置变化少 |
| `GET /field-permissions` | 5分钟 | 配置变化少 |
| `GET /menu-permissions/tree` | 5分钟 | 菜单结构稳定 |

### **Device Service**

| 接口 | 缓存时间 | 原因 |
|------|----------|------|
| `GET /templates` | 10分钟 | 模板变化少 |
| `GET /nodes` | 5分钟 | 节点信息相对稳定 |

### **Billing Service**

| 接口 | 缓存时间 | 原因 |
|------|----------|------|
| `GET /plans` | 30分钟 | 套餐很少变化 |
| `GET /pricing-rules` | 10分钟 | 计费规则稳定 |

### **App Service**

| 接口 | 缓存时间 | 原因 |
|------|----------|------|
| `GET /apps/categories` | 1小时 | 分类固定 |

---

## 🔄 缓存失效策略

### **自动失效**
```typescript
// TTL 到期自动失效
@CacheTTL(300)  // 5分钟后自动失效
```

### **主动失效**
```typescript
// 数据更新时清除缓存
@Post()
async create(dto: CreateDto) {
  const result = await this.service.create(dto);
  
  // 清除列表缓存
  await this.cacheManager.del('list:all');
  
  return result;
}
```

### **批量失效**
```typescript
// 清除某个模式的所有缓存
async clearPermissionCache() {
  const keys = await this.redis.keys('permission:*');
  if (keys.length > 0) {
    await this.redis.del(...keys);
  }
}
```

---

## 📈 缓存监控

### **查看缓存命中率**

```typescript
@Injectable()
export class CacheMetrics {
  private hits = 0;
  private misses = 0;

  recordHit() {
    this.hits++;
  }

  recordMiss() {
    this.misses++;
  }

  getHitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total * 100).toFixed(2) : 0;
  }
}
```

### **Prometheus 指标**
```typescript
// 添加缓存指标
@Counter({ name: 'cache_hits_total' })
@Counter({ name: 'cache_misses_total' })
```

---

## 🎯 缓存使用建议

### **适合缓存的场景** ✅
- 读多写少的数据
- 计算成本高的结果
- 外部 API 调用结果
- 配置和元数据

### **不适合缓存的场景** ❌
- 实时性要求高的数据
- 频繁变化的数据
- 用户私密数据
- 大对象（> 1MB）

---

## 🔧 高级用法

### **分布式锁**
```typescript
import Redlock from 'redlock';

async createWithLock(id: string) {
  const lock = await redlock.acquire([`lock:${id}`], 5000);
  
  try {
    // 执行业务逻辑
    await this.create(id);
  } finally {
    await lock.release();
  }
}
```

### **缓存预热**
```typescript
@OnModuleInit()
async onModuleInit() {
  // 应用启动时预加载常用数据
  await this.loadPermissionsToCache();
  await this.loadRolesToCache();
}
```

### **多级缓存**
```typescript
// L1: 内存缓存（快）
// L2: Redis 缓存（中）
// L3: 数据库（慢）

async getData(id: string) {
  // L1
  if (this.memoryCache.has(id)) {
    return this.memoryCache.get(id);
  }
  
  // L2
  const cached = await this.redis.get(id);
  if (cached) {
    this.memoryCache.set(id, cached);
    return cached;
  }
  
  // L3
  const data = await this.db.findOne(id);
  await this.redis.set(id, data, 300);
  this.memoryCache.set(id, data);
  return data;
}
```

---

## 🛡️ 缓存安全

### **防止缓存穿透**
```typescript
// 空值也缓存
const data = await this.db.findOne(id);
if (!data) {
  await this.cache.set(key, null, 60);  // 空值缓存1分钟
  return null;
}
```

### **防止缓存雪崩**
```typescript
// 随机 TTL，避免同时失效
const ttl = 300 + Math.random() * 60;  // 300-360秒
await this.cache.set(key, data, ttl);
```

### **防止缓存击穿**
```typescript
// 使用分布式锁
const lock = await this.acquireLock(`rebuild:${key}`);
if (lock) {
  // 重建缓存
  const data = await this.loadFromDB();
  await this.cache.set(key, data);
  await lock.release();
}
```

---

## 📊 性能对比

### **缓存前**
```
GET /permissions
平均响应时间: 150ms
数据库查询: 是
```

### **缓存后**
```
GET /permissions (缓存命中)
平均响应时间: 5ms  ⚡ (30x 提升)
数据库查询: 否
```

---

## 🎯 快速开始

### **1. 在服务中启用缓存模块**

```typescript
// app.module.ts
import { AppCacheModule } from '@cloudphone/shared';

@Module({
  imports: [
    AppCacheModule,  // 添加缓存模块
    // ... 其他模块
  ],
})
export class AppModule {}
```

### **2. 在 Controller 中使用**

```typescript
import { UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@Controller('permissions')
export class PermissionsController {
  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)  // 缓存 5 分钟
  findAll() {
    return this.permissionsService.findAll();
  }
}
```

### **3. 查看缓存数据（调试）**

```bash
# 连接 Redis
docker exec -it cloudphone-redis redis-cli

# 切换到缓存数据库
SELECT 1

# 查看所有缓存键
KEYS *

# 查看具体缓存
GET "api:/permissions:{}"

# 查看 TTL
TTL "api:/permissions:{}"

# 清除所有缓存
FLUSHDB
```

---

**缓存模块已就绪！只需在需要的 Controller 中添加 `@UseInterceptors(CacheInterceptor)` 即可！** 🚀

