# API 响应格式迁移指南

## 背景

当前后端控制器存在 **双重包装** 问题：

```typescript
// 控制器返回
return { success: true, data: user, message: '创建成功' };

// TransformInterceptor 再次包装后
{ success: true, data: { success: true, data: user, message: '创建成功' }, timestamp: '...' }
```

导致前端需要 `response.data.data` 才能获取实际数据。

## 迁移目标

控制器只返回纯数据，由 `TransformInterceptor` 统一包装。

## 新的响应类型

从 `@cloudphone/shared` 导入：

```typescript
import {
  ActionResult,           // 操作结果（带消息）
  BatchActionResult,      // 批量操作结果
  PaginatedResponse,      // 分页响应
  AsyncOperationResult,   // 异步操作结果（Saga）
} from '@cloudphone/shared';
```

## 迁移规则

### 1. 列表查询 - 直接返回 service 结果

**Before:**
```typescript
async findAll() {
  const result = await this.service.findAll();
  return {
    success: true,
    ...result,
  };
}
```

**After:**
```typescript
async findAll() {
  return this.service.findAll();
}
```

### 2. 单个实体查询 - 直接返回

**Before:**
```typescript
async findOne(@Param('id') id: string) {
  const entity = await this.service.findOne(id);
  return {
    success: true,
    data: entity,
  };
}
```

**After:**
```typescript
async findOne(@Param('id') id: string) {
  return this.service.findOne(id);
}
```

### 3. 创建/更新操作（需要消息）- 使用 ActionResult

**Before:**
```typescript
async create(@Body() dto: CreateDto) {
  const entity = await this.service.create(dto);
  return {
    success: true,
    data: entity,
    message: '创建成功',
  };
}
```

**After:**
```typescript
async create(@Body() dto: CreateDto): Promise<ActionResult<Entity>> {
  const entity = await this.service.create(dto);
  return { data: entity, message: '创建成功' };
}
```

### 4. 删除操作（只需消息）- 使用 ActionResult

**Before:**
```typescript
async remove(@Param('id') id: string) {
  await this.service.remove(id);
  return {
    success: true,
    message: '删除成功',
  };
}
```

**After:**
```typescript
async remove(@Param('id') id: string): Promise<ActionResult> {
  await this.service.remove(id);
  return { message: '删除成功' };
}
```

### 5. 批量操作 - 使用 BatchActionResult

**Before:**
```typescript
async batchDelete(@Body() dto: { ids: string[] }) {
  const results = { success: 0, failed: 0 };
  // ... 处理逻辑
  return {
    success: true,
    data: results,
    message: `成功 ${results.success} 个`,
  };
}
```

**After:**
```typescript
async batchDelete(@Body() dto: { ids: string[] }): Promise<BatchActionResult<string>> {
  const succeeded: string[] = [];
  const failed: Array<{ item: string; error: string }> = [];
  // ... 处理逻辑
  return {
    succeeded,
    failed,
    message: `成功 ${succeeded.length} 个，失败 ${failed.length} 个`,
  };
}
```

### 6. 错误处理 - 使用异常而非返回错误

**Before:**
```typescript
if (!dto.ids) {
  return {
    success: false,
    message: '请提供 ID 列表',
  };
}
```

**After:**
```typescript
if (!dto.ids) {
  throw new BadRequestException('请提供 ID 列表');
}
```

## 服务迁移进度

| 服务 | 状态 | 迁移数量 |
|------|------|-----------|
| user-service | ✅ 完成 | ~25 处 |
| device-service | ✅ 完成 | 1 处 (Swagger 示例) |
| app-service | ✅ 完成 | 28 处 |
| billing-service | ✅ 完成 | 63 处 |
| notification-service | ✅ 完成 | 12 处 |
| proxy-service | ✅ 完成 | 5 处 |

## 前端适配

迁移后，前端 service 层需要更新：

**Before (双重包装):**
```typescript
// 最终响应: { success, data: { success, data: User, message }, timestamp }
const response = await api.get<{ data: User }>('/users/1');
return response.data;  // 需要取 .data
```

**After (单层包装):**
```typescript
// 最终响应: { success, data: User, timestamp }
const response = await api.get<User>('/users/1');
return response;  // 直接就是 User
```

## 验证方法

```bash
# 1. 构建服务
cd backend/user-service && pnpm build

# 2. 启动服务
pm2 restart user-service

# 3. 测试 API
curl http://localhost:30000/users/me -H "Authorization: Bearer $TOKEN" | jq
# 期望: { success: true, data: { id, username, ... }, timestamp, path }
```

## 注意事项

1. **逐步迁移**：每次只迁移一个控制器文件，验证后再继续
2. **前后端同步**：后端迁移后需同步更新前端 service 层
3. **测试覆盖**：确保有充分的 API 测试覆盖
4. **版本控制**：考虑使用 API 版本控制（/api/v2/）进行平滑迁移
