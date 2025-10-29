# N+1 查询问题优化示例

本文档展示如何识别和修复 N+1 查询问题，这是数据库性能优化中最常见的问题之一。

---

## 什么是 N+1 查询问题？

N+1 查询问题是指:
1. 执行 1 次查询获取 N 条记录
2. 对每条记录执行额外的查询获取关联数据 (N 次)
3. 总共执行 **N+1 次查询**

**示例**:
```typescript
// 第 1 次查询：获取 100 个设备
const devices = await deviceRepository.find();

// 第 2-101 次查询：为每个设备查询用户信息 (100 次)
for (const device of devices) {
  device.user = await userRepository.findOne({ where: { id: device.userId } });
}
```

**性能问题**:
- 100 个设备 → 101 次数据库查询
- 1000 个设备 → 1001 次查询
- 每次查询 ~5ms → 总时间 5000ms (5 秒!)

---

## 示例 1: 设备列表查询用户信息

### ❌ 问题代码 (N+1 查询)

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private userService: UserService,
  ) {}

  // ❌ N+1 查询问题
  async findAllWithUserInfo(userId: string): Promise<any[]> {
    // 第 1 次查询：获取设备列表
    const devices = await this.deviceRepository.find({ where: { userId } });

    // N 次查询：为每个设备查询用户信息
    for (const device of devices) {
      device.user = await this.userService.findOne(device.userId); // 🚨 N 次查询
    }

    return devices;
  }
}
```

**性能分析**:
```
设备数量: 100
查询次数: 1 + 100 = 101 次
每次查询: 5ms
总耗时: 101 × 5ms = 505ms
```

---

### ✅ 优化方案 1: 批量查询 (IN 语句)

```typescript
@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private userService: UserService,
  ) {}

  // ✅ 使用 IN 语句批量查询
  async findAllWithUserInfo(userId: string): Promise<any[]> {
    // 第 1 次查询：获取设备列表
    const devices = await this.deviceRepository.find({ where: { userId } });

    if (devices.length === 0) return [];

    // 第 2 次查询：批量获取所有相关用户 (单次查询)
    const userIds = [...new Set(devices.map(d => d.userId))];
    const users = await this.userService.findByIds(userIds); // 🎯 批量查询
    const userMap = new Map(users.map(u => [u.id, u]));

    // 组装数据 (内存操作，无数据库查询)
    return devices.map(device => ({
      ...device,
      user: userMap.get(device.userId),
    }));
  }
}
```

**性能分析**:
```
设备数量: 100
查询次数: 1 + 1 = 2 次
每次查询: 5ms
总耗时: 2 × 5ms = 10ms
```

**性能提升**: **98%** (505ms → 10ms) ⭐

**UserService 实现 `findByIds`**:
```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findByIds(ids: string[]): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .whereInIds(ids)
      .getMany();
  }
}
```

---

### ✅ 优化方案 2: Eager Loading (TypeORM JOIN)

如果 `Device` 实体中定义了 `@ManyToOne` 关系:

```typescript
import { Entity, ManyToOne, JoinColumn } from 'typeorm';

@Entity('devices')
export class Device {
  @Column()
  userId: string;

  @ManyToOne(() => User, { eager: false }) // 默认不加载
  @JoinColumn({ name: 'userId' })
  user: User;

  // ... 其他字段
}
```

**使用 Eager Loading**:

```typescript
@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  // ✅ 使用 LEFT JOIN 预加载关联数据
  async findAllWithUserInfo(userId: string): Promise<Device[]> {
    return this.deviceRepository
      .createQueryBuilder('device')
      .leftJoinAndSelect('device.user', 'user') // 🎯 JOIN 查询
      .where('device.userId = :userId', { userId })
      .orderBy('device.createdAt', 'DESC')
      .getMany();
  }
}
```

**生成的 SQL**:
```sql
SELECT
  device.*,
  user.*
FROM devices device
LEFT JOIN users user ON user.id = device.userId
WHERE device.userId = ?
ORDER BY device.createdAt DESC;
```

**性能分析**:
```
查询次数: 1 次 (单个 JOIN 查询)
总耗时: ~8ms
```

**性能提升**: **98.4%** (505ms → 8ms) ⭐

---

## 示例 2: 设备列表查询节点信息

### ❌ 问题代码

```typescript
async getDevicesWithNode(): Promise<any[]> {
  // 第 1 次查询
  const devices = await this.deviceRepository.find();

  // N 次查询
  for (const device of devices) {
    device.node = await this.nodeRepository.findOne({ where: { id: device.nodeId } }); // 🚨 N 次
  }

  return devices;
}
```

### ✅ 优化方案: JOIN 查询

```typescript
async getDevicesWithNode(): Promise<any[]> {
  return this.deviceRepository
    .createQueryBuilder('device')
    .leftJoinAndSelect('device.node', 'node')           // 节点信息
    .leftJoinAndSelect('device.snapshots', 'snapshot')  // 快照信息 (可选)
    .orderBy('device.createdAt', 'DESC')
    .getMany();
}
```

**性能提升**: **97%+**

---

## 示例 3: Dashboard 聚合查询

### ❌ 问题代码 (多次查询)

```typescript
async getDashboardStats(userId: string) {
  const totalDevices = await this.deviceRepository.count({ where: { userId } });
  const runningDevices = await this.deviceRepository.count({ where: { userId, status: 'running' } });
  const stoppedDevices = await this.deviceRepository.count({ where: { userId, status: 'stopped' } });
  const errorDevices = await this.deviceRepository.count({ where: { userId, status: 'error' } });

  return { totalDevices, runningDevices, stoppedDevices, errorDevices };
}
```

**性能分析**:
```
查询次数: 4 次
总耗时: 4 × 20ms = 80ms
```

---

### ✅ 优化方案: 单次聚合查询

```typescript
async getDashboardStats(userId: string) {
  const result = await this.deviceRepository
    .createQueryBuilder('device')
    .select('device.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .addSelect('SUM(device.cpuCores)', 'totalCpu')
    .addSelect('SUM(device.memoryMB)', 'totalMemory')
    .where('device.userId = :userId', { userId })
    .groupBy('device.status')
    .getRawMany();

  const stats = {
    totalDevices: 0,
    runningDevices: 0,
    stoppedDevices: 0,
    errorDevices: 0,
    totalCpu: 0,
    totalMemory: 0,
  };

  result.forEach(row => {
    const count = parseInt(row.count);
    stats.totalDevices += count;
    stats.totalCpu += parseInt(row.totalCpu || 0);
    stats.totalMemory += parseInt(row.totalMemory || 0);

    if (row.status === 'running') stats.runningDevices = count;
    if (row.status === 'stopped') stats.stoppedDevices = count;
    if (row.status === 'error') stats.errorDevices = count;
  });

  return stats;
}
```

**生成的 SQL**:
```sql
SELECT
  status,
  COUNT(*) as count,
  SUM(cpu_cores) as totalCpu,
  SUM(memory_mb) as totalMemory
FROM devices
WHERE user_id = ?
GROUP BY status;
```

**性能分析**:
```
查询次数: 1 次
总耗时: ~15ms
```

**性能提升**: **81.25%** (80ms → 15ms) ⭐

---

## 示例 4: 使用 DataLoader (高级)

对于复杂的关联查询，可以使用 DataLoader 模式批量加载数据。

### 安装 DataLoader

```bash
pnpm add dataloader
pnpm add -D @types/dataloader
```

### 创建 UserLoader

```typescript
import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class UserLoader {
  private loader: DataLoader<string, any>;

  constructor(private userService: UserService) {
    this.loader = new DataLoader(async (userIds: readonly string[]) => {
      console.log(`[UserLoader] Batch loading ${userIds.length} users`);

      // 批量查询
      const users = await this.userService.findByIds([...userIds]);
      const userMap = new Map(users.map(u => [u.id, u]));

      // 保持顺序返回 (DataLoader 要求)
      return userIds.map(id => userMap.get(id) || null);
    });
  }

  async load(userId: string) {
    return this.loader.load(userId);
  }
}
```

### 使用 DataLoader

```typescript
@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private userLoader: UserLoader,
  ) {}

  async findAllWithDataLoader(userId: string): Promise<any[]> {
    const devices = await this.deviceRepository.find({ where: { userId } });

    // DataLoader 自动批量加载
    const devicesWithUsers = await Promise.all(
      devices.map(async (device) => ({
        ...device,
        user: await this.userLoader.load(device.userId), // 🎯 批量加载
      }))
    );

    return devicesWithUsers;
  }
}
```

**优势**:
- 自动批量查询 (去重)
- 请求级别缓存
- 避免重复查询

---

## 识别 N+1 查询的工具

### 1. TypeORM 日志

启用查询日志:

```typescript
TypeOrmModule.forRoot({
  // ...
  logging: ['query'],
  logger: 'advanced-console',
  maxQueryExecutionTime: 100, // 记录慢查询
}),
```

查看日志，如果看到大量重复的 SELECT 查询 → 可能是 N+1 问题。

### 2. PostgreSQL 慢查询日志

```sql
-- 开启慢查询日志
ALTER DATABASE cloudphone_device SET log_min_duration_statement = 100;

-- 查看慢查询统计
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 20;
```

### 3. 应用性能监控 (APM)

使用 New Relic, Datadog, Sentry 等 APM 工具自动检测 N+1 查询。

---

## 最佳实践总结

| 场景 | 推荐方案 | 性能提升 |
|------|----------|----------|
| 简单关联查询 | Eager Loading (JOIN) | 95%+ |
| 多个关联表 | 批量查询 (IN 语句) | 90%+ |
| 复杂关联逻辑 | DataLoader | 90%+ |
| 聚合统计 | 单次 GROUP BY 查询 | 80%+ |

---

## 优化前后对比

| 操作 | 优化前 (N+1) | 优化后 (JOIN) | 提升 |
|------|--------------|---------------|------|
| 查询 100 个设备 + 用户 | 505ms (101 次查询) | 8ms (1 次查询) | **98.4%** ⭐ |
| 查询 1000 个设备 + 用户 | 5050ms (1001 次查询) | 15ms (1 次查询) | **99.7%** ⭐ |
| Dashboard 统计 | 80ms (4 次查询) | 15ms (1 次查询) | **81.25%** ⭐ |

---

## 检查清单

在实现查询功能时，确保:

- [ ] 使用 TypeORM 的 `leftJoinAndSelect` 预加载关联数据
- [ ] 对于不支持 JOIN 的场景，使用批量查询 (IN 语句)
- [ ] 聚合查询使用单次 `GROUP BY` 而不是多次 `count()`
- [ ] 启用查询日志检查是否有重复查询
- [ ] 使用 `@Cacheable` 装饰器缓存查询结果
- [ ] 定期检查 `pg_stat_statements` 识别慢查询

---

**文档更新时间**: 2025-10-29
**推荐阅读**: [CACHE_IMPLEMENTATION_EXAMPLE.md](./CACHE_IMPLEMENTATION_EXAMPLE.md)
