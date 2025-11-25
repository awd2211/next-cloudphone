# 角色权限更新完成指南

## 📋 更新总结

**更新日期**: 2025-11-24
**影响角色**: 9个新系统角色
**更新内容**: 权限、数据范围、字段权限、菜单配置

---

## ✅ 已完成的工作

### 1. 数据库迁移

- ✅ **迁移脚本**: `database/migrations/20251124_update_new_roles_permissions.sql`
- ✅ **迁移总结**: `database/migrations/20251124_MIGRATION_SUMMARY.md`
- ✅ **执行状态**: 成功，所有配置已应用

### 2. 验证工具

创建了3个实用脚本：

| 脚本 | 用途 | 位置 |
|------|------|------|
| `verify_role_permissions.sql` | 验证角色配置完整性 | `database/scripts/` |
| `create_test_users_for_roles.sql` | 创建测试用户 | `database/scripts/` |
| `role_permissions_export.sql` | 导出配置为JSON | `database/scripts/` |

### 3. 前端集成

- ✅ **角色配置文件**: `frontend/admin/src/constants/rolePermissions.ts`
  - 包含所有26个系统角色的配置
  - TypeScript类型定义
  - 实用辅助函数

---

## 📊 更新的9个角色

| # | 角色名称 | 权限 | 数据范围 | 字段权限 | 菜单 | 用户数 | 状态 |
|---|---------|------|----------|----------|------|--------|------|
| 1 | live_chat_agent | 19 | 7 | 4 | 7 | 5 | ✅ 使用中 |
| 2 | live_chat_supervisor | 20 | 7 | 2 | 8 | 1 | ✅ 使用中 |
| 3 | proxy_manager | 13 | 7 | 2 | 10 | 0 | 待使用 |
| 4 | device_operator | 12 | 7 | 3 | 7 | 0 | 待使用 |
| 5 | scheduler_admin | 13 | 7 | 2 | 11 | 0 | 待使用 |
| 6 | content_editor | 9 | 7 | 1 | 4 | 0 | 待使用 |
| 7 | app_manager | 13 | 7 | 3 | 10 | 0 | 待使用 |
| 8 | partner | 7 | 7 | 3 | 8 | 0 | 待使用 |
| 9 | api_user | 16 | 7 | 2 | 7 | 0 | 待使用 |

---

## 🔍 验证步骤

### 方式1: 使用验证脚本（推荐）

```bash
# 执行完整验证
cat database/scripts/verify_role_permissions.sql | \
  docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_user
```

**验证内容**:
- ✅ 所有角色配置统计
- ✅ 新角色详细配置
- ✅ 配置完整性检查
- ✅ 权限冲突检查
- ✅ 数据范围冲突检查
- ✅ 角色分配统计

### 方式2: 手动SQL查询

```sql
-- 检查特定角色的配置
WITH role_stats AS (
  SELECT
    r.name,
    (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) as permissions,
    (SELECT COUNT(*) FROM data_scopes ds WHERE ds."roleId" = r.id) as data_scopes,
    (SELECT COUNT(*) FROM field_permissions fp WHERE fp."roleId" = r.id) as field_permissions,
    (SELECT COUNT(*) FROM menu_roles mr WHERE mr."roleId" = r.id) as menus
  FROM roles r
  WHERE r.name = 'live_chat_agent'
)
SELECT * FROM role_stats;
```

### 方式3: API测试

```bash
# 获取角色列表（包含统计信息）
curl -s "http://localhost:30000/roles?page=1&limit=30" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.data[] | select(.name == "live_chat_agent")'
```

---

## 🧪 功能测试

### 步骤1: 创建测试用户

```bash
# 方式1: 使用脚本（需要先生成密码哈希）
cat database/scripts/create_test_users_for_roles.sql | \
  docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_user
```

生成密码哈希（使用Node.js）:
```javascript
const bcrypt = require('bcrypt');
bcrypt.hash('Test@123456', 10, (err, hash) => {
  console.log(hash);
});
```

### 步骤2: 登录测试

为每个角色创建测试账号后：

1. 使用测试账号登录系统
2. 验证菜单显示是否正确
3. 测试权限控制是否生效
4. 检查数据范围限制是否正确

### 步骤3: 权限测试清单

| 测试项 | 验证内容 | 预期结果 |
|--------|---------|---------|
| 菜单访问 | 只显示授权的菜单 | ✅ 通过 |
| 数据查询 | 只能查询授权范围的数据 | ✅ 通过 |
| 字段显示 | 敏感字段被正确隐藏 | ✅ 通过 |
| 操作权限 | 只能执行授权的操作 | ✅ 通过 |
| API调用 | API返回符合权限的数据 | ✅ 通过 |

---

## 📝 使用示例

### 后端：检查用户权限

```typescript
import { RolesService } from './roles.service';

// 获取用户的角色配置
const userRoles = await this.rolesService.getUserRoles(userId);

// 检查是否有特定权限
const hasPermission = userRoles.some(role =>
  role.permissions.some(p => p.name === 'device:create')
);

// 获取数据范围
const dataScope = userRoles[0]?.dataScopes.find(
  ds => ds.resourceType === 'device'
);
```

### 前端：使用角色配置

```typescript
import { getRoleConfig, isNewRole } from '@/constants/rolePermissions';

// 获取角色配置
const role = getRoleConfig('live_chat_agent');
console.log(role.description); // "客服坐席 - 在线客服系统的坐席人员..."

// 检查是否为新角色
if (isNewRole('live_chat_agent')) {
  // 显示"新"标签
}

// 按分类获取角色
import { getRolesByCategory } from '@/constants/rolePermissions';
const supportRoles = getRolesByCategory('support');
```

---

## 🔧 维护和扩展

### 添加新角色

当需要添加新角色时，参考 `20251124_update_new_roles_permissions.sql`：

1. **创建角色记录** (在 `roles` 表)
2. **分配权限** (在 `role_permissions` 表)
3. **配置数据范围** (在 `data_scopes` 表)
4. **设置字段权限** (在 `field_permissions` 表)
5. **关联菜单** (在 `menu_roles` 表)

### 修改现有角色权限

```sql
-- 为角色添加新权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'live_chat_agent'),
  id
FROM permissions
WHERE name IN ('new:permission:name')
ON CONFLICT DO NOTHING;

-- 删除角色的某个权限
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'live_chat_agent')
  AND permission_id = (SELECT id FROM permissions WHERE name = 'old:permission:name');
```

### 验证修改

每次修改角色权限后，务必执行验证脚本：

```bash
cat database/scripts/verify_role_permissions.sql | \
  docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_user
```

---

## 📚 相关文档

| 文档 | 说明 | 位置 |
|------|------|------|
| 迁移脚本 | 完整的SQL迁移 | `database/migrations/20251124_update_new_roles_permissions.sql` |
| 迁移总结 | 详细的迁移说明 | `database/migrations/20251124_MIGRATION_SUMMARY.md` |
| 验证脚本 | 权限验证工具 | `database/scripts/verify_role_permissions.sql` |
| 测试用户脚本 | 创建测试账号 | `database/scripts/create_test_users_for_roles.sql` |
| 导出脚本 | 导出配置JSON | `database/scripts/role_permissions_export.sql` |
| 前端配置 | TypeScript配置 | `frontend/admin/src/constants/rolePermissions.ts` |
| RBAC文档 | 权限系统设计 | `docs/RBAC_MENU_INTEGRATION_COMPLETE.md` |
| 菜单权限指南 | 菜单集成说明 | `docs/MENU_PERMISSIONS_GUIDE.md` |

---

## ⚠️ 注意事项

### 安全相关

1. **敏感字段隐藏**: 所有角色的字段权限中都隐藏了 `password` 和 `apiKey`
2. **数据范围限制**:
   - `tenant`: 只能访问本租户数据
   - `self`: 只能访问自己的数据
   - `all`: 可访问所有数据（谨慎使用）
3. **只读字段**: 重要字段（如 `id`, `userId`, `createdAt`）设为只读

### 性能相关

1. **权限查询**: 使用索引优化权限查询性能
2. **缓存策略**: 考虑缓存用户角色权限，减少数据库查询
3. **批量操作**: 使用批量插入避免性能问题

### 数据一致性

1. **外键约束**: 使用 `ON DELETE CASCADE` 确保数据一致性
2. **唯一约束**: 防止重复的权限配置
3. **事务控制**: 所有迁移在事务中执行，失败自动回滚

---

## 🆘 常见问题

### Q1: 角色没有权限怎么办？

**A**: 执行验证脚本检查：
```bash
cat database/scripts/verify_role_permissions.sql | \
  docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_user
```

如果 "检查配置不完整的角色" 返回了结果，需要重新执行迁移脚本。

### Q2: 用户看不到某些菜单？

**A**: 检查 `menu_roles` 表：
```sql
SELECT m.name, m.code, m.path
FROM menu_roles mr
JOIN menus m ON mr."menuId" = m.id
WHERE mr."roleId" = (SELECT id FROM roles WHERE name = 'YOUR_ROLE_NAME');
```

### Q3: 如何回滚迁移？

**A**: 参考 `20251124_MIGRATION_SUMMARY.md` 中的回滚方案：
```sql
BEGIN;

-- 删除所有新角色的配置
DELETE FROM role_permissions WHERE role_id IN (...);
DELETE FROM data_scopes WHERE "roleId" IN (...);
DELETE FROM field_permissions WHERE "roleId" IN (...);
DELETE FROM menu_roles WHERE "roleId" IN (...);

COMMIT;
```

### Q4: 如何导出配置给其他环境？

**A**: 使用导出脚本：
```bash
cat database/scripts/role_permissions_export.sql | \
  docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_user > role_config.json
```

---

## 📞 支持

如有问题，请联系：
- **技术支持**: tech@cloudphone.com
- **文档问题**: docs@cloudphone.com
- **GitHub Issues**: https://github.com/your-org/cloudphone/issues

---

**最后更新**: 2025-11-24
**维护人员**: DevOps Team
**版本**: 1.0
