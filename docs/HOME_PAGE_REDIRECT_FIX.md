# 首页自动跳转登录问题 - 完整解决方案

**问题报告时间**：2025-11-02
**解决状态**：✅ 已修复（前端快速方案）

---

## 📋 问题描述

**症状**：
- 未登录用户访问首页 `/` 时自动跳转到 `/login`
- 即使路由配置正确（首页为公开路由），仍然会跳转

**影响**：
- 未登录用户无法查看营销首页
- 无法展示套餐信息给潜在客户
- 影响用户转化率

---

## 🔍 根本原因分析

### 问题触发流程

```
用户访问首页 "/"
  ↓
Home 组件加载
  ↓
useHome hook 执行
  ↓
useEffect 调用 loadPlans()
  ↓
调用 getActivePlans() API
  ↓
请求 GET /billing/plans
  ↓
后端需要认证 (@UseGuards(AuthGuard('jwt')))
  ↓
返回 401 未授权错误
  ↓
axios 响应拦截器捕获 401
  ↓
自动重定向到 /login
```

### 关键代码位置

#### 1. 前端 API 调用

**文件**：`frontend/user/src/hooks/useHome.ts`

```typescript
// 第 30-42 行（修复前）
const loadPlans = useCallback(async () => {
  setLoading(true);
  try {
    const data = await getActivePlans(); // ❌ 调用需要认证的 API
    setPlans(data);
  } catch (error) {
    console.error('加载套餐失败:', error);
    setPlans([]);
  } finally {
    setLoading(false);
  }
}, []);

// 第 44-47 行
useEffect(() => {
  loadPlans(); // 页面加载时自动执行
}, [loadPlans]);
```

#### 2. axios 拦截器

**文件**：`frontend/user/src/utils/request.ts`

```typescript
// 第 214-224 行：401 错误处理
case 401:
  message.error('登录已过期，请重新登录');
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  setTimeout(() => {
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login'; // ❌ 强制重定向
    }
  }, 1000);
  break;
```

#### 3. 后端 API 认证要求

**文件**：`backend/billing-service/src/billing/billing.controller.ts`

```typescript
// 第 47-56 行
@Get('plans')
@RequirePermission('billing:read')
@UseGuards(AuthGuard('jwt'), PermissionsGuard) // ❌ 需要 JWT 认证
async getPlans(@Query('page') page: string = '1', ...) {
  return this.billingService.getPlans(+page, +pageSize);
}
```

---

## ✅ 解决方案

### 方案 1：前端快速修复（已实施）

**优点**：
- 立即生效，无需重启后端
- 不影响现有认证流程
- 用户体验良好（显示模拟套餐数据）

**缺点**：
- 使用模拟数据，与数据库不同步
- 已登录用户也会先看到模拟数据

**实现代码**：

```typescript
// frontend/user/src/hooks/useHome.ts
const loadPlans = useCallback(async () => {
  // ✅ 如果未登录，使用模拟数据展示（避免 401 跳转）
  if (!isLoggedIn) {
    setPlans([
      {
        id: 'mock-basic',
        name: '基础版',
        price: 99,
        duration: 30,
        features: ['2核 CPU', '4GB 内存', '20GB 存储', '10台设备'],
        description: '适合个人开发者',
      },
      {
        id: 'mock-standard',
        name: '标准版',
        price: 399,
        duration: 30,
        features: ['4核 CPU', '8GB 内存', '50GB 存储', '50台设备'],
        description: '适合小团队',
      },
      {
        id: 'mock-pro',
        name: '专业版',
        price: 999,
        duration: 30,
        features: ['8核 CPU', '16GB 内存', '100GB 存储', '200台设备'],
        description: '适合企业用户',
      },
      {
        id: 'mock-enterprise',
        name: '企业版',
        price: 0,
        duration: 30,
        features: ['自定义配置', '无限设备', '专属客服', '定制开发'],
        description: '联系我们获取报价',
      },
    ] as any);
    return; // ✅ 不调用 API
  }

  // 已登录用户：正常调用 API
  setLoading(true);
  try {
    const data = await getActivePlans();
    setPlans(data);
  } catch (error) {
    console.error('加载套餐失败:', error);
    setPlans([]);
  } finally {
    setLoading(false);
  }
}, [isLoggedIn]);
```

**修改文件**：
- ✅ `frontend/user/src/hooks/useHome.ts` (第 30-81 行)

---

### 方案 2：后端创建公开 API（推荐长期方案）

**优点**：
- 业务逻辑正确（营销页面本应公开展示套餐）
- 数据实时同步
- 用户体验最佳
- 架构清晰（公开 API vs 认证 API 分离）

**缺点**：
- 需要修改后端代码
- 需要重启 billing-service

#### 2.1 后端实现

**步骤 1：创建公开控制器**

创建文件：`backend/billing-service/src/billing/public-billing.controller.ts`

```typescript
import { Controller, Get, Query, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BillingService } from './billing.service';

@ApiTags('public')
@Controller('public/billing')
export class PublicBillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  @ApiOperation({
    summary: '获取公开套餐列表',
    description: '无需认证，返回所有公开可见的套餐'
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPublicPlans(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ) {
    return this.billingService.getPublicPlans(+page, +pageSize);
  }

  @Get('plans/:id')
  @ApiOperation({
    summary: '获取公开套餐详情',
    description: '无需认证，返回指定套餐的详细信息'
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '套餐不存在' })
  async getPublicPlan(@Param('id') id: string) {
    return this.billingService.getPublicPlan(id);
  }
}
```

**步骤 2：在 BillingService 中添加方法**

修改文件：`backend/billing-service/src/billing/billing.service.ts`

```typescript
// 添加以下两个方法

/**
 * 获取公开套餐列表（无需认证）
 * 只返回 isPublic=true 且 status='active' 的套餐
 */
async getPublicPlans(page: number = 1, pageSize: number = 10) {
  const [plans, total] = await this.planRepository.findAndCount({
    where: {
      isPublic: true,  // 只返回公开套餐
      status: 'active'  // 只返回激活状态
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    order: { displayOrder: 'ASC', createdAt: 'DESC' },
  });

  return {
    success: true,
    data: plans,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * 获取公开套餐详情（无需认证）
 */
async getPublicPlan(id: string) {
  const plan = await this.planRepository.findOne({
    where: {
      id,
      isPublic: true,
      status: 'active'
    },
  });

  if (!plan) {
    throw new NotFoundException('套餐不存在或不可用');
  }

  return {
    success: true,
    data: plan,
  };
}
```

**步骤 3：注册控制器**

修改文件：`backend/billing-service/src/billing/billing.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { PublicBillingController } from './public-billing.controller'; // ✅ 导入
import { BillingService } from './billing.service';
import { Plan } from './entities/plan.entity';
// ... 其他导入

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Invoice, Balance, Transaction, /* ... */]),
    // ... 其他导入
  ],
  controllers: [
    BillingController,
    PublicBillingController, // ✅ 注册公开控制器
  ],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
```

**步骤 4：确保 Plan 实体有 isPublic 字段**

检查文件：`backend/billing-service/src/billing/entities/plan.entity.ts`

```typescript
@Entity('plans')
export class Plan {
  // ... 其他字段

  @Column({ default: true })
  isPublic: boolean; // ✅ 确保有这个字段

  @Column({ default: 'active' })
  status: string; // ✅ 确保有这个字段

  @Column({ default: 0 })
  displayOrder: number; // ✅ 用于排序

  // ... 其他字段
}
```

如果没有这些字段，需要创建迁移：

```typescript
// backend/billing-service/migrations/xxx_add_public_fields_to_plans.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublicFieldsToPlans1699999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE plans
      ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE plans
      DROP COLUMN IF EXISTS "isPublic",
      DROP COLUMN IF EXISTS "status",
      DROP COLUMN IF EXISTS "displayOrder"
    `);
  }
}
```

#### 2.2 前端实现

**修改 API 服务**

修改文件：`frontend/user/src/services/plan.ts`

```typescript
import request from '@/utils/request';
import type { Plan, PaginatedResponse } from '@/types';

/**
 * 获取公开套餐列表（无需认证）
 */
export const getActivePlans = async () => {
  const response = await request.get<PaginatedResponse<Plan>>('/public/billing/plans', {
    params: { page: 1, pageSize: 100 },
  });
  return response.data;
};

/**
 * 获取公开套餐详情（无需认证）
 */
export const getPlan = async (id: string) => {
  const response = await request.get<{ success: boolean; data: Plan }>(`/public/billing/plans/${id}`);
  return response.data;
};
```

**修改 useHome hook**

修改文件：`frontend/user/src/hooks/useHome.ts`

```typescript
// 移除模拟数据，直接调用公开 API
const loadPlans = useCallback(async () => {
  setLoading(true);
  try {
    const data = await getActivePlans(); // ✅ 现在是公开 API，无需认证
    setPlans(data);
  } catch (error) {
    console.error('加载套餐失败:', error);
    setPlans([]);
  } finally {
    setLoading(false);
  }
}, []);
```

---

## 🚀 部署步骤

### 使用方案 1（前端快速修复 - 已完成）

```bash
# 1. 前端已修改完成，直接启动即可
cd frontend/user
pnpm dev

# 访问 http://localhost:5174
# ✅ 应该可以看到首页，不会跳转
```

### 升级到方案 2（后端公开 API）

```bash
# 1. 创建后端文件
cd backend/billing-service
touch src/billing/public-billing.controller.ts

# 2. 复制上面的代码到相应文件

# 3. 如果需要，运行数据库迁移
pnpm migration:run

# 4. 重启 billing-service
pm2 restart billing-service

# 5. 修改前端 API 调用（移除模拟数据）

# 6. 重启前端
cd frontend/user
pnpm dev
```

---

## ✅ 验证清单

### 方案 1 验证（前端修复）

- [x] 未登录访问首页不跳转
- [x] 可以看到 4 个模拟套餐
- [x] 点击"购买"跳转到登录页
- [x] 登录后可以看到真实套餐数据

### 方案 2 验证（后端公开 API）

- [ ] 创建 PublicBillingController
- [ ] 添加 getPublicPlans 和 getPublicPlan 方法
- [ ] 确保 Plan 实体有 isPublic 字段
- [ ] 注册公开控制器
- [ ] 测试公开 API：`curl http://localhost:30005/public/billing/plans`
- [ ] 修改前端 API 调用
- [ ] 验证未登录用户可以看到真实套餐
- [ ] 验证套餐数据与数据库一致

---

## 📊 两种方案对比

| 特性 | 方案 1 (前端修复) | 方案 2 (后端公开 API) |
|------|------------------|---------------------|
| **实施难度** | ⭐ 简单 | ⭐⭐⭐ 中等 |
| **修改文件数** | 1 个 | 4-5 个 |
| **需要重启服务** | 否 | 是（billing-service） |
| **数据实时性** | ❌ 模拟数据 | ✅ 实时数据 |
| **业务逻辑** | ⚠️ 临时方案 | ✅ 符合业务逻辑 |
| **可维护性** | ⚠️ 需要手动更新模拟数据 | ✅ 自动同步 |
| **用户体验** | ✅ 良好 | ✅ 最佳 |
| **安全性** | ✅ 无影响 | ✅ 只开放查询权限 |
| **推荐程度** | ⭐⭐⭐ 临时使用 | ⭐⭐⭐⭐⭐ 长期推荐 |

---

## 🎯 建议

1. **当前使用方案 1**（已实施）
   - 立即解决首页跳转问题
   - 用户可以正常浏览营销内容

2. **后续升级到方案 2**（推荐）
   - 在后端开发稳定后实施
   - 提供更好的用户体验
   - 符合标准 SaaS 架构

3. **迁移路径**：
   ```
   方案 1 (现在) → 测试验证 → 方案 2 (未来)
   ```

---

## 📝 相关文档

- `docs/MARKETING_HOMEPAGE_COMPLETE.md` - 营销首页完整实现
- `docs/HOME_PAGE_TEST_REPORT.md` - 首页测试报告
- `backend/billing-service/README.md` - Billing Service 文档

---

**修复时间**：2025-11-02
**修复状态**：✅ 方案 1 已完成
**下一步**：根据需要升级到方案 2
