# 快速行动指南 - 权限系统修复

> 💡 **TL;DR**: 你们有完整的权限API，但JWT优化后普通用户无法使用。需要3-5天修复3个P0缺陷才能上线。

---

## 🚨 当前状态

### ✅ 已完成
- JWT Token优化：18KB → 0.4KB（减少97.7%）
- 超级管理员功能正常
- 完整的权限API（40+个端点）

### ❌ 问题
- **普通用户无法使用系统**（会收到403 Forbidden错误）
- 代码中有TODO但未实现权限查询逻辑
- 缺少性能优化（无缓存）

---

## 📋 3个P0缺陷

| ID | 问题 | 位置 | 修复时间 |
|----|------|------|----------|
| P0-1 | API Gateway未查询用户权限 | `backend/api-gateway/src/auth/guards/permissions.guard.ts:55` | 2天 |
| P0-2 | User Service权限提取失败 | `backend/user-service/src/auth/guards/permissions.guard.ts:47` | 1天 |
| P0-3 | 缺少Redis权限缓存 | 需要新建 | 1天 |

---

## 🛠️ 修复步骤

### 步骤1: 修复API Gateway（2天）

**文件**: `backend/api-gateway/src/auth/guards/permissions.guard.ts`

**要做的事**:
```typescript
// 1. 添加HttpService注入
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

constructor(
  private reflector: Reflector,
  private httpService: HttpService,  // ← 新增
) {}

// 2. 在canActivate方法中，超级管理员检查后添加：
if (user.isSuperAdmin === true) {
  return true;
}

// ← 新增以下代码：
let userPermissions: string[] = [];
try {
  const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:30001';
  const response = await firstValueFrom(
    this.httpService.get(
      `${userServiceUrl}/menu-permissions/user/${user.sub}/permissions`,
      {
        headers: {
          'Authorization': context.switchToHttp().getRequest().headers.authorization
        },
        timeout: 2000
      }
    )
  );

  if (response.data?.success && Array.isArray(response.data.data)) {
    userPermissions = response.data.data;
  }
} catch (error) {
  this.logger.error(`Failed to fetch permissions: ${error.message}`);
  throw new ForbiddenException('Unable to verify user permissions');
}

// 3. 替换原来的这一行：
// const permissions = user.permissions || [];  // ← 删除这行
// 改为：
const permissions = userPermissions;  // ← 使用查询到的权限
```

**还需要做**:
```typescript
// app.module.ts: 导入HttpModule
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,  // ← 新增
    // ... 其他imports
  ],
})
```

**环境变量**:
```env
# .env
USER_SERVICE_URL=http://localhost:30001
```

---

### 步骤2: 修复User Service（1天）

**文件**: `backend/user-service/src/auth/guards/permissions.guard.ts`

**要做的事**:
```typescript
// 1. 导入MenuPermissionService
import { MenuPermissionService } from '../permissions/menu-permission.service';
import { Inject, forwardRef } from '@nestjs/common';

// 2. 修改constructor
constructor(
  private reflector: Reflector,
  @Inject(forwardRef(() => MenuPermissionService))  // ← 新增
  private permissionsService: MenuPermissionService,
) {}

// 3. 修改canActivate方法
async canActivate(context: ExecutionContext): Promise<boolean> {  // ← 改为async
  // ... existing code ...

  if (user.isSuperAdmin === true) {
    return true;
  }

  // ← 替换这一行：
  // const userPermissions = this.extractPermissions(user.roles);
  // 改为：
  const userPermissions = await this.permissionsService.getUserPermissionNames(user.sub);

  // ... rest of the code ...
}
```

**注意**: 确保MenuPermissionService已正确导出（应该已经有了）

---

### 步骤3: 添加Redis缓存（1天）

**文件**: 新建`backend/shared/src/caching/permission-cache.service.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class PermissionCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getUserPermissions(userId: string, fetchFn: () => Promise<string[]>): Promise<string[]> {
    const cacheKey = `permissions:user:${userId}`;

    // 尝试从缓存获取
    const cached = await this.cacheManager.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 缓存未命中，从数据库查询
    const permissions = await fetchFn();

    // 写入缓存（TTL: 5分钟）
    await this.cacheManager.set(cacheKey, permissions, 300 * 1000);

    return permissions;
  }

  async invalidate(userId: string): Promise<void> {
    const cacheKey = `permissions:user:${userId}`;
    await this.cacheManager.del(cacheKey);
  }
}
```

**使用缓存**:

在API Gateway的PermissionsGuard中：
```typescript
// 替换直接HTTP请求为缓存包装
userPermissions = await this.permissionCacheService.getUserPermissions(
  user.sub,
  async () => {
    const response = await firstValueFrom(
      this.httpService.get(`${userServiceUrl}/menu-permissions/user/${user.sub}/permissions`)
    );
    return response.data?.data || [];
  }
);
```

---

### 步骤4: 测试（1天）

**创建测试用户**:
```bash
# 1. 创建普通用户（非超级管理员）
curl -X POST http://localhost:30001/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123!@#",
    "isSuperAdmin": false
  }'

# 2. 获取用户ID（从上面的响应中）
USER_ID="..."

# 3. 分配角色（假设角色ID已知）
curl -X POST http://localhost:30001/users/$USER_ID/roles \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"roleIds": ["role-uuid-123"]}'
```

**测试场景**:
```bash
# 1. 登录测试用户
TOKEN=$(curl -s -X POST http://localhost:30001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!@#","captcha":"1234","captchaId":"test"}' \
  | jq -r '.token')

# 2. 测试有权限的API（应该成功）
curl -s http://localhost:30000/users?page=1&pageSize=5 \
  -H "Authorization: Bearer $TOKEN"

# 3. 测试无权限的API（应该403）
curl -s -X DELETE http://localhost:30000/users/some-user-id \
  -H "Authorization: Bearer $TOKEN"
```

**预期结果**:
- ✅ 有权限的API返回200
- ✅ 无权限的API返回403 "需要所有权限: user.delete"
- ✅ 第二次请求使用缓存（响应时间明显降低）

---

## 📊 验证清单

完成修复后，运行以下检查：

```bash
# ✅ 检查项1: 超级管理员功能
./test-scripts/test-super-admin.sh
# 预期: 所有API调用成功

# ✅ 检查项2: 普通用户功能
./test-scripts/test-regular-user.sh
# 预期: 授权的API成功，未授权的403

# ✅ 检查项3: 缓存性能
./test-scripts/test-permission-cache.sh
# 预期: 第二次请求< 10ms

# ✅ 检查项4: 降级策略
# 手动停止User Service，测试API Gateway响应
pm2 stop user-service
curl http://localhost:30000/users -H "Authorization: Bearer $TOKEN"
# 预期: 返回503或友好的错误消息

# ✅ 检查项5: 权限变更生效
# 1. 修改用户权限
# 2. 清除缓存: curl GET /menu-permissions/cache/refresh/$USER_ID
# 3. 测试新权限立即生效
```

---

## 🎯 完成标准

**P0缺陷修复完成的标志**:

1. ✅ 创建一个普通用户（非超级管理员）
2. ✅ 为该用户分配"user:read"权限
3. ✅ 该用户可以访问 GET /users（成功）
4. ✅ 该用户无法访问 POST /users（403）
5. ✅ 第二次请求响应时间< 50ms（缓存生效）

**如果以上5项全部通过，说明P0缺陷已修复！**

---

## ⏱️ 时间估算

| 任务 | 开发 | 测试 | 总计 |
|------|------|------|------|
| API Gateway修复 | 1.5天 | 0.5天 | 2天 |
| User Service修复 | 0.5天 | 0.5天 | 1天 |
| Redis缓存实现 | 0.5天 | 0.5天 | 1天 |
| 集成测试 | - | 1天 | 1天 |
| **总计** | **2.5天** | **2.5天** | **5天** |

**建议配置**: 2名后端开发 + 1名测试 = 3-5个工作日完成

---

## 📞 需要帮助？

**常见问题**:

### Q1: HttpModule导入后报错？
```typescript
// 确保使用@nestjs/axios（不是旧的@nestjs/httpservice）
npm install @nestjs/axios rxjs
```

### Q2: forwardRef导致循环依赖？
```typescript
// 在两个模块中都使用forwardRef
// PermissionsModule:
exports: [MenuPermissionService],

// AuthGuard所在的Module:
imports: [forwardRef(() => PermissionsModule)]
```

### Q3: Redis缓存连接失败？
```bash
# 检查Redis是否运行
docker compose -f docker-compose.dev.yml ps redis

# 检查连接配置
cat backend/api-gateway/.env | grep REDIS
```

### Q4: 测试用户权限查询返回空数组？
```bash
# 确认用户有角色
psql -U postgres -d cloudphone -c "
  SELECT u.username, r.name as role, COUNT(p.id) as permissions
  FROM users u
  LEFT JOIN user_roles ur ON u.id = ur.userId
  LEFT JOIN roles r ON ur.roleId = r.id
  LEFT JOIN role_permissions rp ON r.id = rp.roleId
  LEFT JOIN permissions p ON rp.permissionId = p.id
  WHERE u.username = 'testuser'
  GROUP BY u.username, r.name;
"
```

---

## 🚀 部署后

**上线后第1天监控重点**:

```bash
# 1. 检查权限查询延迟
curl http://localhost:30000/metrics | grep permission_check_duration

# 2. 检查缓存命中率
curl http://localhost:30001/menu-permissions/cache/stats

# 3. 检查错误日志
pm2 logs api-gateway --err | grep -i "permission"
pm2 logs user-service --err | grep -i "permission"
```

**性能目标**:
- 权限查询P50 < 50ms ✅
- 权限查询P95 < 100ms ✅
- 缓存命中率 > 90% ✅
- 错误率 < 0.1% ✅

---

## 📚 相关文档

- **完整技术报告**: `PRODUCTION_READINESS_REPORT.md`（40页）
- **执行摘要**: `PRODUCTION_READINESS_SUMMARY.md`（10页）
- **本快速指南**: `QUICK_ACTION_GUIDE.md`（当前文档）

---

**最后更新**: 2025-11-08
**优先级**: 🔴 P0 - 上线阻塞

**💡 记住: 这3个修复是上线的必要条件，不能跳过！**
