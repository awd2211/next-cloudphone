# @cloudphone/eslint-plugin-transaction

ESLint 插件，用于自动检测事务相关的常见问题。

---

## 📦 安装

```bash
# 在各个后端服务中安装（已内置在 @cloudphone/shared）
cd backend/user-service
pnpm install
```

---

## 🔧 配置

### 方式1: 使用推荐配置（推荐）

在你的 `eslint.config.mjs` 中：

```javascript
import transactionPlugin from '../../shared/eslint-plugin/index.js';

export default [
  {
    plugins: {
      '@cloudphone/transaction': transactionPlugin,
    },
    rules: {
      ...transactionPlugin.configs.recommended.rules,
    },
  },
];
```

---

### 方式2: 自定义配置

```javascript
import transactionPlugin from '../../shared/eslint-plugin/index.js';

export default [
  {
    plugins: {
      '@cloudphone/transaction': transactionPlugin,
    },
    rules: {
      // 错误级别（error）- 必须修复
      '@cloudphone/transaction/transaction-must-release': 'error',

      // 警告级别（warn）- 建议修复
      '@cloudphone/transaction/save-must-in-transaction': 'warn',
      '@cloudphone/transaction/update-must-in-transaction': 'warn',
      '@cloudphone/transaction/delete-must-in-transaction': 'warn',
      '@cloudphone/transaction/outbox-with-transaction': 'warn',
      '@cloudphone/transaction/no-external-service-in-transaction': 'warn',
    },
  },
];
```

---

## 📋 规则列表

### 1. transaction-must-release (error)

**检测**: QueryRunner 是否在 finally 块中释放

❌ 错误示例:
```typescript
async createUser() {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
  }
  // ❌ 缺少 finally 块
}
```

✅ 正确示例:
```typescript
async createUser() {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();  // ✅
  }
}
```

---

### 2. save-must-in-transaction (warn)

**检测**: `repository.save()` 是否在事务中

❌ 错误示例:
```typescript
async createUser(dto: CreateUserDto) {
  return await this.repository.save(dto);  // ❌ 无事务保护
}
```

✅ 正确示例:
```typescript
@Transaction()
async createUser(manager: EntityManager, dto: CreateUserDto) {
  return await manager.save(User, dto);  // ✅
}
```

---

### 3. update-must-in-transaction (warn)

**检测**: `repository.update()` 是否在事务中

❌ 错误示例:
```typescript
async updateStatus(id: string, status: Status) {
  await this.repository.update(id, { status });  // ❌ 无事务保护
}
```

✅ 正确示例:
```typescript
@Transaction()
async updateStatus(manager: EntityManager, id: string, status: Status) {
  await manager.update(Entity, id, { status });  // ✅
}
```

---

### 4. delete-must-in-transaction (warn)

**检测**: `repository.delete()` 是否在事务中

❌ 错误示例:
```typescript
async removeUser(id: string) {
  await this.repository.delete(id);  // ❌ 无事务保护
}
```

✅ 正确示例:
```typescript
@Transaction()
async removeUser(manager: EntityManager, id: string) {
  await manager.delete(User, id);  // ✅
}
```

---

### 5. outbox-with-transaction (warn)

**检测**: 写操作是否发布 Outbox 事件

❌ 错误示例:
```typescript
@Transaction()
async createUser(manager: EntityManager, dto: CreateUserDto) {
  return await manager.save(User, dto);
  // ❌ 缺少 @PublishEvent 装饰器
}
```

✅ 正确示例 1 (装饰器):
```typescript
@Transaction()
@SimplePublishEvent('user', 'user.created')  // ✅
async createUser(manager: EntityManager, dto: CreateUserDto) {
  return await manager.save(User, dto);
}
```

✅ 正确示例 2 (手动):
```typescript
@Transaction()
async createUser(manager: EntityManager, dto: CreateUserDto) {
  const user = await manager.save(User, dto);
  await this.eventOutboxService.writeEvent(...);  // ✅
  return user;
}
```

---

### 6. no-external-service-in-transaction (warn)

**检测**: 事务方法中是否调用外部服务

❌ 错误示例:
```typescript
@Transaction()
async createUser(manager: EntityManager, dto: CreateUserDto) {
  const user = await manager.save(User, dto);
  await this.emailService.sendWelcomeEmail(user.email);  // ❌ 外部服务在事务内
  return user;
}
```

✅ 正确示例:
```typescript
@Transaction()
async saveUser(manager: EntityManager, dto: CreateUserDto) {
  return await manager.save(User, dto);
}

async createUser(dto: CreateUserDto) {
  const user = await this.saveUser(dto);  // 事务方法

  // ✅ 外部服务在事务外
  try {
    await this.emailService.sendWelcomeEmail(user.email);
  } catch (error) {
    this.logger.warn('Email failed', error);
  }

  return user;
}
```

---

## 🚀 使用方法

### 在 VS Code 中查看问题

1. 安装 ESLint 扩展
2. 打开 `.ts` 文件
3. 问题会自动高亮显示
4. 鼠标悬停查看详细说明

---

### 命令行检查

```bash
# 检查单个文件
pnpm eslint src/users/users.service.ts

# 检查所有文件
pnpm eslint src/**/*.ts

# 自动修复（部分规则支持）
pnpm eslint src/**/*.ts --fix
```

---

### CI/CD 集成

在 `.github/workflows/ci.yml` 中：

```yaml
- name: ESLint Check
  run: |
    cd backend/user-service
    pnpm eslint src/**/*.ts
```

---

## 📊 效果

### 检测示例

运行 ESLint 后的输出：

```
backend/user-service/src/users/users.service.ts
  23:5  error    QueryRunner 必须在 finally 块中释放  @cloudphone/transaction/transaction-must-release
  45:10 warning  repository.save() 应该在事务中执行   @cloudphone/transaction/save-must-in-transaction
  67:10 warning  save 操作应该发布 Outbox 事件         @cloudphone/transaction/outbox-with-transaction
  89:12 warning  事务方法中不应调用 emailService      @cloudphone/transaction/no-external-service-in-transaction

✖ 4 problems (1 error, 3 warnings)
```

---

## 🎯 最佳实践

### 1. 在开发时实时检查

ESLint 会在编码时实时提示问题，无需等到 PR 阶段。

### 2. 逐步修复警告

- 新代码: 必须通过所有检查
- 老代码: 逐步修复警告级别的问题

### 3. 配合装饰器使用

ESLint 规则可以识别装饰器，使用 `@Transaction()` 和 `@PublishEvent()` 可以自动通过检查。

---

## 🔧 自定义规则

如果需要添加新规则：

1. 在 `rules/` 目录创建新文件
2. 在 `index.js` 中注册规则
3. 更新 README

---

## 📚 相关文档

- [事务装饰器使用指南](/docs/TRANSACTION_DECORATORS_GUIDE.md)
- [代码审查清单](/docs/TRANSACTION_CODE_REVIEW_CHECKLIST.md)
- [事务治理最终总结](/docs/TRANSACTION_GOVERNANCE_FINAL_SUMMARY.md)

---

## 🎉 总结

使用 ESLint 插件可以：
- ✅ 在编码时自动发现问题
- ✅ 减少代码审查时间
- ✅ 统一团队编码规范
- ✅ 预防常见错误

**现在就在你的服务中启用 ESLint 插件，让代码更安全！** 🚀
