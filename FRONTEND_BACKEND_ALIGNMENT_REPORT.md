# 前后端API对齐检查报告

## 📋 检查日期: 2025-10-30

---

## ✅ 已对齐的模块 (Phases 1-8)

### Phase 1: 缓存管理 ✅
- **前端**: `services/cache.ts`
- **后端**: `user-service/src/cache/*`
- **状态**: 完全对齐
- **API数量**: 9/9

### Phase 2: 队列管理 ✅
- **前端**: `services/queue.ts`
- **后端**: `user-service/src/queue/*`
- **状态**: 完全对齐
- **API数量**: 8/8

### Phase 3: 事件溯源 ✅
- **前端**: `services/events.ts`
- **后端**: `user-service/src/users/events/*`
- **状态**: 完全对齐
- **API数量**: 7/7

### Phase 4: 数据范围权限 ✅
- **前端**: `services/dataScope.ts`
- **后端**: `user-service/src/permissions/controllers/data-scope.controller.ts`
- **状态**: 完全对齐
- **API数量**: 9/9

### Phase 5: 字段权限 ✅
- **前端**: `services/fieldPermission.ts`
- **后端**: `user-service/src/permissions/controllers/field-permission.controller.ts`
- **状态**: 完全对齐
- **API数量**: 10/10

### Phase 6: 工单系统 ✅
- **前端**: `services/ticket.ts`
- **后端**: `user-service/src/tickets/tickets.controller.ts`
- **状态**: 完全对齐
- **API数量**: 9/9

### Phase 7: 审计日志 ✅
- **前端**: `services/auditLog.ts`
- **后端**: `user-service/src/audit-logs/audit-logs.controller.ts`
- **状态**: 完全对齐
- **API数量**: 4/4

### Phase 8: API密钥 ✅
- **前端**: `services/apiKey.ts`
- **后端**: `user-service/src/api-keys/api-keys.controller.ts`
- **状态**: 完全对齐
- **API数量**: 8/8

---

## ⚠️ 需要对齐的模块

### Phase 9: 配额管理 ⚠️

**后端API** (user-service/src/quotas/quotas.controller.ts):
```typescript
✅ POST /quotas - 创建配额
✅ GET /quotas/user/:userId - 获取用户配额
❌ POST /quotas/check - 检查配额 (前端缺失)
❌ POST /quotas/deduct - 扣减配额 (前端缺失)
❌ POST /quotas/restore - 恢复配额 (前端缺失)
✅ PUT /quotas/:id - 更新配额
❌ POST /quotas/user/:userId/usage - 上报使用量 (前端缺失)
❌ GET /quotas/usage-stats/:userId - 获取使用统计 (前端缺失)
❌ POST /quotas/check/batch - 批量检查 (前端缺失)
❌ GET /quotas/alerts - 获取告警 (前端缺失)
```

**前端现有API** (services/quota.ts):
```typescript
✅ POST /quotas - 创建配额
✅ GET /quotas/user/:userId - 获取用户配额
✅ PUT /quotas/:id - 更新配额
❓ GET /quotas - 获取配额列表 (后端未明确提供)
❓ DELETE /quotas/:id - 删除配额 (后端未明确提供)
❓ GET /quotas/stats - 统计信息 (后端为 usage-stats)
```

**对齐状态**: ❌ 部分对齐 (3/10 API)

---

## 🔍 详细对齐问题

### 1. 配额管理 (quota.ts)

#### 缺失的后端API:
1. **检查配额** - `POST /quotas/check`
2. **扣减配额** - `POST /quotas/deduct`
3. **恢复配额** - `POST /quotas/restore`
4. **上报使用量** - `POST /quotas/user/:userId/usage`
5. **使用统计** - `GET /quotas/usage-stats/:userId`
6. **批量检查** - `POST /quotas/check/batch`
7. **获取告警** - `GET /quotas/alerts`

#### 类型定义不匹配:
**后端实体** (quota.entity.ts):
```typescript
interface QuotaLimits {
  maxDevices: number;
  maxConcurrentDevices: number;
  maxCpuCoresPerDevice: number;
  maxMemoryMBPerDevice: number;
  maxStorageGBPerDevice: number;
  totalCpuCores: number;
  totalMemoryGB: number;
  totalStorageGB: number;
  maxBandwidthMbps: number;
  monthlyTrafficGB: number;
  maxUsageHoursPerDay: number;
  maxUsageHoursPerMonth: number;
}

interface QuotaUsage {
  currentDevices: number;
  currentConcurrentDevices: number;
  usedCpuCores: number;
  usedMemoryGB: number;
  usedStorageGB: number;
  currentBandwidthMbps: number;
  monthlyTrafficUsedGB: number;
  todayUsageHours: number;
  monthlyUsageHours: number;
  lastUpdatedAt: Date;
}

enum QuotaStatus {
  ACTIVE = 'active',
  EXCEEDED = 'exceeded',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
}
```

**前端类型** (简化版):
```typescript
interface Quota {
  limits: {
    maxDevices: number;
    totalCpuCores: number;
    totalMemoryGB: number;
    totalStorageGB: number;
  };
  usage: {
    currentDevices: number;
    usedCpuCores: number;
    usedMemoryGB: number;
    usedStorageGB: number;
  };
  status: 'active' | 'exceeded' | 'warning';
}
```

**问题**:
- ❌ 前端类型过于简化，缺少很多字段
- ❌ 状态枚举不匹配 (warning vs suspended/expired)
- ❌ 缺少并发、带宽、时长等配额维度

---

## 📊 对齐统计

| 模块 | 后端API | 前端API | 对齐率 | 状态 |
|------|---------|---------|--------|------|
| 缓存管理 | 9 | 9 | 100% | ✅ |
| 队列管理 | 8 | 8 | 100% | ✅ |
| 事件溯源 | 7 | 7 | 100% | ✅ |
| 数据范围权限 | 9 | 9 | 100% | ✅ |
| 字段权限 | 10 | 10 | 100% | ✅ |
| 工单系统 | 9 | 9 | 100% | ✅ |
| 审计日志 | 4 | 4 | 100% | ✅ |
| API密钥 | 8 | 8 | 100% | ✅ |
| **配额管理** | **10** | **3** | **30%** | ❌ |
| **总计** | **74** | **67** | **90.5%** | ⚠️ |

---

## 🔧 修复建议

### 立即修复: 配额管理服务

需要创建完整的 `services/quota.ts`:

```typescript
import request from '@/utils/request';
import type {
  Quota,
  QuotaStatus,
  CreateQuotaDto,
  UpdateQuotaDto,
  CheckQuotaRequest,
  DeductQuotaRequest,
  RestoreQuotaRequest,
  QuotaStatistics,
} from '@/types';

// 1. 创建配额
export const createQuota = (data: CreateQuotaDto) => {
  return request.post<{ success: boolean; data: Quota }>('/quotas', data);
};

// 2. 获取用户配额
export const getUserQuota = (userId: string) => {
  return request.get<{ success: boolean; data: Quota }>(`/quotas/user/${userId}`);
};

// 3. 检查配额
export const checkQuota = (data: CheckQuotaRequest) => {
  return request.post<{
    success: boolean;
    data: { allowed: boolean; reason?: string; current: number; limit: number };
  }>('/quotas/check', data);
};

// 4. 扣减配额
export const deductQuota = (data: DeductQuotaRequest) => {
  return request.post<{ success: boolean; data: Quota }>('/quotas/deduct', data);
};

// 5. 恢复配额
export const restoreQuota = (data: RestoreQuotaRequest) => {
  return request.post<{ success: boolean; data: Quota }>('/quotas/restore', data);
};

// 6. 更新配额
export const updateQuota = (id: string, data: UpdateQuotaDto) => {
  return request.put<{ success: boolean; data: Quota }>(`/quotas/${id}`, data);
};

// 7. 上报使用量
export const reportUsage = (userId: string, usageReport: {
  deviceId: string;
  cpuCores: number;
  memoryGB: number;
  storageGB: number;
  operation: 'increment' | 'decrement';
}) => {
  return request.post<{ success: boolean; data: Quota }>(
    `/quotas/user/${userId}/usage`,
    usageReport
  );
};

// 8. 获取使用统计
export const getUsageStats = (userId: string) => {
  return request.get<{ success: boolean; data: QuotaStatistics }>(
    `/quotas/usage-stats/${userId}`
  );
};

// 9. 批量检查配额
export const batchCheckQuota = (requests: CheckQuotaRequest[]) => {
  return request.post<{
    success: boolean;
    data: {
      total: number;
      allowed: number;
      denied: number;
      results: Array<{ allowed: boolean; reason?: string }>;
    };
  }>('/quotas/check/batch', requests);
};

// 10. 获取配额告警
export const getQuotaAlerts = (threshold: number = 80) => {
  return request.get<{
    success: boolean;
    data: Array<{
      userId: string;
      quotaType: string;
      usagePercent: number;
      current: number;
      limit: number;
    }>;
  }>('/quotas/alerts', { params: { threshold } });
};
```

### 完整的类型定义

需要添加到 `types/index.ts`:

```typescript
export type QuotaStatus = 'active' | 'exceeded' | 'suspended' | 'expired';

export interface QuotaLimits {
  maxDevices: number;
  maxConcurrentDevices: number;
  maxCpuCoresPerDevice: number;
  maxMemoryMBPerDevice: number;
  maxStorageGBPerDevice: number;
  totalCpuCores: number;
  totalMemoryGB: number;
  totalStorageGB: number;
  maxBandwidthMbps: number;
  monthlyTrafficGB: number;
  maxUsageHoursPerDay: number;
  maxUsageHoursPerMonth: number;
}

export interface QuotaUsage {
  currentDevices: number;
  currentConcurrentDevices: number;
  usedCpuCores: number;
  usedMemoryGB: number;
  usedStorageGB: number;
  currentBandwidthMbps: number;
  monthlyTrafficUsedGB: number;
  todayUsageHours: number;
  monthlyUsageHours: number;
  lastUpdatedAt: string;
}

export interface Quota {
  id: string;
  userId: string;
  planId?: string;
  planName?: string;
  status: QuotaStatus;
  limits: QuotaLimits;
  usage: QuotaUsage;
  validFrom?: string;
  validUntil?: string;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CheckQuotaRequest {
  userId: string;
  quotaType: 'device' | 'cpu' | 'memory' | 'storage';
  requestedAmount: number;
}

export interface DeductQuotaRequest {
  userId: string;
  deviceCount?: number;
  cpuCores?: number;
  memoryGB?: number;
  storageGB?: number;
}

export interface RestoreQuotaRequest {
  userId: string;
  deviceCount?: number;
  cpuCores?: number;
  memoryGB?: number;
  storageGB?: number;
}
```

---

## 🎯 修复优先级

### 高优先级 (必须修复)
1. ✅ **配额管理服务对齐** - 缺少7个关键API
2. ✅ **配额类型定义完善** - 类型不匹配

### 中优先级 (建议修复)
- 检查其他服务是否有遗漏的API
- 统一错误响应格式
- 补充缺失的DTO类型

### 低优先级 (优化)
- API命名规范统一
- 响应格式标准化
- 添加更多类型安全检查

---

## ✅ 修复后验证清单

- [ ] 更新 `services/quota.ts` 包含所有10个API
- [ ] 更新 `types/index.ts` 添加完整的Quota类型
- [ ] TypeScript编译通过
- [ ] 手动测试所有配额API
- [ ] 更新配额管理UI组件
- [ ] 创建配额管理页面测试用例

---

## 📝 总结

### 当前状态
- ✅ **8/9 模块** 完全对齐 (89%)
- ⚠️ **1/9 模块** 部分对齐 (配额管理)
- 📊 **整体对齐率**: 90.5%

### 主要问题
- 配额管理模块类型定义过于简化
- 缺少7个关键的配额管理API
- 状态枚举不匹配

### 后续行动
1. **立即**: 修复配额管理服务对齐
2. **短期**: 完善类型定义
3. **中期**: 全面测试所有API
4. **长期**: 建立自动对齐检查机制

---

**报告生成时间**: 2025-10-30
**检查覆盖**: Phases 1-9
**建议操作**: 立即修复配额管理服务对齐问题
