# 数据范围配置验证清单

## ✅ 数据库验证

### 1. 总体统计
```sql
-- 执行以下查询验证配置完整性
docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d cloudphone_user -c "
SELECT
  '总配置数' as metric,
  COUNT(*) as value
FROM data_scopes
UNION ALL
SELECT
  '启用配置数',
  COUNT(*)
FROM data_scopes WHERE \"isActive\" = true
UNION ALL
SELECT
  '已配置角色数',
  COUNT(DISTINCT \"roleId\")
FROM data_scopes
UNION ALL
SELECT
  '涵盖资源类型数',
  COUNT(DISTINCT \"resourceType\")
FROM data_scopes;"
```

**期望结果**:
- ✅ 总配置数: 119
- ✅ 启用配置数: 119
- ✅ 已配置角色数: 17
- ✅ 涵盖资源类型数: 7

### 2. 范围类型分布
```sql
docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d cloudphone_user -c "
SELECT
  \"scopeType\" as 范围类型,
  COUNT(*) as 配置数量,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM data_scopes), 2) as 百分比
FROM data_scopes
GROUP BY \"scopeType\"
ORDER BY COUNT(*) DESC;"
```

**期望结果**:
- ✅ tenant: 50 条 (42.02%)
- ✅ self: 35 条 (29.41%)
- ✅ all: 27 条 (22.69%)
- ✅ department: 7 条 (5.88%)

### 3. 每个角色的配置
```sql
docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d cloudphone_user -c "
SELECT r.name, COUNT(ds.id) as config_count
FROM roles r
LEFT JOIN data_scopes ds ON r.id = ds.\"roleId\"
GROUP BY r.id, r.name
ORDER BY r.name;"
```

**期望结果**: 每个角色都有 7 条配置

## ✅ 前端验证

### 1. 基础功能
- [ ] 访问 `/permission/data-scope` 页面
- [ ] 确认可以看到 119 条配置记录
- [ ] 确认页面显示 "共 119 条配置"

### 2. 筛选功能
- [ ] 选择角色筛选（如选择 "super_admin"）
  - 应显示 7 条配置
- [ ] 选择资源类型筛选（如选择 "device"）
  - 应显示 17 条配置（每个角色一条）
- [ ] 同时选择角色和资源类型
  - 应显示 1 条精确匹配的配置
- [ ] 点击清除按钮恢复全部数据

### 3. 搜索功能
- [ ] 在角色下拉框中输入 "admin"
  - 应看到相关角色（super_admin, admin, tenant_admin, department_admin）
- [ ] 在资源类型下拉框中输入 "设备"
  - 应看到 "云手机设备" 选项

### 4. 统计概览功能
- [ ] 点击 "更多操作" → "统计概览"
- [ ] 验证总体统计卡片:
  - 配置总数: 119
  - 启用配置: 119
  - 禁用配置: 0
- [ ] 验证按角色统计表格:
  - 显示所有 17 个角色
  - 每个角色都有 7 条配置
- [ ] 验证按资源类型统计表格:
  - 显示所有 7 种资源类型
  - 每种资源类型有 17 条配置
- [ ] 验证按范围类型统计:
  - ALL、TENANT、DEPARTMENT、SELF 的数量

### 5. 导出功能
- [ ] 点击 "更多操作" → "导出配置"
- [ ] 验证文件下载:
  - 文件名格式: `数据范围配置_YYYY-MM-DD.csv`
  - 文件可用 Excel 打开
  - 中文正常显示
- [ ] 验证导出内容:
  - 包含所有列: 角色、资源类型、范围类型、优先级、状态、描述、创建时间
  - 数据行数: 119 + 1（标题行）

### 6. CRUD 操作
- [ ] 创建配置:
  - 点击 "创建配置" 按钮
  - 填写表单（选择角色、资源类型、范围类型等）
  - 提交后列表刷新并显示新配置
- [ ] 查看详情:
  - 点击列表中的 "查看" 按钮
  - 模态框显示配置详情
- [ ] 编辑配置:
  - 点击列表中的 "编辑" 按钮
  - 修改配置（如修改优先级）
  - 提交后列表刷新
- [ ] 切换状态:
  - 点击状态开关
  - 配置状态在 "启用" 和 "禁用" 之间切换
- [ ] 删除配置:
  - 点击列表中的 "删除" 按钮
  - 确认删除
  - 列表刷新，配置已删除

### 7. 分页功能
- [ ] 默认每页显示 20 条
- [ ] 切换每页条数（10、50、100、200）
- [ ] 翻页功能正常
- [ ] 快速跳转页码功能正常
- [ ] 分页总数正确显示

### 8. 表格功能
- [ ] 虚拟滚动正常（大数据量下流畅）
- [ ] 列排序功能（点击列标题排序）
- [ ] 表格自适应屏幕宽度
- [ ] 横向滚动条正常（窄屏时）

## ✅ API 验证

### 1. 获取配置列表
```bash
# 获取所有配置
curl -X GET "http://localhost:30000/data-scopes?page=1&pageSize=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 期望: 返回 119 条配置，分页信息正确
```

### 2. 按角色筛选
```bash
# 获取 super_admin 的配置
curl -X GET "http://localhost:30000/data-scopes?roleId=00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 期望: 返回 7 条配置
```

### 3. 按资源类型筛选
```bash
# 获取 device 资源的配置
curl -X GET "http://localhost:30000/data-scopes?resourceType=device" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 期望: 返回 17 条配置（每个角色一条）
```

### 4. 获取范围类型元数据
```bash
curl -X GET "http://localhost:30000/data-scopes/meta/scope-types" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 期望: 返回 6 种范围类型及其标签
```

## ✅ 性能验证

### 1. 页面加载
- [ ] 首次加载时间 < 2 秒
- [ ] 筛选响应时间 < 500ms
- [ ] 分页切换响应时间 < 300ms

### 2. 导出性能
- [ ] 导出 119 条数据 < 1 秒

### 3. 统计计算
- [ ] 打开统计概览 < 500ms

## 🔍 常见问题排查

### 问题 1: 页面显示配置数量不正确
**检查**:
```sql
-- 确认数据库中的配置数量
SELECT COUNT(*) FROM data_scopes;
```
**解决**: 如果数量不是 119，重新执行初始化脚本

### 问题 2: 某些角色没有配置
**检查**:
```sql
-- 查看哪些角色缺少配置
SELECT r.name
FROM roles r
LEFT JOIN data_scopes ds ON r.id = ds."roleId"
WHERE ds.id IS NULL
GROUP BY r.id, r.name;
```
**解决**: 为缺失的角色手动创建配置或重新执行初始化脚本

### 问题 3: 导出文件中文乱码
**检查**: 文件是否使用 UTF-8 with BOM 编码
**解决**: 确保导出代码中包含 `\uFEFF` BOM 标记

### 问题 4: 统计数据不准确
**检查**: 前端是否正确传递了 dataScopes 数组
**解决**: 确认 useDataScopeConfig hook 正确设置了 dataScopes 状态

## 📝 验证报告模板

### 验证日期: ___________
### 验证人员: ___________

| 验证项 | 状态 | 备注 |
|--------|------|------|
| 数据库总配置数 | ☐ 通过 ☐ 失败 | |
| 所有角色已配置 | ☐ 通过 ☐ 失败 | |
| 前端页面加载 | ☐ 通过 ☐ 失败 | |
| 筛选功能 | ☐ 通过 ☐ 失败 | |
| 搜索功能 | ☐ 通过 ☐ 失败 | |
| 统计概览 | ☐ 通过 ☐ 失败 | |
| 导出功能 | ☐ 通过 ☐ 失败 | |
| CRUD 操作 | ☐ 通过 ☐ 失败 | |
| 分页功能 | ☐ 通过 ☐ 失败 | |
| API 响应 | ☐ 通过 ☐ 失败 | |
| 性能指标 | ☐ 通过 ☐ 失败 | |

### 整体评分: _____ / 10

### 遗留问题:
1.
2.
3.

---

**完成签名**: ___________
**日期**: ___________
