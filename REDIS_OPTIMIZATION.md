# Redis 使用优化建议

## 📊 当前状态

### ✅ 已在使用（但可以优化）

| 服务 | 使用场景 | 状态 | TTL | 优化空间 |
|------|---------|------|-----|----------|
| User Service | 验证码存储 | ✅ 使用中 | 5分钟 | ⭐ |
| User Service | 两级缓存 | ✅ 可用 | 60秒 | ⭐⭐⭐ |
| User Service | 权限缓存 | ✅ 使用中 | 配置 | ⭐⭐ |
| User Service | Bull 队列 | ✅ 使用中 | - | ⭐ |

### 统计数据
- **总命令数**: 337,142 条
- **缓存命中**: 11,296 次
- **缓存未命中Menu 153,779 次
- **命中率Menu 6.8% ⚠️ 偏低

---

## 🎯 优化方案

### 1️⃣ 提高缓存命中率

#### A. 延长热点数据 TTL

```typescript
// backend/user-service/src/cache/cache.config.ts

export const defaultCacheConfig: CacheConfig = {
  local: {
    stdTTL: 300,  // 从 60秒 改为 5分钟
  },
  strategy: {
    hotDataPrefixes: [
      'user:',       // 用户信息
      'role:',       // 角色信息
      'permission:', // 权限信息
      'plan:',       // 套餐信息
      'config:',     // 系统配置
    ],
  },
};
```

#### B. 添加缓存预热

```typescript
// backend/user-service/src/cache/cache-warmup.service.ts
@Injectable()
export class CacheWarmupService implements OnModuleInit {
  async onModuleInit() {
    // 预热常用数据
    await this.warmupRoles();
    await this.warmupSystemConfigs();
    await this.warmupPlans();
  }

  private async warmupRoles() {
    const roles = await this.roleRepository.find();
    for (const role of roles) {
      await this.cacheService.set(
        `role:${role.id}`,
        role,
        { ttl: 3600 }  // 1小时
      );
    }
  }
}
```

---

### 2️⃣ 增加缓存使用场景

#### A. 用户查询缓存（高频操作）

```typescript
// backend/user-service/src/users/users.service.ts

@Injectable()
export class UsersService {
  constructor(
    private cacheService: CacheService  // 注入
  ) {}

  async findOne(id: string): Promise<User> {
    // 先查缓存
    const cacheKey = `user:${id}`;
    const cached = await this.cacheService.get<User>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // 缓存未命中，查数据库
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });
    
    if (user) {
      // 存入缓存，5分钟过期
      await this.cacheService.set(cacheKey, user, { ttl: 300 });
    }
    
    return user;
  }
}
```

#### B. 角色权限缓存

```typescript
// 已实现 ✅
// backend/user-service/src/permissions/permission-cache.service.ts

- 缓存用户权限
- 缓存角色权限  
- 缓存菜单树
- TTL: 可配置
```

#### C. 设备状态缓存

```typescript
// backend/device-service/src/devices/devices.service.ts

async getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
  const cacheKey = `device:status:${deviceId}`;
  
  // 从 Redis 获取
  const cached = await this.redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 查询数据库
  const device = await this.findOne(deviceId);
  
  // 缓存 30 秒（设备状态变化频繁）
  await this.redis.setex(cacheKey, 30, JSON.stringify({
    status: device.status,
    cpuUsage: device.cpuUsage,
    memoryUsage: device.memoryUsage,
  }));
  
  return device.status;
}
```

---

### 3️⃣ Session 管理（JWT 黑名单）

#### 当前: JWT 无状态，无法主动失效

#### 优化: 使用 Redis 存储 Token 黑名单

```typescript
// backend/shared/src/auth/token-blacklist.service.ts
@Injectable()
export class TokenBlacklistService {
  constructor(private redis: Redis) {}

  // 登出时加入黑名单
  async addToBlacklist(token: string, expiresIn: number) {
    await this.redis.setex(`blacklist:${token}`, expiresIn, '1');
  }

  // 验证 Token 是否在黑名单
  async isBlacklisted(token: string): Promise<boolean> {
    const exists = await this.redis.exists(`blacklist:${token}`);
    return exists === 1;
  }
}

// 在 JwtStrategy 中使用
async validate(payload: any) {
  const token = this.extractToken(request);
  
  if (await this.blacklistService.isBlacklisted(token)) {
    throw new UnauthorizedException('Token 已失效');
  }
  
  return payload;
}
```

---

### 4️⃣ 限流（Rate Limiting）

```typescript
// backend/user-service/src/common/guards/rate-limit.guard.ts
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const key = `ratelimit:${userId}:${Date.now() / 1000 | 0}`;
    
    // 使用 Redis INCR 计数
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 60);  // 1分钟窗口
    
    if (count > 100) {  // 每分钟最多100次
      throw new TooManyRequestsException();
    }
    
    return true;
  }
}
```

---

### 5️⃣ 分布式锁

```typescript
// 防止并发创建设备
async createDevice(dto: CreateDeviceDto) {
  const lockKey = `lock:device:create:${dto.userId}`;
  const lockValue = uuidv4();
  
  // 获取锁（NX: 不存在才设置，PX: 毫秒过期）
  const acquired = await this.redis.set(
    lockKey,
    lockValue,
    'PX',
    5000,  // 5秒过期
    'NX'
  );
  
  if (!acquired) {
    throw new ConflictException('设备创建中，请稍候...');
  }
  
  try {
    // 创建设备
    const device = await this.deviceRepository.save(...);
    return device;
  } finally {
    // 释放锁
    await this.redis.del(lockKey);
  }
}
```

---

### 6️⃣ 实时数据缓存

```typescript
// 在线设备数统计
async getOnlineDevicesCount(): Promise<number> {
  const cacheKey = 'stats:devices:online';
  
  const cached = await this.redis.get(cacheKey);
  if (cached) {
    return parseInt(cached);
  }
  
  const count = await this.deviceRepository.count({
    where: { status: DeviceStatus.RUNNING }
  });
  
  // 缓存 10 秒
  await this.redis.setex(cacheKey, 10, count.toString());
  
  return count;
}
```

---

## 📈 优化效果预估

| 优化项 | 当前 | 优化后 | 提升 |
|--------|------|--------|------|
| 缓存命中率 | 6.8% | 40%+ | 5倍+ |
| 用户查询延迟 | ~50ms | ~5ms | 10倍 |
| 数据库查询 | 高 | 低 | 减少60% |
| 并发能力 | 中等 | 高 | 3倍+ |

---

## ✅ 推荐立即执行的优化

### Quick Wins（立即见效）

1. **延长 TTL**（5分钟）
   ```typescript
   stdTTL: 300  // 从60改为300
   ```

2. **用户查询缓存**
   ```typescript
   // 在 findOne 中添加缓存
   ```

3. **角色权限缓存**
   ```typescript
   // 已有，增加预热
   ```

---

## 🎯 总结

### Redis 使用状态: ✅ **已在使用**

**当前使用**:
- ✅ 验证码存储（临时数据）
- ✅ 两级缓存系统（已配置）
- ✅ 权限缓存
- ✅ Bull 队列后端

**优化空间**:
- ⭐⭐⭐ 提高缓存命中率（增加TTL）
- ⭐⭐⭐ 增加缓存使用（用户/角色查询）
- ⭐⭐ Session/Token 管理
- ⭐⭐ 分布式锁
- ⭐ 限流

**当前状态**: **良好，可以优化** ✅

要我现在实施这些优化吗？

