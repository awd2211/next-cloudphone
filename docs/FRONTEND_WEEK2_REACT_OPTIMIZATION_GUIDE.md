# Week 2: React 性能优化指南

**日期**: 2025-11-01
**目标**: 减少不必要的重渲染，提升列表性能

---

## 🎯 优化目标

### 预期成果
- ✅ 组件重渲染次数减少 **50%**
- ✅ 长列表滚动性能提升 **80%**
- ✅ 关键交互响应时间 < **100ms**

---

## 📋 优化清单

### 1. React.memo 优化（高优先级）

#### 需要优化的组件

**表格 Actions 列**:
```typescript
// ❌ BEFORE: 每次父组件渲染都会创建新的函数组件
{
  title: '操作',
  render: (_, record: Device) => (
    <Space>
      <Button onClick={() => handleStart(record.id)}>启动</Button>
      <Button onClick={() => handleStop(record.id)}>停止</Button>
    </Space>
  ),
}

// ✅ AFTER: 提取为 memo 化组件
const DeviceActions = memo(({ device, onStart, onStop }) => (
  <Space>
    <Button onClick={() => onStart(device.id)}>启动</Button>
    <Button onClick={() => onStop(device.id)}>停止</Button>
  </Space>
));

// 在 columns 中使用
{
  title: '操作',
  render: (_, record: Device) => (
    <DeviceActions
      device={record}
      onStart={handleStart}
      onStop={handleStop}
    />
  ),
}
```

**统计卡片组件**:
```typescript
// ✅ 提取为独立 memo 组件
const StatCard = memo(({ title, value, icon, color }) => (
  <Card>
    <Statistic
      title={title}
      value={value}
      prefix={icon}
      valueStyle={{ color }}
    />
  </Card>
));
```

**标签渲染组件**:
```typescript
// ✅ 提取状态标签
const StatusTag = memo(({ status }) => {
  const statusMap = {
    idle: { color: 'default', text: '空闲' },
    running: { color: 'success', text: '运行中' },
    stopped: { color: 'warning', text: '已停止' },
    error: { color: 'error', text: '错误' },
  };

  const { color, text } = statusMap[status] || statusMap.idle;
  return <Tag color={color}>{text}</Tag>;
});
```

---

### 2. Props 传递优化（高优先级）

#### 避免内联对象/函数

**❌ 问题代码**:
```typescript
// 每次渲染都创建新对象
<Table
  dataSource={devices}
  pagination={{  // ❌ 每次都是新对象
    current: page,
    pageSize: pageSize,
    total: total,
  }}
/>

// 每次渲染都创建新函数
<Button onClick={() => handleClick(id)}>  {/* ❌ 每次都是新函数 */}
  点击
</Button>
```

**✅ 优化方案**:
```typescript
// 使用 useMemo 缓存对象
const paginationConfig = useMemo(() => ({
  current: page,
  pageSize: pageSize,
  total: total,
  onChange: handlePageChange,
}), [page, pageSize, total, handlePageChange]);

<Table
  dataSource={devices}
  pagination={paginationConfig}  // ✅ 引用不变
/>

// 使用 useCallback 缓存函数
const handleClickWithId = useCallback(() => {
  handleClick(id);
}, [id, handleClick]);

<Button onClick={handleClickWithId}>  {/* ✅ 引用不变 */}
  点击
</Button>
```

---

### 3. 虚拟滚动实现（中优先级）

#### 适用场景
- 列表数据 > 100 条
- 每行渲染复杂（含图片、按钮、嵌套组件）
- 频繁滚动操作

#### 实现方案

**使用 react-window**:
```typescript
import { FixedSizeList } from 'react-window';

const VirtualizedDeviceList = ({ devices }) => {
  const Row = ({ index, style }) => {
    const device = devices[index];
    return (
      <div style={style}>
        <DeviceCard device={device} />
      </div>
    );
  };

  return (
    <FixedSizeList
      height={600}
      itemCount={devices.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

**使用 react-window-infinite-loader（分页）**:
```typescript
import { FixedSizeList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';

const InfiniteDeviceList = ({
  devices,
  hasMore,
  loadMore,
  isLoading
}) => {
  const isItemLoaded = (index) => !hasMore || index < devices.length;

  const loadMoreItems = isLoading ? () => {} : loadMore;

  return (
    <InfiniteLoader
      isItemLoaded={isItemLoaded}
      itemCount={hasMore ? devices.length + 1 : devices.length}
      loadMoreItems={loadMoreItems}
    >
      {({ onItemsRendered, ref }) => (
        <FixedSizeList
          height={600}
          itemCount={devices.length}
          itemSize={80}
          onItemsRendered={onItemsRendered}
          ref={ref}
          width="100%"
        >
          {Row}
        </FixedSizeList>
      )}
    </InfiniteLoader>
  );
};
```

---

### 4. 组件拆分（中优先级）

#### 拆分原则
- 单个文件 < 300 行
- 单个组件 < 200 行
- 逻辑独立的功能提取为子组件

#### DeviceList 拆分方案

```
DeviceList.tsx (主组件, ~200 行)
├── DeviceListHeader.tsx (筛选栏, ~80 行)
│   ├── DeviceSearchBar
│   ├── DeviceFilters
│   └── DeviceBatchActions
├── DeviceStatsCards.tsx (统计卡片, ~50 行)
├── DeviceTable.tsx (表格, ~150 行)
│   ├── DeviceTableRow (memo)
│   ├── DeviceActions (memo)
│   └── DeviceStatusTag (memo)
└── CreateDeviceModal.tsx (创建弹窗, ~100 行)
```

**拆分示例**:
```typescript
// DeviceListHeader.tsx
export const DeviceListHeader = memo(({
  onSearch,
  onFilter,
  onBatchAction,
  selectedCount
}) => {
  return (
    <Card>
      <Row gutter={16}>
        <Col span={8}>
          <Search
            placeholder="搜索设备名称/ID"
            onSearch={onSearch}
          />
        </Col>
        <Col span={8}>
          <DeviceFilters onChange={onFilter} />
        </Col>
        <Col span={8}>
          <DeviceBatchActions
            disabled={selectedCount === 0}
            onAction={onBatchAction}
          />
        </Col>
      </Row>
    </Card>
  );
});
```

---

## 🔧 优化工具

### React DevTools Profiler

**使用步骤**:
1. 打开 Chrome DevTools → React Profiler
2. 点击 "Record" 开始录制
3. 执行操作（滚动、筛选、点击）
4. 停止录制，查看 Flamegraph

**关键指标**:
- **Render duration**: 渲染耗时
- **Commit duration**: 提交耗时
- **Interactions**: 用户交互追踪

**识别问题**:
- 🔴 黄色/红色火焰：渲染耗时长
- 🔴 频繁闪烁：不必要的重渲染
- 🔴 层级深：组件嵌套过深

---

### why-did-you-render

**安装**:
```bash
pnpm add @welldone-software/why-did-you-render
```

**配置**:
```typescript
// src/wdyr.ts
import React from 'react';

if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    trackHooks: true,
    logOnDifferentValues: true,
  });
}
```

**使用**:
```typescript
// 在组件上标记
DeviceList.whyDidYouRender = true;
```

---

## 📊 性能测量

### 测量重渲染次数

**使用自定义 Hook**:
```typescript
export function useRenderCount(componentName: string) {
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderCountRef.current += 1;
    console.log(`${componentName} rendered ${renderCountRef.current} times`);
  });
}

// 使用
const DeviceList = () => {
  useRenderCount('DeviceList');
  // ...
};
```

---

### 测量渲染时间

```typescript
export function useRenderTime(componentName: string) {
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    const renderTime = performance.now() - startTimeRef.current;
    console.log(`${componentName} rendered in ${renderTime.toFixed(2)}ms`);
    startTimeRef.current = performance.now();
  });
}
```

---

## ✅ 验收标准

### 性能指标

**DeviceList 组件**:
- [ ] 首次渲染 < 500ms
- [ ] 筛选操作响应 < 100ms
- [ ] 滚动 60fps (16.67ms/frame)
- [ ] 批量操作响应 < 200ms
- [ ] 重渲染次数 < 5 (单次操作)

**UserList 组件**:
- [ ] 首次渲染 < 500ms
- [ ] 搜索响应 < 100ms
- [ ] 滚动 60fps

---

## 🚀 实施计划

### Day 1-2: React.memo 优化 (8 小时)

**任务**:
1. [x] 分析 DeviceList 重渲染
2. [ ] 提取 DeviceActions 组件
3. [ ] 提取 StatusTag 组件
4. [ ] 提取 StatCard 组件
5. [ ] 优化 props 传递
6. [ ] 测量优化效果

**预期结果**:
- DeviceList 重渲染次数从 ~10 次降到 ~3 次
- 筛选操作响应时间 < 100ms

---

### Day 3-4: 虚拟滚动 (8 小时)

**任务**:
1. [ ] DeviceList 虚拟滚动实现
2. [ ] UserList 虚拟滚动实现
3. [ ] AuditLogList 虚拟滚动实现
4. [ ] 性能测试
5. [ ] 回退方案（< 100 条用普通列表）

**预期结果**:
- 1000+ 条数据滚动流畅（60fps）
- 内存占用减少 70%

---

### Day 5: 组件拆分 (4 小时)

**任务**:
1. [ ] 拆分 DeviceList (737 行 → 5 个文件)
2. [ ] 拆分 UserList (990 行 → 6 个文件)
3. [ ] 代码审查
4. [ ] 文档更新

---

## 📚 参考资料

- [React.memo API](https://react.dev/reference/react/memo)
- [useMemo Hook](https://react.dev/reference/react/useMemo)
- [useCallback Hook](https://react.dev/reference/react/useCallback)
- [react-window 文档](https://react-window.vercel.app/)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)

---

**文档创建时间**: 2025-11-01
