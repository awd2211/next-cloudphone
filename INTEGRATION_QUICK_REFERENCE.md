# 前端-后端集成快速参考

## 📊 完成状态

✅ **Phase 1: 缓存管理** - 6/6 端点 (100%)
✅ **Phase 2: 队列管理** - 12/12 端点 (100%)
✅ **Phase 3: 事件溯源** - 6/6 端点 (100%)

**总计**: 24/24 API 端点完全集成

---

## 🚀 快速访问

### 缓存管理
- **URL**: http://localhost:5173/system/cache
- **功能**: 查看统计、删除键、模式删除、清空缓存
- **自动刷新**: 10 秒

### 队列管理
- **URL**: http://localhost:5173/system/queue
- **功能**: 队列监控、任务管理、暂停/恢复、测试任务
- **自动刷新**: 10 秒

### 事件溯源
- **URL**: http://localhost:5173/system/event-sourcing
- **功能**: 事件历史、时间旅行、版本重放、统计分析
- **自动刷新**: 30 秒

---

## 📁 创建的文件

### 服务层 (API)
```
frontend/admin/src/services/
├── cache.ts      (6 个函数)
├── queue.ts      (12 个函数)
└── events.ts     (6 个函数)
```

### 类型定义
```
frontend/admin/src/types/index.ts
├── CacheStats, CacheKey
├── QueueStatus, QueueJob, QueueJobDetail, QueueSummary
└── UserEvent, EventHistory, EventStats
```

### UI 组件
```
frontend/admin/src/pages/System/
├── CacheManagement.tsx        (381 行)
├── QueueManagement.tsx        (655 行)
└── EventSourcingViewer.tsx    (641 行)
```

---

## 🔧 启动和测试

### 启动服务
```bash
# 1. 后端服务
pm2 start user-service
pm2 start api-gateway

# 2. 前端
cd frontend/admin
pnpm dev

# 3. 访问
open http://localhost:5173
```

### 验证 API
```bash
# 缓存
curl http://localhost:30001/cache/stats

# 队列
curl http://localhost:30001/queues/status

# 事件
curl http://localhost:30001/events/stats
```

---

## 📖 文档清单

1. **[FRONTEND_BACKEND_INTEGRATION_COMPLETION.md](FRONTEND_BACKEND_INTEGRATION_COMPLETION.md)** - 完整总结报告
2. **[PHASE1_CACHE_MANAGEMENT_COMPLETION.md](PHASE1_CACHE_MANAGEMENT_COMPLETION.md)** - 缓存管理详细文档
3. **[CACHE_MANAGEMENT_QUICKSTART.md](CACHE_MANAGEMENT_QUICKSTART.md)** - 缓存管理快速入门
4. **[INTEGRATION_QUICK_REFERENCE.md](INTEGRATION_QUICK_REFERENCE.md)** - 本文档

---

## 💡 核心功能

### 缓存管理
- ✅ 8 个统计指标
- ✅ 删除指定键
- ✅ 模式删除 (`user:*`)
- ✅ 检查键存在
- ✅ 清空所有缓存
- ✅ 重置统计

### 队列管理
- ✅ 队列状态监控 (7 列信息)
- ✅ 任务列表查看 (5 种状态)
- ✅ 暂停/恢复队列
- ✅ 重试失败任务
- ✅ 清空队列
- ✅ 清理历史任务
- ✅ 测试任务创建

### 事件溯源
- ✅ 最近事件查看 (6 种类型)
- ✅ 用户事件历史查询
- ✅ 重放事件 (重建状态)
- ✅ 重放到版本
- ✅ 时间旅行
- ✅ 事件统计

---

## 🎯 快速测试

### 缓存 (1 分钟)
1. 打开 http://localhost:5173/system/cache
2. 查看 8 个统计卡片
3. 点击"删除指定键" → 输入 `user:123`
4. 点击"清空所有缓存" → 确认

### 队列 (2 分钟)
1. 打开 http://localhost:5173/system/queue
2. 点击"测试任务" → 选择"发送邮件"
3. 填写表单 → 创建任务
4. 切换到"任务列表" → 查看刚创建的任务
5. 点击某个队列的"暂停" → 观察状态变化

### 事件 (2 分钟)
1. 打开 http://localhost:5173/system/event-sourcing
2. 查看"最近事件"列表
3. 切换到"用户事件历史" → 输入用户 ID
4. 点击"查询历史" → 查看事件列表
5. 点击"重放事件" → 查看重放结果

---

## 📊 代码统计

| 指标 | 数值 |
|------|------|
| 服务文件 | 3 |
| TypeScript 接口 | 9 |
| UI 组件行数 | 1,677 |
| API 端点 | 24 |
| 覆盖率 | 100% ✅ |

---

## 🐛 故障排查

### 页面无法加载
```bash
# 检查后端
pm2 logs user-service

# 检查 API 网关
curl http://localhost:30000/health
```

### API 请求失败
```bash
# 检查端点
curl http://localhost:30001/cache/stats

# 查看日志
pm2 logs user-service --lines 50
```

### 前端编译错误
```bash
cd frontend/admin
pnpm exec tsc --noEmit
```

---

## 📞 需要帮助？

- **完整文档**: 查看 [FRONTEND_BACKEND_INTEGRATION_COMPLETION.md](FRONTEND_BACKEND_INTEGRATION_COMPLETION.md)
- **快速入门**: 查看 [CACHE_MANAGEMENT_QUICKSTART.md](CACHE_MANAGEMENT_QUICKSTART.md)
- **后端 API**: `backend/user-service/src/*/README.md`

---

**版本**: 1.0
**更新时间**: 2025-10-30
**状态**: 生产就绪 ✅
