# P1-2: 查询优化和 Redis 缓存实现

**开始时间**: 2025-10-28
**预计时间**: 3 小时
**当前状态**: 进行中

---

## 📊 高频查询场景分析

### 1. 设备详情查询 (最高频)
**方法**: `findOne(id: string)`
**频率**: 每个设备操作都会调用
**特点**:
- 按设备 ID 查询单条记录
- 数据变化频率低（设备状态变化才更新）
- 适合缓存，TTL: 60-300s

### 2. 用户设备列表查询 (高频)
**方法**: `findAll(page, limit, userId, tenantId, status)`
**频率**: 用户界面每次刷新都会调用
**特点**:
- 支持分页和多维度过滤
- 数据变化频率中等
- 适合缓存，TTL: 30-60s
- 需要复杂的缓存键策略

### 3. 设备状态监控查询 (定时任务)
**方法**: `findByStatus()`, 心跳检测
**频率**: 每 5 分钟
**特点**:
- 批量查询特定状态设备
- 数据实时性要求高
- 不适合缓存（或使用极短 TTL）

### 4. Docker 容器查找
**方法**: `findByContainerId()`
**频率**: Docker 事件回调
**特点**:
- 按 containerId 查询
- 使用频率中等
- 适合缓存，TTL: 120s

---

## 🎯 缓存策略设计

### Cache-Aside 模式
1. 查询时先检查缓存
2. 缓存命中 → 直接返回
3. 缓存未命中 → 查询数据库 → 写入缓存 → 返回

### 缓存失效策略
1. **主动失效**: 设备更新/删除时清除相关缓存
2. **TTL 过期**: 不同场景使用不同 TTL
3. **版本控制**: 使用版本号防止脏数据

### 缓存键设计
```
device:{deviceId}                           # 设备详情
device:list:{userId}:{status}:{page}:{limit} # 用户设备列表
device:container:{containerId}              # 容器ID映射
device:stats:{userId}                       # 用户设备统计
```

### TTL 配置
- 设备详情: 300s (5分钟)
- 设备列表: 60s (1分钟)
- 容器映射: 120s (2分钟)
- 统计数据: 180s (3分钟)

---

## 🔧 技术实现

### 1. 安装依赖
```bash
pnpm add cache-manager cache-manager-redis-yet redis
```

### 2. 创建缓存模块
文件: `src/cache/cache.module.ts`
- 配置 Redis 连接
- 注册 CacheModule
- 提供全局缓存管理器

### 3. 创建缓存装饰器
文件: `src/cache/decorators/cacheable.decorator.ts`
- `@Cacheable(key, ttl)` - 自动缓存方法结果
- `@CacheEvict(key)` - 清除缓存

### 4. 创建缓存服务
文件: `src/cache/cache.service.ts`
- `get<T>(key): Promise<T>`
- `set<T>(key, value, ttl): Promise<void>`
- `del(key): Promise<void>`
- `delPattern(pattern): Promise<void>`

### 5. 集成到 DevicesService
- `findOne()` - 添加缓存读取
- `update()` - 添加缓存失效
- `remove()` - 添加缓存失效
- `findAll()` - 添加列表缓存

---

## 📈 预期性能提升

### 设备详情查询
- **数据库查询**: ~10-50ms
- **Redis 缓存**: ~1-5ms
- **提升**: 5-50x

### 用户设备列表
- **数据库查询**: ~30-150ms (含分页)
- **Redis 缓存**: ~2-10ms
- **提升**: 10-15x

### 缓存命中率目标
- 设备详情: 80-90%
- 设备列表: 60-70%
- 总体: 70-85%

---

## ✅ 验证方法

### 1. 性能测试
```bash
# 测试缓存前性能
ab -n 1000 -c 10 http://localhost:30002/api/v1/devices/{id}

# 测试缓存后性能（应提升 5-50x）
ab -n 1000 -c 10 http://localhost:30002/api/v1/devices/{id}
```

### 2. 缓存命中率监控
```bash
# Redis 监控
redis-cli info stats | grep keyspace_hits
redis-cli info stats | grep keyspace_misses
```

### 3. 功能测试
- 查询设备详情 → 应从缓存返回
- 更新设备 → 缓存应失效
- 删除设备 → 缓存应清除
- 列表查询 → 应缓存分页结果

---

## 🎯 里程碑

- [ ] 创建缓存模块和服务
- [ ] 实现缓存装饰器
- [ ] 集成到 DevicesService
- [ ] 添加缓存失效逻辑
- [ ] 性能测试和验证
- [ ] 文档更新

**预计完成时间**: 2025-10-28 (3小时内)
