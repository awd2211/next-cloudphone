# SMS E2E 测试状态报告

**日期**: 2025-11-02
**状态**: 🟡 进行中 - 需要修复 Guards

---

## 📊 当前进展

### ✅ 已完成
1. **E2E 测试文件创建**: `backend/device-service/test/sms-integration.e2e-spec.ts` (724 行)
2. **Jest 配置修复**: 修复 `p-limit.js` 模块映射
3. **Supertest 导入修复**: 使用默认导入而非命名空间导入
4. **EventOutboxService Mock**: 添加缺失的依赖 mock

### 🟡 当前问题
**认证 Guard 错误**: `Error: Unknown authentication strategy "jwt"`

**根本原因**:
```typescript
// src/devices/devices.controller.ts
@UseGuards(AuthGuard('jwt'), PermissionsGuard, DataScopeGuard)
export class DevicesController {
  // SMS 端点需要通过这些 guards
}
```

### 📈 测试执行结果
- **总计**: 18 个测试
- **通过**: 2 个 ✅
- **失败**: 16 个 ❌
- **失败原因**: 所有失败都是因为 500 错误（JWT strategy 未配置）

---

## 🔧 需要的修复

### 方案 1: Override Guards（推荐）

在 E2E 测试中 override 所有认证/授权 guards：

```typescript
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { DataScopeGuard } from '@cloudphone/shared';
import { QuotaGuard } from '../src/quota/quota.guard';

const moduleFixture = await Test.createTestingModule({
  // ...
})
  .overrideGuard(AuthGuard('jwt'))
  .useValue({ canActivate: () => true })
  .overrideGuard(PermissionsGuard)
  .useValue({ canActivate: () => true })
  .overrideGuard(DataScopeGuard)
  .useValue({ canActivate: () => true })
  .overrideGuard(QuotaGuard)
  .useValue({ canActivate: () => true })
  .compile();
```

**优点**:
- 简单直接
- 专注于业务逻辑测试
- Guards 有自己的单元测试

**缺点**:
- 不测试真实的认证流程
- 需要导入 guard 类

---

### 方案 2: 配置真实的 JWT Strategy

导入并配置 PassportModule 和 JwtModule：

```typescript
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';

const moduleFixture = await Test.createTestingModule({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: 'test-secret',
      signOptions: { expiresIn: '1h' },
    }),
    // ... 其他 imports
  ],
  providers: [
    JwtStrategy,
    // ... 其他 providers
  ],
})
.compile();

// 在测试中生成和使用真实的 JWT token
const token = jwtService.sign({ sub: 'user-123', username: 'test' });
await request(app.getHttpServer())
  .post(`/devices/${device.id}/request-sms`)
  .set('Authorization', `Bearer ${token}`)
  .send(requestDto)
  .expect(201);
```

**优点**:
- 测试真实的认证流程
- 更接近生产环境

**缺点**:
- 复杂度高
- 需要配置更多依赖
- 测试运行时间更长

---

## 🎯 推荐方案

**使用方案 1（Override Guards）**，原因：

1. **E2E 测试的目标**: 验证 HTTP 层和业务逻辑集成，而非认证机制
2. **Guards 已有单元测试**: Auth guards 有自己的测试套件
3. **简化测试**: 减少测试复杂度和依赖
4. **参考现有测试**: `device-creation.e2e-spec.ts` 也应该（或需要）使用类似方法

---

## 📝 实施步骤

### Step 1: 添加 Guard 导入

```typescript
// test/sms-integration.e2e-spec.ts
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { DataScopeGuard } from '@cloudphone/shared';
import { QuotaGuard } from '../src/quota/quota.guard';
```

### Step 2: Override Guards

在 `Test.createTestingModule()` 链中添加：

```typescript
.overrideGuard(AuthGuard('jwt'))
.useValue({ canActivate: () => true })
.overrideGuard(PermissionsGuard)
.useValue({ canActivate: () => true })
.overrideGuard(DataScopeGuard)
.useValue({ canActivate: () => true })
.overrideGuard(QuotaGuard)
.useValue({ canActivate: () => true })
```

### Step 3: 运行测试

```bash
pnpm test:e2e sms-integration.e2e-spec.ts
```

### Step 4: 预期结果

所有 18 个测试应该通过：
- ✅ 5 个 POST /devices/:id/request-sms 测试
- ✅ 3 个 GET /devices/:id/sms-number 测试
- ✅ 4 个 DELETE /devices/:id/sms-number 测试
- ✅ 3 个 GET /devices/:id/sms-messages 测试
- ✅ 1 个完整生命周期测试
- ✅ 2 个边界条件测试

---

## 🎓 测试架构洞察

`★ Insight ─────────────────────────────────────`

**E2E 测试中的 Guard Override 策略**

### 为什么在 E2E 测试中 Override Guards？

E2E 测试的核心目标是验证**业务逻辑的端到端流程**，而不是测试框架机制。

**测试金字塔分层**:
```
┌─────────────────────────────────────┐
│  E2E Tests (少量)                   │
│  - 测试完整业务流程                  │
│  - Mock Guards, 真实 Services       │
│  - 关注点：HTTP 接口 + 业务逻辑     │
├─────────────────────────────────────┤
│  Integration Tests (中等)           │
│  - 测试服务之间的集成                │
│  - Mock 外部依赖, 真实 Database     │
│  - 关注点：服务交互                  │
├─────────────────────────────────────┤
│  Unit Tests (大量)                   │
│  - 测试单个函数/方法                  │
│  - Mock 所有依赖                     │
│  - 关注点：纯逻辑                     │
│                                     │
│  ← Guards 在这里测试                │
└─────────────────────────────────────┘
```

### Guards 应该在哪里测试？

1. **Guard 单元测试** (auth/guards/*.guard.spec.ts):
   ```typescript
   describe('PermissionsGuard', () => {
     it('should allow access with correct permission', () => {
       // 测试 permission 检查逻辑
     });

     it('should deny access without permission', () => {
       // 测试拒绝逻辑
     });
   });
   ```

2. **Strategy 单元测试** (auth/strategies/*.strategy.spec.ts):
   ```typescript
   describe('JwtStrategy', () => {
     it('should validate JWT token', () => {
       // 测试 token 验证逻辑
     });
   });
   ```

3. **Auth E2E 测试** (test/auth.e2e-spec.ts):
   ```typescript
   describe('Authentication E2E', () => {
     it('should reject request without token', () => {
       // 测试完整认证流程
     });

     it('should accept request with valid token', () => {
       // 测试完整认证流程
     });
   });
   ```

### E2E 测试中 Override 的好处

1. **隔离业务逻辑**: 避免认证问题干扰业务流程测试
2. **简化设置**: 不需要生成 token、配置 strategies
3. **提高速度**: 跳过认证检查，直接测试业务逻辑
4. **降低脆弱性**: 认证配置变更不影响业务逻辑测试

### 何时不应该 Override？

仅在以下场景测试真实 Guards：
- 专门的**认证/授权 E2E 测试**
- **安全审计测试**
- **渗透测试**

对于业务功能 E2E 测试（如 SMS 功能），应该 Override Guards。

`─────────────────────────────────────────────────`

---

## 📂 相关文件

### 测试文件
- `backend/device-service/test/sms-integration.e2e-spec.ts` - SMS E2E 测试（待修复）
- `backend/device-service/test/device-creation.e2e-spec.ts` - 参考示例（可能也需要修复）
- `backend/device-service/test/jest-e2e.json` - E2E Jest 配置

### Guard 文件
- `backend/device-service/src/auth/guards/permissions.guard.ts` - 权限 Guard
- `backend/device-service/src/quota/quota.guard.ts` - 配额 Guard
- `backend/shared/src/guards/data-scope.guard.ts` - 数据作用域 Guard

### Controller 文件
- `backend/device-service/src/devices/devices.controller.ts` - SMS 端点定义

---

## 🚀 下一步行动

1. ✅ 创建此状态报告
2. ⏳ 实施 Guard Override 修复
3. ⏳ 运行测试验证所有通过
4. ⏳ 生成最终的 E2E 测试完成报告

---

**报告生成时间**: 2025-11-02 06:50 UTC
**状态**: 待修复
