# P1 任务指南 - 添加Swagger API文档

**日期**: 2025-11-04
**优先级**: P1 (Important)
**状态**: 🚧 进行中
**预计工作量**: 4-6小时

---

## 目标

为权限系统的所有API端点添加完整的Swagger/OpenAPI文档,以便:
1. 前端开发人员快速理解API接口
2. 自动生成API文档页面
3. 支持API测试工具集成
4. 提供请求/响应示例

---

## 需要文档化的控制器

| 控制器 | 端点数量 | 状态 |
|--------|----------|------|
| DataScopeController | 9 | ✅ 已完成(示例) |
| FieldPermissionController | 9 | ⏳ 待完成 |
| MenuPermissionController | 10 | ⏳ 待完成 |
| PermissionsController | ~8 | ⏳ 待完成 |

---

## Swagger装饰器模式

### 1. 导入必要的装饰器

```typescript
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
  ApiQuery,
  ApiParam,
  ApiBearerAuth
} from '@nestjs/swagger';
```

### 2. 为Controller添加标签

```typescript
@ApiTags('数据范围管理') // 在Swagger UI中的分组名称
@ApiBearerAuth() // 标记需要JWT认证
@Controller('data-scopes')
@UseGuards(EnhancedPermissionsGuard)
export class DataScopeController {
  // ...
}
```

### 3. 为DTO添加ApiProperty

**示例 - CreateDataScopeDto**:

```typescript
class CreateDataScopeDto {
  @ApiProperty({
    description: '角色ID',
    example: 'role-uuid-123'
  })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({
    description: '资源类型',
    example: 'device',
    enum: ['device', 'user', 'order', 'report']
  })
  @IsString()
  @IsNotEmpty()
  resourceType: string;

  @ApiProperty({
    description: '数据范围类型',
    enum: ScopeType,
    example: ScopeType.DEPARTMENT
  })
  @IsEnum(ScopeType)
  scopeType: ScopeType;

  @ApiProperty({
    description: '自定义过滤条件',
    required: false,
    example: { status: 'active', createdAt: { $gt: '2024-01-01' } }
  })
  @IsObject()
  @IsOptional()
  filter?: DataScopeFilter;

  // ... 其他字段
}
```

**关键要素**:
- `description`: 字段说明
- `example`: 示例值
- `required`: 是否必填(默认true)
- `enum`: 枚举值
- `type`: 数组类型使用 `[String]` 或 `[Number]`

### 4. 为端点添加ApiOperation和ApiResponse

**示例 - GET /data-scopes**:

```typescript
@Get()
@ApiOperation({
  summary: '获取所有数据范围配置',
  description: '根据条件查询数据范围配置列表,支持按角色、资源类型、状态过滤'
})
@ApiQuery({
  name: 'roleId',
  required: false,
  description: '角色ID',
  example: 'role-uuid-123'
})
@ApiQuery({
  name: 'resourceType',
  required: false,
  description: '资源类型',
  example: 'device'
})
@ApiQuery({
  name: 'isActive',
  required: false,
  description: '是否启用',
  example: 'true'
})
@ApiResponse({
  status: 200,
  description: '查询成功',
  schema: {
    example: {
      success: true,
      data: [
        {
          id: 'scope-uuid-1',
          roleId: 'role-uuid-1',
          resourceType: 'device',
          scopeType: 'DEPARTMENT',
          isActive: true,
          priority: 100,
          createdAt: '2024-01-01T00:00:00Z'
        }
      ],
      total: 1
    }
  }
})
@SkipPermission()
async findAll(
  @Query('roleId') roleId?: string,
  @Query('resourceType') resourceType?: string,
  @Query('isActive') isActive?: string
) {
  // ...
}
```

**示例 - POST /data-scopes**:

```typescript
@Post()
@ApiOperation({
  summary: '创建数据范围配置',
  description: '为指定角色创建数据访问范围配置'
})
@ApiResponse({
  status: 201,
  description: '创建成功',
  schema: {
    example: {
      success: true,
      message: '数据范围配置创建成功',
      data: {
        id: 'scope-uuid-1',
        roleId: 'role-uuid-1',
        resourceType: 'device',
        scopeType: 'DEPARTMENT',
        isActive: true,
        priority: 100
      }
    }
  }
})
@ApiResponse({
  status: 400,
  description: '配置已存在或参数错误',
  schema: {
    example: {
      success: false,
      message: '该角色对此资源类型的数据范围配置已存在'
    }
  }
})
@ApiResponse({
  status: 403,
  description: '权限不足'
})
@RequirePermissions('permission:dataScope:create')
@AuditCreate('dataScope')
async create(@Body() dto: CreateDataScopeDto) {
  // ...
}
```

**示例 - GET /data-scopes/:id**:

```typescript
@Get(':id')
@ApiOperation({
  summary: '获取数据范围配置详情',
  description: '根据ID获取单个数据范围配置的详细信息'
})
@ApiParam({
  name: 'id',
  description: '数据范围配置ID',
  example: 'scope-uuid-123'
})
@ApiResponse({
  status: 200,
  description: '查询成功',
  schema: {
    example: {
      success: true,
      data: {
        id: 'scope-uuid-1',
        roleId: 'role-uuid-1',
        resourceType: 'device',
        scopeType: 'DEPARTMENT',
        filter: { status: 'active' },
        role: {
          id: 'role-uuid-1',
          name: '销售主管'
        },
        isActive: true,
        priority: 100,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    }
  }
})
@ApiResponse({
  status: 404,
  description: '配置不存在',
  schema: {
    example: {
      success: false,
      message: '数据范围配置不存在'
    }
  }
})
@RequirePermissions('permission:dataScope:view')
async findOne(@Param('id') id: string) {
  // ...
}
```

**示例 - PUT /data-scopes/:id**:

```typescript
@Put(':id')
@ApiOperation({
  summary: '更新数据范围配置',
  description: '更新指定ID的数据范围配置信息'
})
@ApiParam({
  name: 'id',
  description: '数据范围配置ID',
  example: 'scope-uuid-123'
})
@ApiResponse({
  status: 200,
  description: '更新成功'
})
@ApiResponse({
  status: 404,
  description: '配置不存在'
})
@RequirePermissions('permission:dataScope:update')
@AuditUpdate('dataScope')
async update(@Param('id') id: string, @Body() dto: UpdateDataScopeDto) {
  // ...
}
```

**示例 - DELETE /data-scopes/:id**:

```typescript
@Delete(':id')
@ApiOperation({
  summary: '删除数据范围配置',
  description: '删除指定ID的数据范围配置'
})
@ApiParam({
  name: 'id',
  description: '数据范围配置ID',
  example: 'scope-uuid-123'
})
@ApiResponse({
  status: 200,
  description: '删除成功',
  schema: {
    example: {
      success: true,
      message: '数据范围配置删除成功'
    }
  }
})
@ApiResponse({
  status: 404,
  description: '配置不存在'
})
@RequirePermissions('permission:dataScope:delete')
@AuditDelete('dataScope')
async remove(@Param('id') id: string) {
  // ...
}
```

---

## 常用响应模式

### 成功响应(200/201)
```typescript
{
  success: true,
  message: '操作成功',
  data: { /* 返回的数据 */ }
}
```

### 列表响应
```typescript
{
  success: true,
  data: [ /* 列表项 */ ],
  total: 100
}
```

### 错误响应(400/404)
```typescript
{
  success: false,
  message: '错误信息描述'
}
```

### 权限不足(403)
```typescript
{
  statusCode: 403,
  message: 'Forbidden',
  error: 'Insufficient permissions'
}
```

---

## 配置Swagger入口

在 `main.ts` 中配置Swagger:

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger配置
  const config = new DocumentBuilder()
    .setTitle('User Service API')
    .setDescription('用户服务和权限管理API文档')
    .setVersion('1.0')
    .addTag('permissions', '权限管理')
    .addTag('data-scopes', '数据范围')
    .addTag('field-permissions', '字段权限')
    .addTag('menu-permissions', '菜单权限')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(30001);
}
```

访问文档: `http://localhost:30001/api/docs`

---

## 实施步骤

### Phase 1: FieldPermissionController (预计2小时)

1. **导入Swagger装饰器**
2. **为Controller添加标签**:
   ```typescript
   @ApiTags('字段权限管理')
   @ApiBearerAuth()
   ```

3. **为DTOs添加ApiProperty**:
   - CreateFieldPermissionDto
   - UpdateFieldPermissionDto

4. **为端点添加文档** (9个端点):
   - `GET /field-permissions` - 获取列表
   - `GET /field-permissions/:id` - 获取详情
   - `GET /field-permissions/role/:roleId` - 按角色获取
   - `POST /field-permissions` - 创建
   - `PUT /field-permissions/:id` - 更新
   - `DELETE /field-permissions/:id` - 删除
   - `POST /field-permissions/batch` - 批量创建
   - `PUT /field-permissions/:id/toggle` - 切换状态
   - `GET /field-permissions/meta/*` - 元数据端点(3个)

5. **测试**: 访问Swagger UI验证文档正确性

### Phase 2: MenuPermissionController (预计2小时)

1. **导入Swagger装饰器**
2. **为Controller添加标签**:
   ```typescript
   @ApiTags('菜单权限管理')
   @ApiBearerAuth()
   ```

3. **为端点添加文档** (10个端点):
   - `GET /menu-permissions/my-menus` - 我的菜单
   - `GET /menu-permissions/my-permissions` - 我的权限
   - `GET /menu-permissions/check-menu-access` - 检查访问权限
   - `GET /menu-permissions/all-menus` - 所有菜单
   - `GET /menu-permissions/user/:userId/menus` - 用户菜单
   - `GET /menu-permissions/user/:userId/permissions` - 用户权限
   - `GET /menu-permissions/breadcrumb` - 面包屑
   - `GET /menu-permissions/cache/refresh/:userId` - 刷新缓存
   - `GET /menu-permissions/cache/clear-all` - 清空缓存
   - `GET /menu-permissions/cache/stats` - 缓存统计
   - `GET /menu-permissions/cache/warmup` - 预热缓存
   - `GET /menu-permissions/cache/stats-detail` - 详细统计

4. **测试**: 访问Swagger UI验证文档正确性

### Phase 3: PermissionsController (预计1-2小时)

1. **导入Swagger装饰器**
2. **为Controller添加标签**:
   ```typescript
   @ApiTags('权限管理')
   @ApiBearerAuth()
   ```

3. **为DTOs添加ApiProperty**:
   - CreatePermissionDto
   - UpdatePermissionDto

4. **为端点添加文档** (~8个端点)

5. **测试**: 访问Swagger UI验证文档正确性

---

## 验证清单

完成每个控制器后,检查:

- [ ] 所有DTOs都有`@ApiProperty`装饰器
- [ ] 所有端点都有`@ApiOperation`
- [ ] 所有端点都有至少一个`@ApiResponse`(200/201)
- [ ] 错误响应都有文档(400/403/404)
- [ ] Query参数都有`@ApiQuery`
- [ ] Path参数都有`@ApiParam`
- [ ] Controller有`@ApiTags`
- [ ] Controller有`@ApiBearerAuth`
- [ ] Swagger UI可以正常访问
- [ ] 所有示例数据都是合理的

---

## 最佳实践

### 1. 描述要清晰简洁
```typescript
// ❌ 不好
description: 'Get data'

// ✅ 好
description: '获取所有数据范围配置列表'
```

### 2. 提供实际示例
```typescript
// ❌ 不好
example: 'string'

// ✅ 好
example: 'role-uuid-123-456-789'
```

### 3. 文档化所有可能的响应
```typescript
@ApiResponse({ status: 200, description: '成功' })
@ApiResponse({ status: 400, description: '参数错误' })
@ApiResponse({ status: 403, description: '权限不足' })
@ApiResponse({ status: 404, description: '资源不存在' })
```

### 4. 使用有意义的标签
```typescript
// ❌ 不好
@ApiTags('controller')

// ✅ 好
@ApiTags('数据范围管理')
```

### 5. 包含请求体示例
```typescript
@ApiProperty({
  description: '字段转换规则',
  required: false,
  example: {
    phone: { type: 'mask', pattern: '***-****-{4}' },
    email: { type: 'mask', pattern: '{3}***@***' },
    password: { type: 'hash' }
  }
})
```

---

## 完成标准

所有P1 Swagger文档任务完成后:

✅ **功能完整性**:
- 3-4个控制器完全文档化
- 所有DTO都有详细说明
- 所有端点都有操作描述和响应示例

✅ **质量标准**:
- Swagger UI可以正常访问
- 所有示例数据合理且一致
- 文档描述清晰易懂

✅ **可用性**:
- 前端开发可以通过Swagger了解所有API
- 支持API测试工具集成
- 自动生成的文档完整准确

---

## 工具和资源

**Swagger Editor**: https://editor.swagger.io/
**NestJS Swagger文档**: https://docs.nestjs.com/openapi/introduction
**OpenAPI规范**: https://swagger.io/specification/

**本地Swagger UI**: `http://localhost:30001/api/docs`

---

**创建日期**: 2025-11-04
**最后更新**: 2025-11-04
**版本**: 1.0
