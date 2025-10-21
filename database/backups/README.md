# 数据库备份目录

此目录存储数据库备份文件。

## 备份文件

### cloudphone_core_backup_20251021_194501.sql
- **备份时间**: 2025-10-21 19:45:01
- **原数据库**: cloudphone_core
- **大小**: 77KB
- **表数量**: 27 张表
- **状态**: 旧共享数据库，已迁移到各微服务独立数据库
- **包含数据**: 所有微服务的历史数据

## 说明

在微服务数据库隔离完成后，旧的共享数据库 `cloudphone_core` 已被删除。
此备份文件用于数据恢复和历史记录查询。

## 恢复方法

如需恢复此备份：

```bash
# 创建数据库
docker exec cloudphone-postgres psql -U postgres -c "CREATE DATABASE cloudphone_core;"

# 恢复数据
cat cloudphone_core_backup_20251021_194501.sql | docker exec -i cloudphone-postgres psql -U postgres -d cloudphone_core
```

**注意**: 备份文件不纳入 Git 版本控制（已加入 .gitignore）

