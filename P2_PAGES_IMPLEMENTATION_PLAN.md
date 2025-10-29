# P2 优先级页面实施计划

**创建时间**: 2025-10-29
**优先级**: P2 (中等优先级)
**预计工作量**: 2-3 周

---

## 📋 P2 页面清单

根据云手机平台的功能需求，以下是 P2 优先级需要实施的页面：

### 1. 生命周期自动化 UI (Admin)
**路由**: `/devices/lifecycle`
**预计工作量**: 3-4 天

**功能需求**:
- 自动清理规则配置
  - 空闲设备清理策略
  - 错误设备清理策略
  - 停止设备清理策略
- 自动扩缩容配置
  - 扩容阈值设置
  - 缩容阈值设置
  - 冷却时间配置
- 自动备份规则
  - 备份频率设置
  - 备份保留策略
  - 备份范围选择
- 到期提醒配置
  - 提前天数设置
  - 通知渠道配置
- 规则执行历史

**后端 API**:
```
GET /devices/lifecycle/rules
POST /devices/lifecycle/rules
PUT /devices/lifecycle/rules/:id
DELETE /devices/lifecycle/rules/:id
GET /devices/lifecycle/history
POST /devices/lifecycle/test
```

**技术要点**:
- JSON Schema 编辑器（规则配置）
- Cron 表达式编辑器
- 规则模拟测试
- 执行日志查看

---

### 2. GPU 资源管理 (Admin)
**路由**: `/resources/gpu`
**预计工作量**: 2-3 天

**功能需求**:
- GPU 设备列表
  - 型号、驱动版本
  - 使用率监控
  - 温度监控
  - 显存使用情况
- GPU 分配管理
  - 按设备分配
  - 按用户分配
  - 共享模式配置
- GPU 性能监控
  - 实时使用率图表
  - 历史数据趋势
  - 性能瓶颈分析
- GPU 驱动管理
  - 驱动版本查看
  - 驱动更新

**后端 API**:
```
GET /resources/gpu
GET /resources/gpu/:id
GET /resources/gpu/:id/usage
POST /resources/gpu/:id/allocate
DELETE /resources/gpu/:id/deallocate
GET /resources/gpu/stats
```

**技术要点**:
- ECharts 实时图表
- WebSocket 实时数据推送
- GPU 拓扑可视化
- 性能指标仪表盘

---

### 3. 通知模板编辑器 (Admin)
**路由**: `/notifications/templates`
**预计工作量**: 3 天

**功能需求**:
- 模板列表管理
  - 邮件模板
  - 短信模板
  - WebSocket 通知模板
- 可视化模板编辑器
  - Markdown 编辑器
  - HTML 富文本编辑器
  - 变量插入（{{userName}}, {{deviceName}}）
  - 实时预览
- 模板测试发送
  - 测试邮件发送
  - 测试短信发送
- 模板版本管理
  - 版本历史
  - 回滚功能
- 多语言支持

**后端 API**:
```
GET /notifications/templates
GET /notifications/templates/:id
POST /notifications/templates
PUT /notifications/templates/:id
DELETE /notifications/templates/:id
POST /notifications/templates/:id/test
GET /notifications/templates/:id/versions
POST /notifications/templates/:id/revert
```

**技术要点**:
- Monaco Editor (VS Code 编辑器)
- Handlebars 模板引擎
- 实时预览窗口
- 模板变量智能提示

---

### 4. 缓存管理页面 (Admin)
**路由**: `/system/cache`
**预计工作量**: 2 天

**功能需求**:
- Redis 缓存监控
  - 连接数、命中率
  - 内存使用情况
  - Key 数量统计
- 缓存 Key 浏览
  - 按前缀筛选
  - Key 详情查看
  - TTL 查看
- 缓存操作
  - 删除单个 Key
  - 批量删除
  - 清空缓存
  - 刷新缓存
- 缓存性能分析
  - 慢查询分析
  - 热点 Key 识别

**后端 API**:
```
GET /system/cache/stats
GET /system/cache/keys
GET /system/cache/keys/:key
DELETE /system/cache/keys/:key
POST /system/cache/clear
GET /system/cache/slow-queries
GET /system/cache/hot-keys
```

**技术要点**:
- 实时统计图表
- Key 搜索和筛选
- JSON Viewer（查看复杂值）
- 批量操作确认

---

### 5. 消息队列管理 (Admin)
**路由**: `/system/queue`
**预计工作量**: 2-3 天

**功能需求**:
- RabbitMQ 监控
  - 连接数、通道数
  - 消息速率
  - Exchange 列表
  - Queue 列表
- Queue 详情
  - 消息数量
  - 消费者数量
  - 消息速率
  - DLX 配置
- 消息管理
  - 查看消息内容
  - 重新投递
  - 删除消息
  - 清空队列
- 死信队列处理
  - 死信消息列表
  - 原因分析
  - 重试投递

**后端 API**:
```
GET /system/queue/stats
GET /system/queue/exchanges
GET /system/queue/queues
GET /system/queue/queues/:name
GET /system/queue/queues/:name/messages
POST /system/queue/queues/:name/purge
POST /system/queue/messages/:id/requeue
DELETE /system/queue/messages/:id
GET /system/queue/dlx
```

**技术要点**:
- 实时监控图表
- 消息内容格式化显示
- 消息投递模拟
- Exchange 拓扑图

---

### 6. Event Sourcing 查看器 (Admin)
**路由**: `/system/events`
**预计工作量**: 2 天

**功能需求**:
- 事件流查看
  - 按实体 ID 查询
  - 按事件类型筛选
  - 按时间范围筛选
- 事件详情
  - 事件类型
  - 事件数据 (JSON)
  - 时间戳
  - 聚合 ID
- 事件重放
  - 选择重放范围
  - 重放到指定时间点
  - 重放预览
- 快照管理
  - 快照列表
  - 创建快照
  - 删除快照

**后端 API**:
```
GET /events
GET /events/:aggregateId
POST /events/replay
GET /events/snapshots
POST /events/snapshots
DELETE /events/snapshots/:id
```

**技术要点**:
- 事件时间轴展示
- JSON 格式化查看
- 事件 Diff 对比
- 重放安全确认

---

### 7. 设备分组管理 (Admin)
**路由**: `/devices/groups`
**预计工作量**: 2 天

**功能需求**:
- 分组列表
  - 创建、编辑、删除分组
  - 分组描述
  - 设备数量统计
- 设备批量分配
  - 拖拽分配
  - 批量选择分配
  - 按条件自动分配
- 分组操作
  - 批量启动/停止
  - 批量安装应用
  - 批量配置更新
- 分组规则
  - 基于标签
  - 基于配置
  - 基于用户

**后端 API**:
```
GET /devices/groups
POST /devices/groups
PUT /devices/groups/:id
DELETE /devices/groups/:id
POST /devices/groups/:id/add-devices
POST /devices/groups/:id/remove-devices
POST /devices/groups/:id/batch-operation
```

**技术要点**:
- 拖拽排序
- 树形结构展示
- 批量操作进度条
- 规则表达式编辑器

---

### 8. 网络策略配置 (Admin)
**路由**: `/devices/network-policies`
**预计工作量**: 2-3 天

**功能需求**:
- 策略列表
  - 入站规则
  - 出站规则
  - 端口映射规则
- 规则配置
  - IP 白名单/黑名单
  - 端口访问控制
  - 带宽限制
  - 流量统计
- 防火墙规则
  - 协议筛选
  - 地域限制
  - 时间段控制
- 策略测试
  - 连通性测试
  - 规则模拟

**后端 API**:
```
GET /devices/network-policies
POST /devices/network-policies
PUT /devices/network-policies/:id
DELETE /devices/network-policies/:id
POST /devices/network-policies/:id/test
GET /devices/:id/network-stats
```

**技术要点**:
- IP 输入组件
- CIDR 计算器
- 流量图表
- 规则优先级拖拽

---

## 📊 工作量估算

| 页面 | 复杂度 | 预计天数 | 优先级 |
|------|--------|----------|--------|
| 1. 生命周期自动化 UI | 高 | 3-4 | P2.1 |
| 2. GPU 资源管理 | 中 | 2-3 | P2.2 |
| 3. 通知模板编辑器 | 高 | 3 | P2.3 |
| 4. 缓存管理 | 低 | 2 | P2.4 |
| 5. 消息队列管理 | 中 | 2-3 | P2.5 |
| 6. Event Sourcing 查看器 | 中 | 2 | P2.6 |
| 7. 设备分组管理 | 中 | 2 | P2.7 |
| 8. 网络策略配置 | 中 | 2-3 | P2.8 |
| **总计** | - | **18-23 天** | - |

---

## 🎯 实施策略

### 第一批 (Week 1-2)
优先实施业务价值最高的页面:
1. **生命周期自动化 UI** - 提升运维效率
2. **GPU 资源管理** - 性能监控关键
3. **通知模板编辑器** - 提升通知灵活性

### 第二批 (Week 3)
实施系统管理相关页面:
4. **缓存管理**
5. **消息队列管理**
6. **Event Sourcing 查看器**

### 第三批 (Week 4)
实施设备管理增强功能:
7. **设备分组管理**
8. **网络策略配置**

---

## 🛠️ 技术准备

### 需要引入的新依赖

```bash
# 代码编辑器
pnpm add @monaco-editor/react

# 图表库（如果还没有）
pnpm add echarts echarts-for-react

# JSON 编辑器
pnpm add @uiw/react-json-view

# Markdown 编辑器
pnpm add @uiw/react-markdown-editor

# Cron 表达式
pnpm add react-cron-generator cron-parser

# 拖拽功能
pnpm add @dnd-kit/core @dnd-kit/sortable

# IP 输入组件
pnpm add react-ip-input
```

### 代码结构规范

```
frontend/admin/src/
├── pages/
│   ├── DeviceLifecycle/
│   │   ├── List.tsx
│   │   ├── RuleEditor.tsx
│   │   └── History.tsx
│   ├── GPU/
│   │   ├── Dashboard.tsx
│   │   └── Allocation.tsx
│   ├── NotificationTemplates/
│   │   ├── List.tsx
│   │   ├── Editor.tsx
│   │   └── Preview.tsx
│   ├── System/
│   │   ├── Cache.tsx
│   │   ├── Queue.tsx
│   │   └── Events.tsx
│   └── Network/
│       ├── Groups.tsx
│       └── Policies.tsx
├── services/
│   ├── lifecycle.ts
│   ├── gpu.ts
│   ├── template.ts
│   ├── system.ts
│   └── network.ts
└── components/
    ├── MonacoEditor.tsx
    ├── CronEditor.tsx
    ├── IPInput.tsx
    └── NetworkChart.tsx
```

---

## 📝 开发流程

### 每个页面的标准流程

1. **需求确认** (0.5天)
   - 与产品确认功能细节
   - 设计 UI 原型
   - 确定 API 接口

2. **类型定义** (0.5天)
   - 添加 TypeScript 接口
   - 定义 API 参数和响应类型

3. **服务层实现** (0.5天)
   - 编写 API 调用函数
   - 添加错误处理

4. **页面组件开发** (1-2天)
   - 实现 UI 布局
   - 添加交互逻辑
   - 表单验证

5. **路由配置** (0.25天)
   - 添加懒加载路由
   - 更新菜单配置

6. **测试和优化** (0.5天)
   - 功能测试
   - 性能优化
   - 代码审查

---

## 🔄 与后端对接

### API 开发优先级

**Phase 1 - 立即需要**:
- 生命周期规则 API
- GPU 监控 API
- 通知模板 API

**Phase 2 - 可并行**:
- 缓存管理 API
- 队列监控 API
- Event Sourcing API

**Phase 3 - 后期补充**:
- 设备分组 API
- 网络策略 API

### Mock 数据策略

在后端 API 未就绪时，使用 Mock 数据:

```typescript
// src/services/mock.ts
export const mockLifecycleRules = [
  {
    id: '1',
    name: '空闲设备自动清理',
    type: 'cleanup',
    enabled: true,
    config: {
      idleHours: 24,
      action: 'stop',
    },
  },
  // ...
];

// 在服务层使用
export const getLifecycleRules = () => {
  if (process.env.NODE_ENV === 'development') {
    return Promise.resolve(mockLifecycleRules);
  }
  return request.get('/devices/lifecycle/rules');
};
```

---

## ✅ 验收标准

每个页面需满足:

1. **功能完整性**
   - [ ] 所有需求功能已实现
   - [ ] CRUD 操作正常
   - [ ] 表单验证有效

2. **用户体验**
   - [ ] Loading 状态显示
   - [ ] 错误提示友好
   - [ ] 操作反馈及时

3. **代码质量**
   - [ ] TypeScript 类型完整
   - [ ] 代码注释清晰
   - [ ] 无 ESLint 警告

4. **性能指标**
   - [ ] 首屏加载 < 2s
   - [ ] 交互响应 < 100ms
   - [ ] 内存使用合理

5. **兼容性**
   - [ ] Chrome 最新版测试通过
   - [ ] Firefox 最新版测试通过
   - [ ] Safari 最新版测试通过

---

## 🚀 启动指南

### 开始实施 P2.1 (生命周期自动化 UI)

```bash
# 1. 创建分支
git checkout -b feature/lifecycle-automation-ui

# 2. 安装依赖
cd frontend/admin
pnpm add react-cron-generator cron-parser @uiw/react-json-view

# 3. 创建文件结构
mkdir -p src/pages/DeviceLifecycle
mkdir -p src/services/lifecycle

# 4. 创建类型定义
# 编辑 src/types/index.ts

# 5. 开始开发
pnpm dev
```

---

## 📞 支持和协作

**技术讨论**:
- 前端架构问题 → 架构组
- API 接口设计 → 后端团队
- UI/UX 设计 → 设计团队

**文档参考**:
- `CLAUDE.md` - 项目总体指南
- `FRONTEND_PAGES_COMPLETION_FINAL.md` - P0/P1 实施参考
- `QUICK_START_NEW_PAGES.md` - 快速入门指南

---

**创建时间**: 2025-10-29
**下次更新**: 实施完成后
**状态**: 📋 计划中
