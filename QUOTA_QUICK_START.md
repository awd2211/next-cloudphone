# 配额管理系统快速使用指南

## 🚀 快速开始

### 1. 访问配额管理页面

启动前端开发服务器后,访问:

```
http://localhost:5173/quotas
```

---

## 📚 主要功能

### 功能概览

```
配额管理系统
├── 📊 统计仪表板
│   ├── 总配额数
│   ├── 正常状态配额
│   ├── 超限配额
│   └── 配额告警 (带徽章)
│
├── 📋 配额列表
│   ├── 用户ID
│   ├── 设备配额 (使用率进度条)
│   ├── CPU配额 (使用率进度条)
│   ├── 内存配额 (使用率进度条)
│   ├── 存储配额 (使用率进度条)
│   ├── 状态标签
│   └── 操作按钮 (编辑/详情)
│
├── 🔔 配额告警面板
│   ├── 告警数量
│   ├── 告警列表 (前3条)
│   └── 自动刷新 (30秒)
│
├── ➕ 创建配额
│   ├── 用户ID
│   ├── 设备限制
│   ├── 资源限制 (CPU/内存/存储)
│   └── 带宽限制
│
├── ✏️ 编辑配额
│   ├── 更新设备限制
│   └── 更新资源限制
│
└── 📈 配额详情
    ├── 基本信息
    ├── 配额限制
    ├── 当前使用
    ├── 使用趋势图 (折线图)
    └── 资源分布图 (饼图)
```

---

## 🎯 使用场景

### 场景1: 创建新用户配额

**步骤**:

1. 点击页面右上角 "创建配额" 按钮
2. 填写表单:
   - **用户ID**: 输入用户的唯一标识
   - **设备限制**: 设置最大设备数和最大并发设备数
   - **资源限制**: 设置CPU核数、内存(GB)、存储(GB)
   - **带宽限制**: 设置最大带宽(Mbps)和月流量(GB)
3. 点击 "确定" 提交

**示例配置**:
```
用户ID: user-001
最大设备数: 10
最大并发设备: 5
总CPU核数: 20
总内存: 32 GB
总存储: 100 GB
最大带宽: 100 Mbps
月流量: 1000 GB
```

---

### 场景2: 监控配额使用情况

**查看配额列表**:

配额列表展示所有用户的配额使用情况:

| 指标 | 说明 | 颜色规则 |
|------|------|----------|
| 设备配额 | 当前设备数 / 最大设备数 | >90%: 红色, >70%: 黄色, <70%: 绿色 |
| CPU配额 | 已用CPU核数 / 总CPU核数 | 同上 |
| 内存配额 | 已用内存 / 总内存 | 同上 |
| 存储配额 | 已用存储 / 总存储 | 同上 |

**状态说明**:
- 🟢 **正常 (active)**: 使用率正常
- 🔴 **超限 (exceeded)**: 使用量超过限制
- 🟠 **暂停 (suspended)**: 配额已暂停
- ⚫ **过期 (expired)**: 配额已过期

---

### 场景3: 处理配额告警

**告警触发条件**:
- 任意资源使用率 > 80% (可配置)

**告警展示**:

页面顶部会显示橙色告警面板:

```
⚠️ 配额告警 (3)

[设备] 用户 user-001: 设备配额使用率过高 (使用率: 85%)
[CPU] 用户 user-002: CPU配额使用率过高 (使用率: 90%)
[内存] 用户 user-003: 内存配额使用率过高 (使用率: 88%)

[查看全部 3 条告警]
```

**处理流程**:

1. 点击告警行,查看详情
2. 点击 "编辑" 按钮
3. 调整配额限制 (增加资源配额)
4. 保存更改

**自动通知**:
- 新告警会自动弹出通知 (右上角)
- 每30秒自动刷新告警列表
- 通知6秒后自动关闭

---

### 场景4: 查看配额详情和趋势

**步骤**:

1. 在配额列表中,找到目标用户
2. 点击 "详情" 按钮
3. 右侧抽屉展开,显示详细信息

**详情内容**:

#### 基本信息
- 用户ID
- 状态 (带颜色标签)
- 创建时间
- 更新时间

#### 配额限制
- 最大设备数
- 最大并发设备
- 总CPU(核)
- 总内存(GB)
- 总存储(GB)

#### 当前使用
- 当前设备数 / 最大设备数
- 并发设备 / 最大并发设备
- 已用CPU(核) / 总CPU(核)
- 已用内存(GB) / 总内存(GB)
- 已用存储(GB) / 总存储(GB)

#### 使用趋势图 (折线图)
显示过去30天的使用趋势:
- 📊 设备数趋势
- 📊 CPU使用趋势
- 📊 内存使用趋势
- 📊 存储使用趋势

#### 资源分布图 (饼图)
显示当前资源使用分布:
- 🍰 设备数占比
- 🍰 CPU核数占比
- 🍰 内存(GB)占比
- 🍰 存储(GB)占比

---

### 场景5: 更新配额限制

**步骤**:

1. 在配额列表中,找到目标用户
2. 点击 "编辑" 按钮
3. 修改配额限制:
   - 设备限制 (最大设备数、最大并发设备)
   - 资源限制 (CPU、内存、存储)
4. 点击 "确定" 保存

**示例**:

用户反馈设备不够用:
```
原配额: 最大设备数 = 10
新配额: 最大设备数 = 20
```

保存后立即生效。

---

## 🔔 告警通知组件

### 全局告警通知

配额告警通知组件可以集成到任何页面布局中,提供全局告警监控。

**集成方式**:

```tsx
import QuotaAlertNotification from '@/components/QuotaAlertNotification';

// 在布局组件中 (如 Header)
<QuotaAlertNotification
  threshold={80}           // 告警阈值: 80%
  refreshInterval={30000}  // 刷新间隔: 30秒
  autoNotify={true}        // 自动弹出通知
  maxDisplayCount={5}      // 最多显示5条告警
/>
```

**功能特性**:

- 🔔 **徽章显示**: 右上角显示告警数量
- 🔄 **自动刷新**: 每30秒自动检查新告警
- 🔊 **自动通知**: 新告警自动弹出通知
- 📋 **告警列表**: 点击铃铛图标显示告警列表
- 🔍 **告警详情**: 每条告警显示用户ID、类型、使用率、消息

---

## 📈 趋势图表组件

### 独立趋势图表

配额使用趋势图表可以单独使用,在任何页面显示用户的配额趋势。

**集成方式**:

```tsx
import QuotaUsageTrend from '@/components/QuotaUsageTrend';

// 在用户详情页中
<QuotaUsageTrend
  userId="user-123"        // 用户ID (必填)
  height={400}             // 图表高度: 400px
  showCard={true}          // 显示卡片容器
  chartType="line"         // 图表类型: line/bar/area
/>
```

**控制选项**:

1. **指标选择**: 多选下拉框,选择要展示的指标
   - ✅ 设备数
   - ✅ CPU(核)
   - ✅ 内存(GB)
   - ✅ 存储(GB)
   - ✅ 带宽(Mbps)
   - ✅ 流量(GB)

2. **日期范围**: 日期范围选择器
   - 默认: 最近30天
   - 可自定义任意范围

3. **图表类型**: (通过props配置)
   - 📈 折线图 (line)
   - 📊 柱状图 (bar)
   - 📊 面积图 (area)

4. **交互功能**:
   - 鼠标悬停显示详情
   - 鼠标滚轮缩放
   - 拖拽条缩放
   - 图例点击切换显示

---

## 🛠️ API使用示例

### 前端API调用

所有API函数位于 `@/services/quota.ts`:

#### 1. 创建配额

```typescript
import { createQuota } from '@/services/quota';

const result = await createQuota({
  userId: 'user-001',
  limits: {
    maxDevices: 10,
    maxConcurrentDevices: 5,
    maxCpuCoresPerDevice: 4,
    maxMemoryMBPerDevice: 4096,
    maxStorageGBPerDevice: 50,
    totalCpuCores: 20,
    totalMemoryGB: 32,
    totalStorageGB: 100,
    maxBandwidthMbps: 100,
    monthlyTrafficGB: 1000,
    maxUsageHoursPerDay: 24,
    maxUsageHoursPerMonth: 720,
  },
});

if (result.success) {
  console.log('创建成功:', result.data);
}
```

#### 2. 获取用户配额

```typescript
import { getUserQuota } from '@/services/quota';

const result = await getUserQuota('user-001');
if (result.success && result.data) {
  console.log('配额信息:', result.data);
  console.log('当前设备数:', result.data.usage.currentDevices);
  console.log('最大设备数:', result.data.limits.maxDevices);
}
```

#### 3. 检查配额是否充足

```typescript
import { checkQuota } from '@/services/quota';

const result = await checkQuota({
  userId: 'user-001',
  quotaType: 'device',
  requestedAmount: 1,
});

if (result.success && result.data?.allowed) {
  console.log('配额充足,可以创建设备');
} else {
  console.log('配额不足:', result.data?.reason);
}
```

#### 4. 扣减配额

```typescript
import { deductQuota } from '@/services/quota';

const result = await deductQuota({
  userId: 'user-001',
  quotaType: 'device',
  amount: 1,
  metadata: {
    deviceId: 'device-123',
    action: 'create',
  },
});

if (result.success) {
  console.log('配额已扣减');
}
```

#### 5. 恢复配额

```typescript
import { restoreQuota } from '@/services/quota';

const result = await restoreQuota({
  userId: 'user-001',
  quotaType: 'device',
  amount: 1,
  metadata: {
    deviceId: 'device-123',
    action: 'delete',
  },
});

if (result.success) {
  console.log('配额已恢复');
}
```

#### 6. 更新配额

```typescript
import { updateQuota } from '@/services/quota';

const result = await updateQuota('quota-id-123', {
  limits: {
    maxDevices: 20, // 增加设备配额
  },
});

if (result.success) {
  console.log('配额已更新');
}
```

#### 7. 上报设备用量

```typescript
import { reportDeviceUsage } from '@/services/quota';

const result = await reportDeviceUsage('user-001', {
  deviceId: 'device-123',
  action: 'create',
  usageData: {
    cpuCores: 2,
    memoryMB: 4096,
    storageGB: 20,
  },
});

if (result.success) {
  console.log('用量已上报');
}
```

#### 8. 获取使用统计

```typescript
import { getUsageStats } from '@/services/quota';

const result = await getUsageStats('user-001');
if (result.success && result.data) {
  console.log('当前使用:', result.data.currentUsage);
  console.log('每日使用:', result.data.dailyUsage);
}
```

#### 9. 批量检查配额

```typescript
import { batchCheckQuota } from '@/services/quota';

const result = await batchCheckQuota([
  { userId: 'user-001', quotaType: 'device', requestedAmount: 1 },
  { userId: 'user-001', quotaType: 'cpu', requestedAmount: 2 },
  { userId: 'user-001', quotaType: 'memory', requestedAmount: 4096 },
]);

if (result.success && result.data) {
  result.data.forEach((check) => {
    console.log(`${check.quotaType}: ${check.allowed ? '✓' : '✗'}`);
  });
}
```

#### 10. 获取配额告警

```typescript
import { getQuotaAlerts } from '@/services/quota';

const result = await getQuotaAlerts(80); // 阈值: 80%
if (result.success && result.data) {
  console.log(`共 ${result.data.length} 条告警`);
  result.data.forEach((alert) => {
    console.log(`${alert.userId} - ${alert.quotaType}: ${alert.usagePercent}%`);
  });
}
```

---

## 🎨 UI组件展示

### 统计卡片

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ 📊 总配额数  │ ✅ 正常状态  │ ❌ 超限配额  │ 🔔 配额告警  │
│     15       │      12      │      3       │      5 🔴    │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### 配额列表

```
┌──────────────────────────────────────────────────────────┐
│ 用户ID          │ 设备配额    │ CPU配额     │ 内存配额   │ 状态    │ 操作  │
├──────────────────────────────────────────────────────────┤
│ user-001        │ 8 / 10      │ 15 / 20     │ 28 / 32    │ 🟢 正常 │ 编辑 详情 │
│                 │ ████████▒▒  │ ███████▒▒▒  │ ███████▒▒▒ │         │           │
├──────────────────────────────────────────────────────────┤
│ user-002        │ 10 / 10     │ 20 / 20     │ 32 / 32    │ 🔴 超限 │ 编辑 详情 │
│                 │ ██████████  │ ██████████  │ ██████████ │         │           │
└──────────────────────────────────────────────────────────┘
```

### 配额详情抽屉

```
┌─────────────────────────────────────────┐
│ 配额详情                           ✕   │
├─────────────────────────────────────────┤
│                                         │
│ ┌─── 基本信息 ───────────────────────┐ │
│ │ 用户ID: user-001                   │ │
│ │ 状态: 🟢 正常                      │ │
│ │ 创建时间: 2025-01-01 10:00:00      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─── 配额限制 ───────────────────────┐ │
│ │ 最大设备数: 10                     │ │
│ │ 总CPU(核): 20                      │ │
│ │ 总内存(GB): 32                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─── 当前使用 ───────────────────────┐ │
│ │ 当前设备数: 8 / 10                 │ │
│ │ 已用CPU(核): 15 / 20               │ │
│ │ 已用内存(GB): 28 / 32              │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─── 使用趋势 ───────────────────────┐ │
│ │        配额使用趋势                │ │
│ │  30 │         ╱─╲                  │ │
│ │  20 │       ╱     ╲      ╱─╲      │ │
│ │  10 │     ╱         ╲  ╱     ╲    │ │
│ │   0 └─────────────────────────────│ │
│ │      1   5   10  15  20  25  30   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─── 资源分布 ───────────────────────┐ │
│ │      当前资源使用分布              │ │
│ │         ╭───────╮                  │ │
│ │         │ 🔵 30%│ 设备数           │ │
│ │         │ 🟢 25%│ CPU核数          │ │
│ │         │ 🟠 25%│ 内存(GB)         │ │
│ │         │ 🔴 20%│ 存储(GB)         │ │
│ │         ╰───────╯                  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## ⚙️ 配置选项

### 告警阈值配置

在 `QuotaList.tsx` 中:

```typescript
// Line 65: 设置告警阈值为80%
const result = await quotaService.getQuotaAlerts(80);
```

可以根据需求调整阈值 (0-100):
- **60%**: 宽松,提前预警
- **80%**: 标准,平衡预警
- **90%**: 严格,临近超限预警

### 刷新间隔配置

在 `QuotaList.tsx` 中:

```typescript
// Line 78: 每30秒刷新一次告警
const alertInterval = setInterval(loadAlerts, 30000);
```

可以根据需求调整间隔:
- **10000**: 10秒 (频繁刷新)
- **30000**: 30秒 (标准)
- **60000**: 60秒 (节省资源)

---

## 🐛 常见问题

### Q1: 配额列表为空?

**原因**: 还没有创建任何配额。

**解决**: 点击 "创建配额" 按钮,为用户创建配额。

---

### Q2: 告警面板不显示?

**原因**: 当前没有配额使用率超过阈值的用户。

**解决**: 这是正常现象,表示所有配额使用率正常。

---

### Q3: 趋势图显示 "暂无数据"?

**原因**:
1. 用户没有历史使用数据
2. 日期范围内没有数据

**解决**:
1. 等待系统收集使用数据
2. 调整日期范围

---

### Q4: 创建配额失败?

**原因**:
1. 用户ID已存在配额
2. 表单验证失败
3. 网络错误

**解决**:
1. 检查用户ID是否已有配额
2. 检查所有必填字段
3. 检查网络连接和后端服务状态

---

### Q5: 编辑配额不生效?

**原因**:
1. 表单验证失败
2. 后端更新失败
3. 缓存未刷新

**解决**:
1. 检查所有字段都已填写
2. 查看浏览器控制台错误信息
3. 手动刷新页面

---

## 📞 技术支持

如果遇到问题,请检查:

1. **浏览器控制台**: 查看JavaScript错误
2. **网络请求**: 查看API调用是否成功
3. **后端日志**: 查看后端服务日志
4. **TypeScript编译**: 运行 `pnpm exec tsc --noEmit`

---

## 🎉 总结

配额管理系统提供了完整的配额管理能力:

✅ **易用**: 直观的UI,简单的操作流程
✅ **实时**: 自动刷新告警,实时监控使用情况
✅ **可视**: 丰富的图表,清晰展示趋势和分布
✅ **灵活**: 可配置的阈值和刷新间隔
✅ **可靠**: 完整的类型安全和错误处理

开始使用配额管理系统,轻松管理用户资源配额! 🚀
