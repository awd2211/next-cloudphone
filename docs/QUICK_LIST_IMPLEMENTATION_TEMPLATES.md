# 快速列表接口实施模板

**日期**: 2025-11-03
**状态**: 📝 实施指南
**参考示例**: device-service (已完成)

---

## 已完成的实施

### ✅ Device Service - `/devices/quick-list`

**状态**: 已完成并测试通过

**实施文件**:
- `src/devices/dto/quick-list.dto.ts` (新建)
- `src/cache/cache-keys.ts` (修改)
- `src/devices/devices.service.ts` (添加 getQuickList 方法)
- `src/devices/devices.controller.ts` (添加 GET /devices/quick-list 端点)

**测试结果**:
```bash
$ curl "http://localhost:30002/devices/quick-list?limit=10" -H "Authorization: Bearer $TOKEN"
{
  "success": true,
  "data": {
    "items": [],
    "total": 0,
    "cached": false
  }
}
```

---

## 待实施的快速列表接口（5个）

| 服务 | 端点 | 优先级 | 预计时间 |
|------|------|--------|----------|
| device-service | GET /templates/quick-list | P0 | 15min |
| user-service | GET /users/quick-list | P0 | 20min |
| app-service | GET /apps/quick-list | P0 | 20min |
| billing-service | GET /plans/quick-list | P1 | 20min |
| billing-service | GET /orders/quick-list | P1 | 20min |

---

## 通用实施步骤（复制模板）

### 步骤1: 创建 DTO 文件（可选，或复用）

如果服务中还没有快速列表 DTO，从 device-service 复制：

```bash
cp backend/device-service/src/devices/dto/quick-list.dto.ts \
   backend/{service-name}/src/{module}/dto/quick-list.dto.ts
```

**文件内容已标准化**，无需修改。

---

### 步骤2: 在 Service 中添加 getQuickList 方法

**模板代码**（根据实体字段调整）:

```typescript
/**
 * 获取{资源}快速列表（轻量级，用于下拉框等UI组件）
 */
async getQuickList(query: {
  status?: string;
  search?: string;
  limit?: number;
}): Promise<{
  items: Array<{ id: string; name: string; status?: string; extra?: Record<string, any> }>;
  total: number;
  cached: boolean;
}> {
  const limit = query.limit || 100;
  const cacheKey = `{service}:{resource}:quick-list:${JSON.stringify(query)}`;

  // 1. 尝试从缓存获取（如果有 cacheService）
  const cached = await this.cacheService?.get<any>(cacheKey);
  if (cached) {
    this.logger.debug(`Quick list cache hit: ${cacheKey}`);
    return { ...cached, cached: true };
  }

  // 2. 从数据库查询
  const qb = this.{resource}Repository
    .createQueryBuilder('{resource}')
    .select(['{resource}.id', '{resource}.name', '{resource}.status']) // 仅选择必要字段
    .orderBy('{resource}.createdAt', 'DESC')
    .limit(limit);

  // 3. 状态过滤
  if (query.status) {
    qb.andWhere('{resource}.status = :status', { status: query.status });
  }

  // 4. 关键词搜索
  if (query.search) {
    qb.andWhere('{resource}.name LIKE :search', { search: `%${query.search}%` });
  }

  const [{resource}s, total] = await qb.getManyAndCount();

  const result = {
    items: {resource}s.map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      extra: {
        // 添加额外字段（可选）
      },
    })),
    total,
    cached: false,
  };

  // 5. 缓存结果（60秒）
  await this.cacheService?.set(cacheKey, result, 60);

  return result;
}
```

---

### 步骤3: 在 Controller 中添加端点

**模板代码**:

```typescript
@Get('quick-list')
@RequirePermission('{resource}.read') // 根据实际权限调整
@ApiOperation({
  summary: '{资源}快速列表',
  description: '返回轻量级{资源}列表，用于下拉框等UI组件（带缓存优化）',
})
@ApiQuery({ name: 'status', required: false, description: '状态过滤', example: 'active' })
@ApiQuery({ name: 'search', required: false, description: '搜索关键词', example: 'test' })
@ApiQuery({ name: 'limit', required: false, description: '限制数量', example: 100 })
@ApiResponse({
  status: 200,
  description: '获取成功',
  schema: {
    example: {
      items: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: '{resource}-001',
          status: 'active',
          extra: {},
        },
      ],
      total: 42,
      cached: false,
    },
  },
})
@ApiResponse({ status: 403, description: '权限不足' })
async getQuickList(@Query() query: any) {
  return this.{resource}Service.getQuickList(query);
}
```

---

## 具体实施方案

### 2. Templates Quick List (device-service)

**文件**: `backend/device-service/src/templates/templates.controller.ts` + `templates.service.ts`

**Service 方法**:

```typescript
async getQuickList(query: {
  status?: string;
  search?: string;
  limit?: number;
}): Promise<{
  items: Array<{ id: string; name: string; status?: string; extra?: Record<string, any> }>;
  total: number;
  cached: boolean;
}> {
  const limit = query.limit || 100;
  const cacheKey = `device-service:template:quick-list:${JSON.stringify(query)}`;

  const cached = await this.cacheService.get<any>(cacheKey);
  if (cached) return { ...cached, cached: true };

  const qb = this.templateRepository
    .createQueryBuilder('template')
    .select(['template.id', 'template.name', 'template.type', 'template.isPublic'])
    .orderBy('template.createdAt', 'DESC')
    .limit(limit);

  if (query.search) {
    qb.andWhere('template.name LIKE :search', { search: `%${query.search}%` });
  }

  const [templates, total] = await qb.getManyAndCount();

  const result = {
    items: templates.map((t) => ({
      id: t.id,
      name: t.name,
      extra: {
        type: t.type,
        isPublic: t.isPublic,
      },
    })),
    total,
    cached: false,
  };

  await this.cacheService.set(cacheKey, result, 60);
  return result;
}
```

**Controller 端点**:

```typescript
@Get('quick-list')
@RequirePermission('template.read')
@ApiOperation({ summary: '模板快速列表' })
async getQuickList(@Query() query: any) {
  return this.templatesService.getQuickList(query);
}
```

---

### 3. Users Quick List (user-service)

**文件**: `backend/user-service/src/users/users.controller.ts` + `users.service.ts`

**Service 方法**:

```typescript
async getQuickList(query: {
  status?: string;
  search?: string;
  limit?: number;
}): Promise<{
  items: Array<{ id: string; name: string; status?: string; extra?: Record<string, any> }>;
  total: number;
  cached: boolean;
}> {
  const limit = query.limit || 100;
  const cacheKey = `user-service:user:quick-list:${JSON.stringify(query)}`;

  // User service 可能没有 cacheService，跳过缓存
  // const cached = await this.cacheService?.get<any>(cacheKey);
  // if (cached) return { ...cached, cached: true };

  const qb = this.userRepository
    .createQueryBuilder('user')
    .select(['user.id', 'user.username', 'user.email', 'user.role'])
    .orderBy('user.createdAt', 'DESC')
    .limit(limit);

  if (query.status) {
    qb.andWhere('user.status = :status', { status: query.status });
  }

  if (query.search) {
    qb.andWhere(
      '(user.username LIKE :search OR user.email LIKE :search)',
      { search: `%${query.search}%` }
    );
  }

  const [users, total] = await qb.getManyAndCount();

  const result = {
    items: users.map((u) => ({
      id: u.id,
      name: u.username,
      extra: {
        email: u.email,
        role: u.role,
      },
    })),
    total,
    cached: false,
  };

  // await this.cacheService?.set(cacheKey, result, 60);
  return result;
}
```

**Controller 端点**:

```typescript
@Get('quick-list')
@RequirePermission('user.read')
@ApiOperation({ summary: '用户快速列表' })
async getQuickList(@Query() query: any) {
  return this.usersService.getQuickList(query);
}
```

---

### 4. Apps Quick List (app-service)

**文件**: `backend/app-service/src/apps/apps.controller.ts` + `apps.service.ts`

**Service 方法**:

```typescript
async getQuickList(query: {
  status?: string;
  search?: string;
  limit?: number;
}): Promise<{
  items: Array<{ id: string; name: string; status?: string; extra?: Record<string, any> }>;
  total: number;
  cached: boolean;
}> {
  const limit = query.limit || 100;
  const cacheKey = `app-service:app:quick-list:${JSON.stringify(query)}`;

  // App service 可能没有 cacheService，跳过缓存
  const qb = this.appRepository
    .createQueryBuilder('app')
    .select(['app.id', 'app.name', 'app.packageName', 'app.version', 'app.status'])
    .orderBy('app.createdAt', 'DESC')
    .limit(limit);

  if (query.status) {
    qb.andWhere('app.status = :status', { status: query.status });
  }

  if (query.search) {
    qb.andWhere(
      '(app.name LIKE :search OR app.packageName LIKE :search)',
      { search: `%${query.search}%` }
    );
  }

  const [apps, total] = await qb.getManyAndCount();

  const result = {
    items: apps.map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      extra: {
        packageName: a.packageName,
        version: a.version,
      },
    })),
    total,
    cached: false,
  };

  return result;
}
```

**Controller 端点**:

```typescript
@Get('quick-list')
@RequirePermission('app.read')
@ApiOperation({ summary: '应用快速列表' })
async getQuickList(@Query() query: any) {
  return this.appsService.getQuickList(query);
}
```

---

### 5. Plans Quick List (billing-service)

**文件**: `backend/billing-service/src/plans/plans.controller.ts` + `plans.service.ts`

**Service 方法**:

```typescript
async getQuickList(query: {
  status?: string;
  search?: string;
  limit?: number;
}): Promise<{
  items: Array<{ id: string; name: string; status?: string; extra?: Record<string, any> }>;
  total: number;
  cached: boolean;
}> {
  const limit = query.limit || 100;

  const qb = this.planRepository
    .createQueryBuilder('plan')
    .select(['plan.id', 'plan.name', 'plan.price', 'plan.duration', 'plan.currency'])
    .where('plan.isActive = :isActive', { isActive: true }) // 只返回激活的套餐
    .orderBy('plan.price', 'ASC')
    .limit(limit);

  if (query.search) {
    qb.andWhere('plan.name LIKE :search', { search: `%${query.search}%` });
  }

  const [plans, total] = await qb.getManyAndCount();

  const result = {
    items: plans.map((p) => ({
      id: p.id,
      name: p.name,
      extra: {
        price: p.price,
        duration: p.duration,
        currency: p.currency || 'USD',
      },
    })),
    total,
    cached: false,
  };

  return result;
}
```

**Controller 端点**:

```typescript
@Get('quick-list')
@RequirePermission('billing.read')
@ApiOperation({ summary: '套餐快速列表' })
async getQuickList(@Query() query: any) {
  return this.plansService.getQuickList(query);
}
```

---

### 6. Orders Quick List (billing-service)

**文件**: `backend/billing-service/src/orders/orders.controller.ts` + `orders.service.ts`

**Service 方法**:

```typescript
async getQuickList(query: {
  status?: string;
  search?: string;
  limit?: number;
}): Promise<{
  items: Array<{ id: string; name: string; status?: string; extra?: Record<string, any> }>;
  total: number;
  cached: boolean;
}> {
  const limit = query.limit || 100;

  const qb = this.orderRepository
    .createQueryBuilder('order')
    .select(['order.id', 'order.orderNumber', 'order.status', 'order.totalAmount', 'order.currency'])
    .orderBy('order.createdAt', 'DESC')
    .limit(limit);

  if (query.status) {
    qb.andWhere('order.status = :status', { status: query.status });
  }

  if (query.search) {
    qb.andWhere('order.orderNumber LIKE :search', { search: `%${query.search}%` });
  }

  const [orders, total] = await qb.getManyAndCount();

  const result = {
    items: orders.map((o) => ({
      id: o.id,
      name: `Order ${o.orderNumber}`,
      status: o.status,
      extra: {
        orderNumber: o.orderNumber,
        totalAmount: o.totalAmount,
        currency: o.currency || 'USD',
      },
    })),
    total,
    cached: false,
  };

  return result;
}
```

**Controller 端点**:

```typescript
@Get('quick-list')
@RequirePermission('billing.read')
@ApiOperation({ summary: '订单快速列表' })
async getQuickList(@Query() query: any) {
  return this.ordersService.getQuickList(query);
}
```

---

## 测试脚本模板

```bash
#!/bin/bash

TOKEN="your-jwt-token-here"

echo "=== 1. 测试设备快速列表 ==="
curl -s "http://localhost:30002/devices/quick-list?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n=== 2. 测试模板快速列表 ==="
curl -s "http://localhost:30002/templates/quick-list?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n=== 3. 测试用户快速列表 ==="
curl -s "http://localhost:30001/users/quick-list?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n=== 4. 测试应用快速列表 ==="
curl -s "http://localhost:30003/apps/quick-list?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n=== 5. 测试套餐快速列表 ==="
curl -s "http://localhost:30005/plans/quick-list?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n=== 6. 测试订单快速列表 ==="
curl -s "http://localhost:30005/orders/quick-list?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## 实施清单

### ✅ 已完成

- [x] device-service: GET /devices/quick-list

### ⏳ 待实施

- [ ] device-service: GET /templates/quick-list
- [ ] user-service: GET /users/quick-list
- [ ] app-service: GET /apps/quick-list
- [ ] billing-service: GET /plans/quick-list
- [ ] billing-service: GET /orders/quick-list

---

## 关键注意事项

### 1. 缓存处理

- Device Service **有** CacheService → **使用缓存**
- User/App/Billing Service **可能没有** CacheService → **跳过缓存或添加 CacheModule**

### 2. 字段选择

每个实体的字段不同，需要根据实际情况调整 `.select([...])`:

```typescript
// Device
.select(['device.id', 'device.name', 'device.status', 'device.providerType'])

// User
.select(['user.id', 'user.username', 'user.email', 'user.role'])

// App
.select(['app.id', 'app.name', 'app.packageName', 'app.version'])
```

### 3. 权限配置

确保权限装饰器正确：

```typescript
@RequirePermission('device.read')  // device-service
@RequirePermission('user.read')    // user-service
@RequirePermission('app.read')     // app-service
@RequirePermission('billing.read') // billing-service
```

### 4. 响应格式

某些服务可能有全局响应拦截器，返回格式为：

```json
{
  "success": true,
  "data": { "items": [...], "total": 0, "cached": false }
}
```

这是正常的，无需修改 Service 返回值。

---

## 前端使用示例

### React Query Hook

```typescript
export function useQuickList(
  resource: 'devices' | 'users' | 'apps' | 'plans' | 'orders',
  options?: { status?: string; search?: string; limit?: number }
) {
  const servicePort = {
    devices: 30002,
    users: 30001,
    apps: 30003,
    plans: 30005,
    orders: 30005,
  }[resource];

  return useQuery({
    queryKey: [resource, 'quick-list', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.status) params.append('status', options.status);
      if (options?.search) params.append('search', options.search);
      if (options?.limit) params.append('limit', options.limit.toString());

      const response = await fetch(
        `http://localhost:${servicePort}/${resource}/quick-list?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.json();
    },
    staleTime: 60 * 1000, // 60秒缓存
  });
}
```

### Ant Design Select

```tsx
function ResourceSelector({ resource }: { resource: string }) {
  const { data, isLoading } = useQuickList(resource);

  return (
    <Select
      loading={isLoading}
      placeholder={`选择${resource}`}
      showSearch
      filterOption={false}
      options={data?.items?.map(item => ({
        label: item.name,
        value: item.id,
        ...item.extra,
      }))}
    />
  );
}
```

---

**实施建议**: 按优先级顺序实施，先完成 P0 接口（devices, templates, users, apps），再实施 P1 接口（plans, orders）。

**预计总时间**: ~2小时（包括测试）
