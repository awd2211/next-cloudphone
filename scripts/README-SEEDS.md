# 数据库种子数据使用指南

本目录包含用于向数据库添加测试数据的脚本。

## 📦 包含的内容

### 种子数据脚本
- `seed-data.sql` - SQL脚本，可直接通过psql执行
- `seed-database.ts` - TypeScript脚本，通过TypeORM执行
- `seed-database.sh` - Shell脚本包装器

### 各服务的种子数据模块
- `../backend/user-service/src/seeds/user.seed.ts` - 用户、角色、权限、配额
- `../backend/device-service/src/seeds/device.seed.ts` - 设备、模板、节点
- `../backend/billing-service/src/seeds/billing.seed.ts` - 套餐、订单、余额
- `../backend/app-service/src/seeds/app.seed.ts` - 应用数据

## 🚀 使用方法

### 方法1: 使用SQL脚本（推荐 - 最快速）

```bash
# 在项目根目录执行
cd /home/eric/next-cloudphone

# 直接执行SQL脚本
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone < scripts/seed-data.sql

# 或者如果PostgreSQL在本地运行
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d cloudphone < scripts/seed-data.sql
```

### 方法2: 使用Shell脚本

```bash
# 在项目根目录执行
cd /home/eric/next-cloudphone

# 运行shell脚本
./scripts/seed-database.sh
```

### 方法3: 使用TypeScript脚本

```bash
# 在项目根目录执行
cd /home/eric/next-cloudphone

# 设置环境变量（可选）
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=postgres
export DB_NAME=cloudphone

# 执行TypeScript脚本
npx ts-node scripts/seed-database.ts
```

## 📝 创建的测试数据

### 1. 用户账号

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | 管理员 | 拥有所有权限 |
| testuser1 | user123 | 普通用户 | 测试用户1 |
| testuser2 | user123 | 普通用户 | 测试用户2 |
| testuser3 | user123 | 普通用户 | 测试用户3 |
| support1 | user123 | 客服 | 客服人员 |

### 2. 权限系统

- ✅ 24个权限点（users, devices, apps, billing, roles, permissions）
- ✅ 3个角色（admin, user, support）
- ✅ 角色权限关联

### 3. 用户配额

- 每个测试用户：10台设备配额
- 重置周期：每月
- 有效期：1年

### 4. 套餐计划

| 套餐名称 | 价格 | 设备数 | 存储 | 流量 |
|---------|------|--------|------|------|
| 免费体验版 | ¥0 | 1台 | 10GB | 5GB |
| 基础版 | ¥99/月 | 5台 | 50GB | 100GB |
| 专业版 | ¥299/月 | 20台 | 200GB | 500GB |
| 企业版 | ¥999/月 | 100台 | 1000GB | 2000GB |

### 5. 计费规则

- 设备按小时计费：¥0.5/小时
- 存储按GB计费：¥0.01/GB
- 流量按GB计费：¥0.8/GB

### 6. 用户余额

- testuser1: ¥1000
- testuser2: ¥1500
- testuser3: ¥2000

### 7. 设备节点

- node-beijing-01: 北京节点（16核/32GB内存/2*Tesla T4）
- node-shanghai-01: 上海节点（32核/64GB内存/4*Tesla T4）

### 8. 设备模板

- 标准手机模板：2核/4GB/32GB（1080x2340）
- 游戏专用模板：4核/8GB/64GB（1440x3040，GPU加速）
- 测试专用模板：1核/2GB/16GB（720x1280）

### 9. 测试设备

每个测试用户各有2台设备：
- 1台手机（phone）
- 1台平板（tablet）

总计：6台测试设备

### 10. 应用数据

- Chrome浏览器
- 微信
- 抖音
- 淘宝

## ⚠️ 注意事项

### 数据冲突处理

脚本使用 `ON CONFLICT DO NOTHING` 策略，因此：
- ✅ 可以重复执行，不会报错
- ✅ 已存在的数据不会被覆盖
- ⚠️ 如果要重新生成数据，需要先清理数据库

### 清理现有数据

如果需要清理并重新生成种子数据：

```bash
# 方法1: 删除并重建数据库
docker compose -f docker-compose.dev.yml exec postgres \
  psql -U postgres -c "DROP DATABASE cloudphone;"

docker compose -f docker-compose.dev.yml exec postgres \
  psql -U postgres -c "CREATE DATABASE cloudphone;"

# 方法2: 清空所有表（保留结构）
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone <<EOF
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE roles CASCADE;
TRUNCATE TABLE permissions CASCADE;
TRUNCATE TABLE devices CASCADE;
TRUNCATE TABLE device_templates CASCADE;
TRUNCATE TABLE nodes CASCADE;
TRUNCATE TABLE plans CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE user_balances CASCADE;
TRUNCATE TABLE billing_rules CASCADE;
TRUNCATE TABLE applications CASCADE;
EOF
```

## 🔍 验证数据

执行种子脚本后，可以验证数据是否正确导入：

```bash
# 检查用户数量
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone -c "SELECT COUNT(*) FROM users;"

# 检查设备数量
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone -c "SELECT COUNT(*) FROM devices;"

# 检查套餐数量
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone -c "SELECT COUNT(*) FROM plans;"

# 查看所有测试用户
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone -c "SELECT username, email, status FROM users;"
```

## 🐛 故障排查

### 问题1: 无法连接到数据库

```bash
# 检查数据库是否运行
docker compose -f docker-compose.dev.yml ps postgres

# 查看数据库日志
docker compose -f docker-compose.dev.yml logs postgres
```

### 问题2: TypeScript脚本报错

```bash
# 确保已安装依赖
pnpm install

# 检查ts-node是否可用
npx ts-node --version
```

### 问题3: 权限错误

```bash
# 确保脚本有执行权限
chmod +x scripts/seed-database.sh
```

## 📚 相关文档

- [环境变量配置](../docs/ENVIRONMENT_VARIABLES.md)
- [Docker部署指南](../docs/DOCKER_DEPLOYMENT.md)
- [开发指南](../DEV_GUIDE.md)

## 💡 提示

1. **开发环境**: 建议使用SQL脚本方法，速度最快
2. **生产环境**: 不要使用这些测试数据！
3. **自定义数据**: 可以修改SQL脚本或TypeScript脚本来自定义数据
4. **密码安全**: 默认密码仅用于测试，生产环境请使用强密码

## 🎉 完成

执行种子脚本后，你可以：

1. 使用测试账号登录系统
2. 查看预置的设备和应用
3. 测试订单和支付功能
4. 验证各项功能是否正常

祝你使用愉快！ 🚀
