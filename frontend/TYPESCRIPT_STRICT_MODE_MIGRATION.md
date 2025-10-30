# TypeScript Strict Mode 迁移指南

## 当前状态

已启用 TypeScript strict 模式的部分功能（Phase 1），正在逐步迁移中。

## Phase 1: 已启用的检查 ✅

以下 TypeScript 严格检查已在两个前端应用中启用：

### 核心 Strict 选项
- ✅ **noImplicitAny**: 禁止隐式 `any` 类型
- ✅ **strictNullChecks**: 严格的 null/undefined 检查
- ✅ **strictFunctionTypes**: 严格的函数类型检查
- ✅ **strictBindCallApply**: 严格的 bind/call/apply 检查

### 其他严格检查
- ✅ **noUnusedLocals**: 禁止未使用的局部变量
- ✅ **noUnusedParameters**: 禁止未使用的参数
- ✅ **noImplicitReturns**: 所有代码路径必须有返回值
- ✅ **noUncheckedIndexedAccess**: 访问索引时添加 undefined 检查

## Phase 2: 待启用的检查 🔄

以下选项将在代码修复完成后启用：

- 🔄 **strictPropertyInitialization**: 严格的属性初始化检查
- 🔄 **noImplicitThis**: 禁止隐式 this
- 🔄 **alwaysStrict**: 总是使用严格模式
- 🔄 **strict**: true (完全启用 strict 模式)

## 迁移计划

### Week 1: 修复核心类型问题
- [ ] 修复 `/types` 目录中的所有类型定义
- [ ] 修复 `/services` 目录中的 API 服务类型
- [ ] 修复 `/utils` 目录中的工具函数类型

### Week 2: 修复 Hooks 和组件
- [ ] 修复 `/hooks` 目录中的自定义 hooks
- [ ] 修复常用的共享组件
- [ ] 修复 Layout 组件

### Week 3: 修复页面组件
- [ ] 修复高优先级页面（设备管理、用户管理等）
- [ ] 修复其他页面组件
- [ ] 启用 Phase 2 的严格检查

## 常见问题和解决方案

### 1. 隐式 any 类型

**问题:**
```typescript
// ❌ 错误：参数 'error' 隐式具有 'any' 类型
retry: (failureCount, error) => { ... }
```

**解决方案:**
```typescript
// ✅ 正确：显式声明类型
retry: (failureCount: number, error: Error) => { ... }
// 或使用更具体的类型
retry: (failureCount: number, error: AxiosError) => { ... }
```

### 2. 可能为 null/undefined

**问题:**
```typescript
// ❌ 错误：对象可能为 'null' 或 'undefined'
const name = user.name; // user 可能为 null
```

**解决方案:**
```typescript
// ✅ 使用可选链
const name = user?.name;

// ✅ 使用空值合并
const name = user?.name ?? '未知用户';

// ✅ 使用类型守卫
if (user) {
  const name = user.name;
}
```

### 3. 索引访问可能为 undefined

**问题:**
```typescript
// ❌ 错误：元素隐式具有 'any' 类型，因为索引表达式类型不是 'number'
const value = obj[key];
```

**解决方案:**
```typescript
// ✅ 添加 undefined 检查
const value = obj[key];
if (value !== undefined) {
  // 使用 value
}

// ✅ 使用可选链和默认值
const value = obj[key] ?? defaultValue;
```

### 4. 未使用的变量

**问题:**
```typescript
// ❌ 错误：'result' 已声明但从未读取其值
const result = await someAsyncFunction();
```

**解决方案:**
```typescript
// ✅ 如果真的不需要，移除变量
await someAsyncFunction();

// ✅ 或使用 _ 前缀表示故意不使用
const _result = await someAsyncFunction();

// ✅ 或实际使用它
const result = await someAsyncFunction();
console.log(result);
```

### 5. 函数缺少返回值

**问题:**
```typescript
// ❌ 错误：不是所有代码路径都返回值
function getStatus(status: string): string {
  if (status === 'active') {
    return '活跃';
  }
  // 缺少其他情况的返回值
}
```

**解决方案:**
```typescript
// ✅ 确保所有路径都有返回值
function getStatus(status: string): string {
  if (status === 'active') {
    return '活跃';
  }
  return '未知'; // 默认返回值
}

// ✅ 或使用 switch
function getStatus(status: string): string {
  switch (status) {
    case 'active':
      return '活跃';
    case 'inactive':
      return '不活跃';
    default:
      return '未知';
  }
}
```

## 推荐的 VSCode 设置

在 `.vscode/settings.json` 中添加：

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

## 渐进式迁移策略

1. **先修复新代码**: 所有新写的代码必须通过 strict 检查
2. **优先修复高价值文件**: 核心类型定义、常用工具函数
3. **使用 @ts-expect-error**: 对于暂时无法修复的旧代码，添加注释
   ```typescript
   // @ts-expect-error - 待迁移：需要添加正确的类型定义
   const result = legacyFunction(data);
   ```
4. **定期清理**: 每周检查并减少 `@ts-expect-error` 的使用

## 检查进度

运行以下命令检查类型错误：

```bash
# 检查 Admin 应用
cd frontend/admin && pnpm exec tsc --noEmit

# 检查 User 应用
cd frontend/user && pnpm exec tsc --noEmit
```

## 完成标准

当满足以下条件时，可以启用完全的 strict 模式：

- [ ] `tsc --noEmit` 运行无错误
- [ ] 代码中没有 `@ts-expect-error` 注释（或少于 5 个）
- [ ] 所有核心功能测试通过
- [ ] 团队成员理解并接受新的类型约束

---

**更新日期**: 2025-10-29
**当前阶段**: Phase 1 完成，Phase 2 进行中
