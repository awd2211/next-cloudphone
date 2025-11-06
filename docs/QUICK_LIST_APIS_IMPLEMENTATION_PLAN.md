# 快速列表接口实施方案

**日期**: 2025-11-03
**状态**: 📋 规划中
**预计时间**: 2-3小时

---

## 1. 功能概述

快速列表接口为前端UI组件（下拉框、选择器、标签输入等）提供轻量级数据。

### 关键特性

- ✅ **轻量级**：只返回必需字段（ID + 名称 + 状态）
- ✅ **快速响应**：目标 <50ms
- ✅ **缓存优化**：Redis缓存60秒
- ✅ **过滤支持**：支持状态过滤（如：只返回active）
- ✅ **分页可选**：默认返回前100条，可自定义

---

## 2. 需要实施的API（6个）

| 服务 | 端点 | 描述 | 返回字段 |
|------|------|------|----------|
| device-service | GET /devices/quick-list | 设备快速列表 | id, name, status |
| device-service | GET /templates/quick-list | 模板快速列表 | id, name, type |
| user-service | GET /users/quick-list | 用户快速列表 | id, username, email, role |
| app-service | GET /apps/quick-list | 应用快速列表 | id, name, packageName, version |
| billing-service | GET /plans/quick-list | 套餐快速列表 | id, name, price, duration |
| billing-service | GET /orders/quick-list | 订单快速列表 | id, orderNumber, status, totalAmount |

---

## 3. 统一的DTO设计

### 3.1 请求DTO

```typescript
export class QuickListQueryDto {
  @ApiPropertyOptional({ description: '状态过滤' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '限制数量', default: 100, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 100;
}
```

### 3.2 响应DTO

```typescript
export class QuickListItemDto {
  @ApiProperty({ description: 'ID' })
  id: string;

  @ApiProperty({ description: '名称' })
  name: string;

  @ApiProperty({ description: '状态' })
  status?: string;

  @ApiPropertyOptional({ description: '额外信息' })
  extra?: Record<string, any>;
}

export class QuickListResponseDto {
  @ApiProperty({ description: '数据列表', type: [QuickListItemDto] })
  items: QuickListItemDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '是否已缓存' })
  cached: boolean;
}
```

---

## 4. 实施步骤

### Phase 1: Device Service (2个端点)

#### 4.1 `/devices/quick-list`

**文件**: `backend/device-service/src/devices/devices.controller.ts`

```typescript
@Get('quick-list')
@RequirePermission('device.read')
@ApiOperation({
  summary: '设备快速列表',
  description: '返回轻量级设备列表，用于下拉框等UI组件',
})
@ApiResponse({ status: 200, type: QuickListResponseDto })
async getQuickList(@Query() query: QuickListQueryDto) {
  return this.devicesService.getQuickList(query);
}
```

**Service方法**:

```typescript
async getQuickList(query: QuickListQueryDto): Promise<QuickListResponseDto> {
  const cacheKey = `devices:quick-list:${JSON.stringify(query)}`;

  // 尝试从缓存获取
  const cached = await this.cacheManager.get(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  // 从数据库查询
  const qb = this.deviceRepository.createQueryBuilder('device')
    .select(['device.id', 'device.name', 'device.status'])
    .orderBy('device.createdAt', 'DESC')
    .limit(query.limit || 100);

  if (query.status) {
    qb.andWhere('device.status = :status', { status: query.status });
  }

  if (query.search) {
    qb.andWhere('device.name LIKE :search', { search: `%${query.search}%` });
  }

  const [devices, total] = await qb.getManyAndCount();

  const result = {
    items: devices.map(d => ({
      id: d.id,
      name: d.name,
      status: d.status,
    })),
    total,
    cached: false,
  };

  // 缓存60秒
  await this.cacheManager.set(cacheKey, result, 60);

  return result;
}
```

#### 4.2 `/templates/quick-list`

类似结构，在 `templates.controller.ts` 中添加。

---

### Phase 2: User Service (1个端点)

#### 4.3 `/users/quick-list`

**文件**: `backend/user-service/src/users/users.controller.ts`

```typescript
@Get('quick-list')
@RequirePermission('user.read')
@ApiOperation({ summary: '用户快速列表' })
async getQuickList(@Query() query: QuickListQueryDto) {
  return this.usersService.getQuickList(query);
}
```

---

### Phase 3: App Service (1个端点)

#### 4.4 `/apps/quick-list`

**文件**: `backend/app-service/src/apps/apps.controller.ts`

```typescript
@Get('quick-list')
@RequirePermission('app.read')
@ApiOperation({ summary: '应用快速列表' })
async getQuickList(@Query() query: QuickListQueryDto) {
  const cacheKey = `apps:quick-list:${JSON.stringify(query)}`;
  const cached = await this.cacheManager.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  const qb = this.appRepository.createQueryBuilder('app')
    .select(['app.id', 'app.name', 'app.packageName', 'app.version'])
    .orderBy('app.createdAt', 'DESC')
    .limit(query.limit || 100);

  if (query.status) {
    qb.andWhere('app.status = :status', { status: query.status });
  }

  const [apps, total] = await qb.getManyAndCount();

  const result = {
    items: apps.map(a => ({
      id: a.id,
      name: a.name,
      extra: { packageName: a.packageName, version: a.version },
    })),
    total,
    cached: false,
  };

  await this.cacheManager.set(cacheKey, result, 60);
  return result;
}
```

---

### Phase 4: Billing Service (2个端点)

#### 4.5 `/plans/quick-list`

**文件**: `backend/billing-service/src/plans/plans.controller.ts`

```typescript
@Get('quick-list')
@RequirePermission('billing.read')
@ApiOperation({ summary: '套餐快速列表' })
async getQuickList(@Query() query: QuickListQueryDto) {
  return this.plansService.getQuickList(query);
}
```

#### 4.6 `/orders/quick-list`

**文件**: `backend/billing-service/src/orders/orders.controller.ts`

```typescript
@Get('quick-list')
@RequirePermission('billing.read')
@ApiOperation({ summary: '订单快速列表' })
async getQuickList(@Query() query: QuickListQueryDto) {
  const cacheKey = `orders:quick-list:${JSON.stringify(query)}`;
  const cached = await this.cacheManager.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  const qb = this.orderRepository.createQueryBuilder('order')
    .select(['order.id', 'order.orderNumber', 'order.status', 'order.totalAmount'])
    .orderBy('order.createdAt', 'DESC')
    .limit(query.limit || 100);

  if (query.status) {
    qb.andWhere('order.status = :status', { status: query.status });
  }

  const [orders, total] = await qb.getManyAndCount();

  const result = {
    items: orders.map(o => ({
      id: o.id,
      name: `Order ${o.orderNumber}`,
      status: o.status,
      extra: { orderNumber: o.orderNumber, totalAmount: o.totalAmount },
    })),
    total,
    cached: false,
  };

  await this.cacheManager.set(cacheKey, result, 60);
  return result;
}
```

---

## 5. 缓存策略

### 5.1 缓存Key规则

```
{service}:quick-list:{query_hash}

示例:
devices:quick-list:{"status":"online","limit":100}
users:quick-list:{"search":"admin","limit":50}
```

### 5.2 缓存TTL

| 数据类型 | TTL | 原因 |
|----------|-----|------|
| 设备列表 | 60s | 状态变化较频繁 |
| 用户列表 | 300s (5分钟) | 变化较慢 |
| 应用列表 | 300s | 变化较慢 |
| 套餐列表 | 3600s (1小时) | 基本不变 |
| 订单列表 | 120s (2分钟) | 中等频率 |
| 模板列表 | 300s | 变化较慢 |

### 5.3 缓存失效策略

```typescript
// 在创建/更新/删除操作后清除缓存
async create(dto: CreateDeviceDto) {
  const device = await this.deviceRepository.save(dto);

  // 清除所有 devices:quick-list:* 缓存
  await this.cacheManager.del('devices:quick-list:*');

  return device;
}
```

---

## 6. 性能优化

### 6.1 数据库查询优化

```typescript
// 只选择必要的字段
.select(['device.id', 'device.name', 'device.status'])

// 使用索引
// 确保 status, created_at 有索引
// migration: CREATE INDEX idx_device_status ON devices(status);
// migration: CREATE INDEX idx_device_created_at ON devices(created_at);
```

### 6.2 响应时间目标

| 场景 | 目标 | 实际 |
|------|------|------|
| 缓存命中 | <10ms | - |
| 缓存未命中（100条） | <50ms | - |
| 缓存未命中（500条） | <100ms | - |

---

## 7. 前端使用示例

### 7.1 React Hook

```typescript
import { useQuery } from '@tanstack/react-query';

export function useDeviceQuickList(status?: string) {
  return useQuery({
    queryKey: ['devices', 'quick-list', status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);

      const response = await fetch(
        `/devices/quick-list?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.json();
    },
    staleTime: 60 * 1000, // 60秒内不重新请求
  });
}
```

### 7.2 Ant Design Select

```tsx
import { Select } from 'antd';
import { useDeviceQuickList } from '@/hooks/useDeviceQuickList';

function DeviceSelector() {
  const { data, isLoading } = useDeviceQuickList('online');

  return (
    <Select
      loading={isLoading}
      placeholder="选择设备"
      options={data?.items.map(item => ({
        label: item.name,
        value: item.id,
      }))}
    />
  );
}
```

---

## 8. 测试用例

### 8.1 基本功能测试

```bash
# 1. 获取所有设备快速列表
curl "http://localhost:30002/devices/quick-list" \
  -H "Authorization: Bearer ${TOKEN}"

# 2. 过滤在线设备
curl "http://localhost:30002/devices/quick-list?status=online" \
  -H "Authorization: Bearer ${TOKEN}"

# 3. 搜索关键词
curl "http://localhost:30002/devices/quick-list?search=redroid" \
  -H "Authorization: Bearer ${TOKEN}"

# 4. 限制返回数量
curl "http://localhost:30002/devices/quick-list?limit=50" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 8.2 缓存验证

```bash
# 第一次请求（cached: false）
curl "http://localhost:30002/devices/quick-list" \
  -H "Authorization: Bearer ${TOKEN}"

# 第二次请求（cached: true）
curl "http://localhost:30002/devices/quick-list" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 8.3 性能测试

```bash
# 使用 ab (Apache Bench) 测试
ab -n 1000 -c 10 \
  -H "Authorization: Bearer ${TOKEN}" \
  "http://localhost:30002/devices/quick-list"
```

---

## 9. 实施清单

### ✅ Phase 1: Device Service

- [ ] 创建 `QuickListQueryDto` 和 `QuickListResponseDto`
- [ ] `devices.controller.ts` 添加 `GET /devices/quick-list`
- [ ] `devices.service.ts` 添加 `getQuickList()` 方法
- [ ] `templates.controller.ts` 添加 `GET /templates/quick-list`
- [ ] `templates.service.ts` 添加 `getQuickList()` 方法
- [ ] 添加缓存逻辑
- [ ] 编译测试

### ✅ Phase 2: User Service

- [ ] `users.controller.ts` 添加 `GET /users/quick-list`
- [ ] `users.service.ts` 添加 `getQuickList()` 方法
- [ ] 添加缓存逻辑
- [ ] 编译测试

### ✅ Phase 3: App Service

- [ ] `apps.controller.ts` 添加 `GET /apps/quick-list`
- [ ] `apps.service.ts` 添加 `getQuickList()` 方法
- [ ] 添加缓存逻辑
- [ ] 编译测试

### ✅ Phase 4: Billing Service

- [ ] `plans.controller.ts` 添加 `GET /plans/quick-list`
- [ ] `orders.controller.ts` 添加 `GET /orders/quick-list`
- [ ] 添加缓存逻辑
- [ ] 编译测试

### ✅ Phase 5: 集成测试

- [ ] 测试所有6个端点
- [ ] 验证缓存功能
- [ ] 性能测试
- [ ] 更新 Swagger 文档

---

## 10. 时间估算

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| Phase 1 | Device Service (2个) | 40min |
| Phase 2 | User Service (1个) | 20min |
| Phase 3 | App Service (1个) | 20min |
| Phase 4 | Billing Service (2个) | 40min |
| Phase 5 | 测试与文档 | 30min |
| **总计** | **6个API** | **~2.5小时** |

---

## 11. 可选优化（P2）

1. **GraphQL支持**: 使用GraphQL替代REST，前端按需查询字段
2. **WebSocket实时更新**: 当数据变化时主动推送更新
3. **智能预加载**: 根据用户行为预加载常用列表
4. **分组聚合**: 支持按状态/类型分组的快速列表

---

**下一步**: 开始实施 Phase 1 - Device Service 的两个快速列表端点
