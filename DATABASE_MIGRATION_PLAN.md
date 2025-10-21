# 数据库拆分迁移计划（安全方案）

**重要原则**: ⚠️ **不删除原数据库，先迁移后验证！**

---

## 🛡️ 安全迁移策略

### 步骤概览

```
1. 创建新数据库 ✅
2. 复制表结构到新库（使用 synchronize）
3. 复制数据（如果有）
4. 更新服务配置指向新库
5. 测试验证所有功能
6. 保留旧库7天作为备份
7. 确认无问题后删除旧库
```

**当前状态**: 
- ✅ cloudphone_core（保留，作为备份）
- ✅ cloudphone_billing（保留）
- ✅ cloudphone_user（新建）
- ✅ cloudphone_device（新建）
- ✅ cloudphone_app（新建）
- ✅ cloudphone_notification（新建）
- ✅ cloudphone_auth（新建）

---

## 📊 新旧数据库对照表

### 迁移映射关系

| 源数据库 | 表 | 目标数据库 | 新所有者服务 |
|----------|---|------------|--------------|
| cloudphone_core | users, roles, permissions, audit_logs, api_keys, quotas | cloudphone_user | user-service |
| cloudphone_core | devices, nodes, device_templates, device_snapshots | cloudphone_device | device-service |
| cloudphone_core | applications, device_applications | cloudphone_app | app-service |
| cloudphone_core | notifications | cloudphone_notification | notification-service |
| cloudphone_core | (sessions, tokens) | cloudphone_auth | api-gateway |
| cloudphone_billing | *(所有表) | cloudphone_billing | billing-service (保持不变) |

---

## 🔄 详细迁移步骤

### Step 1: 创建新数据库 ✅ 已完成

```sql
CREATE DATABASE cloudphone_user;        ✅
CREATE DATABASE cloudphone_device;      ✅
CREATE DATABASE cloudphone_app;         ✅
CREATE DATABASE cloudphone_notification;✅
CREATE DATABASE cloudphone_auth;        ✅
```

### Step 2: 在新库中创建表结构

**方法**: 使用 TypeORM synchronize 自动创建

```bash
# 临时启用 synchronize，指向新数据库
# 服务会自动创建所需的表
```

### Step 3: 迁移现有数据（如果有）

```sql
-- 从 cloudphone_core 复制到各个新库

-- User Service 数据
\c cloudphone_user
INSERT INTO users SELECT * FROM cloudphone_core.users;
INSERT INTO roles SELECT * FROM cloudphone_core.roles;
INSERT INTO permissions SELECT * FROM cloudphone_core.permissions;
-- ... 等等

-- Device Service 数据
\c cloudphone_device
INSERT INTO devices SELECT * FROM cloudphone_core.devices;
INSERT INTO nodes SELECT * FROM cloudphone_core.nodes;
-- ... 等等
```

**当前状态**: cloudphone_core 中的表是空的（刚创建），所以无需复制数据 ✅

### Step 4: 更新服务配置

修改每个服务指向新数据库：

```typescript
// user-service → cloudphone_user
// device-service → cloudphone_device
// app-service → cloudphone_app
// notification-service → cloudphone_notification
// api-gateway → cloudphone_auth
// billing-service → cloudphone_billing (不变)
```

### Step 5: 处理跨服务关联

添加冗余字段和事件监听：

```typescript
// device.entity.ts 添加冗余字段
@Column({ nullable: true })
userName: string;  // 从 user-service 同步

// 监听用户更新事件
@RabbitSubscribe({ routingKey: 'user.updated' })
async syncUserData(event) { ... }
```

### Step 6: 验证测试

- 健康检查通过
- API 功能正常
- 数据查询正确
- 事件同步工作

### Step 7: 保留旧库作为备份

```sql
-- 重命名旧库（不删除）
ALTER DATABASE cloudphone_core RENAME TO cloudphone_core_backup_20251021;

-- 7天后确认无问题再删除
-- DROP DATABASE cloudphone_core_backup_20251021;
```

---

## ⚠️ 迁移注意事项

### 安全检查清单

- [ ] ✅ 新数据库已创建
- [ ] ✅ 旧数据库保持不动（作为备份）
- [ ] 🔄 表结构迁移
- [ ] 🔄 数据迁移（当前无数据）
- [ ] 🔄 服务配置更新
- [ ] 🔄 功能验证
- [ ] ⏳ 运行观察（7天）
- [ ] ⏳ 删除旧库

### 回滚方案

如果出现问题，立即回滚：

```bash
# 1. 停止所有服务
pkill -f "pnpm run dev"

# 2. 恢复配置指向 cloudphone_core
# 修改所有 app.module.ts

# 3. 重启服务
./start-all-services.sh

# 所有数据完好无损！
```

---

**现在开始迁移？我会确保整个过程安全可控！**

