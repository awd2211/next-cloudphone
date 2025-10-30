# 增强版BusinessException使用指南

## 概述

`BusinessException`已增强，支持用户友好的错误消息、恢复建议、文档链接等功能，极大提升了用户体验。

---

## 新增字段

### BusinessExceptionResponse接口

```typescript
export interface BusinessExceptionResponse {
  success: false;
  errorCode: BusinessErrorCode;
  message: string;                     // 技术消息（用于日志）
  userMessage?: string;                // ✅ NEW: 用户友好消息
  technicalMessage?: string;           // ✅ NEW: 技术详情
  requestId?: string;
  timestamp?: string;
  path?: string;
  details?: any;
  recoverySuggestions?: RecoverySuggestion[];  // ✅ NEW: 恢复建议
  documentationUrl?: string;           // ✅ NEW: 文档链接
  supportUrl?: string;                 // ✅ NEW: 支持链接
  retryable?: boolean;                 // ✅ NEW: 是否可重试
}
```

### RecoverySuggestion接口

```typescript
export interface RecoverySuggestion {
  action: string;           // 操作名称（如"升级套餐"）
  description: string;      // 操作描述
  actionUrl?: string;       // 操作链接（前端路由或外部URL）
}
```

---

## 使用方式

### 方式1：使用增强的工厂方法（推荐）

`BusinessErrors`类的工厂方法已更新，自动包含友好消息和恢复建议：

```typescript
import { BusinessErrors } from '@cloudphone/shared';

// 1. 配额超限错误
throw BusinessErrors.quotaExceeded('设备', userId);
// 前端显示:
// ✅ 用户消息: "您的设备配额已用完"
// ✅ 恢复建议:
//    • 升级套餐 → /plans/upgrade
//    • 清理资源 → /devices
//    • 联系支持 → /support/tickets/new

// 2. 设备不存在
throw BusinessErrors.deviceNotFound(deviceId);
// 前端显示:
// ✅ 用户消息: "设备不存在或已被删除"
// ✅ 恢复建议:
//    • 刷新列表 → /devices
//    • 创建新设备 → /devices/create

// 3. 余额不足
throw BusinessErrors.insufficientBalance(userId, 100, 50);
// 前端显示:
// ✅ 用户消息: "账户余额不足，无法完成操作"
// ✅ 恢复建议:
//    • 立即充值 → /billing/recharge
//    • 查看账单 → /billing/invoices
//    • 联系客服 → /support

// 4. 服务不可用
throw BusinessErrors.serviceUnavailable('Docker', '5分钟后');
// 前端显示:
// ✅ 用户消息: "Docker服务暂时不可用，请稍后重试"
// ✅ 可重试: true
// ✅ 恢复建议:
//    • 稍后重试
//    • 查看状态页 → /system/status
//    • 联系技术支持 → /support/tickets/new
```

### 方式2：自定义BusinessException

对于需要定制化的错误，直接使用`BusinessException`构造函数：

```typescript
import { BusinessException, BusinessErrorCode } from '@cloudphone/shared';
import { HttpStatus } from '@nestjs/common';

throw new BusinessException(
  BusinessErrorCode.DEVICE_START_FAILED,
  `Failed to start device ${deviceId}: ${error.message}`,  // 技术消息
  HttpStatus.INTERNAL_SERVER_ERROR,
  requestId,
  {
    // 用户友好消息
    userMessage: '设备启动失败，请稍后重试',

    // 技术详情（用于日志和调试）
    technicalMessage: `Container startup timeout for device ${deviceId} after 30s`,

    // 详细数据
    details: {
      deviceId,
      containerId: 'abc123',
      lastKnownStatus: 'starting',
      errorStack: error.stack,
    },

    // 恢复建议
    recoverySuggestions: [
      {
        action: '重新启动',
        description: '尝试重新启动设备',
        actionUrl: `/devices/${deviceId}/start`,
      },
      {
        action: '检查日志',
        description: '查看设备日志了解具体原因',
        actionUrl: `/devices/${deviceId}/logs`,
      },
      {
        action: '删除重建',
        description: '删除设备并重新创建',
        actionUrl: `/devices/${deviceId}`,
      },
    ],

    // 文档链接
    documentationUrl: 'https://docs.cloudphone.com/troubleshooting/device-start-failed',

    // 支持链接
    supportUrl: '/support/tickets/new',

    // 是否可重试
    retryable: true,
  }
);
```

### 方式3：向后兼容（旧代码仍然有效）

旧的调用方式仍然有效，但不会有增强的用户体验：

```typescript
// 旧方式（仍然有效，但userMessage会使用message）
throw new BusinessException(
  BusinessErrorCode.DEVICE_NOT_FOUND,
  `设备不存在: ${deviceId}`,
  HttpStatus.NOT_FOUND,
  requestId,
  { someDetail: 'value' }  // 这里传的是details，不是options对象
);
```

---

## 前端显示效果

### 错误通知（Notification模式）

```
❌ 您的设备配额已用完

Request ID: req_1730280000_123

[点击重试]
```

### 错误模态框（Modal模式）

```
┌─────────────────────────────────────┐
│            操作失败                  │
├─────────────────────────────────────┤
│ 您的设备配额已用完                   │
│                                     │
│ 解决方案：                           │
│ • 升级套餐: 升级到更高级的套餐以     │
│   获得更多配额 [前往 →]              │
│ • 清理资源: 删除不需要的设备以释放   │
│   配额 [前往 →]                     │
│ • 联系支持: 联系客服申请临时配额提升  │
│   [前往 →]                          │
│                                     │
│ [查看技术详情]                       │
│   {JSON格式的技术错误信息}           │
│                                     │
│ Request ID: req_1730280000_123      │
│ 错误代码: QUOTA_EXCEEDED             │
│                                     │
│ [查看文档] [联系技术支持]            │
│                                     │
│                      [重试] [我知道了]│
└─────────────────────────────────────┘
```

---

## 最佳实践

### 1. 优先使用工厂方法

```typescript
// ✅ 好 - 使用工厂方法
throw BusinessErrors.quotaExceeded('设备', userId);

// ❌ 不推荐 - 除非需要高度定制
throw new BusinessException(...);
```

### 2. 提供有用的恢复建议

```typescript
// ✅ 好 - 提供具体的操作步骤
recoverySuggestions: [
  {
    action: '立即充值',
    description: '前往充值页面为账户充值',
    actionUrl: '/billing/recharge',  // 提供跳转链接
  }
]

// ❌ 不好 - 建议太模糊
recoverySuggestions: [
  {
    action: '解决问题',
    description: '请解决问题',
  }
]
```

### 3. 区分用户消息和技术消息

```typescript
// ✅ 好
userMessage: '账户余额不足，无法完成操作',  // 用户看到的
technicalMessage: `Insufficient balance for user ${userId} (需要: ¥100, 当前: ¥50)`,  // 日志中的

// ❌ 不好 - 技术术语暴露给用户
userMessage: 'InsufficientBalanceException: balance=50, required=100',
```

### 4. 正确设置retryable标志

```typescript
// ✅ 可重试的错误
retryable: true
// 示例: 网络错误、服务不可用、超时

// ✅ 不可重试的错误
retryable: false
// 示例: 配额超限、权限不足、资源不存在
```

### 5. 提供文档和支持链接

```typescript
{
  documentationUrl: 'https://docs.cloudphone.com/quotas',  // 相关文档
  supportUrl: '/support/tickets/new',  // 创建工单
}
```

---

## 迁移现有代码

### 步骤1：找到现有的异常抛出

```bash
# 搜索项目中的异常抛出
grep -r "throw new BusinessException" backend/
grep -r "BusinessErrors\." backend/
```

### 步骤2：更新为增强版本

**示例：设备服务中的错误**

```typescript
// 旧代码
throw new BusinessException(
  BusinessErrorCode.DEVICE_START_FAILED,
  `Failed to start device: ${error.message}`,
  HttpStatus.INTERNAL_SERVER_ERROR,
);

// ↓ 更新为 ↓

// 新代码
throw new BusinessException(
  BusinessErrorCode.DEVICE_START_FAILED,
  `Failed to start device ${deviceId}: ${error.message}`,
  HttpStatus.INTERNAL_SERVER_ERROR,
  requestId,
  {
    userMessage: '设备启动失败，请稍后重试',
    technicalMessage: `Container startup failed: ${error.message}`,
    recoverySuggestions: [
      {
        action: '重新启动',
        description: '尝试重新启动设备',
        actionUrl: `/devices/${deviceId}/start`,
      },
      {
        action: '检查日志',
        description: '查看设备日志了解具体原因',
        actionUrl: `/devices/${deviceId}/logs`,
      },
    ],
    documentationUrl: 'https://docs.cloudphone.com/troubleshooting/device-start',
    retryable: true,
  }
);
```

### 步骤3：测试前端显示

启动前端和后端，触发错误，验证：
- ✅ 用户消息清晰友好
- ✅ 恢复建议显示正确
- ✅ 链接可以正常跳转
- ✅ Request ID显示
- ✅ 重试按钮有效

---

## 常见错误代码恢复建议模板

### 设备相关

```typescript
// 设备不存在
recoverySuggestions: [
  { action: '刷新列表', description: '刷新设备列表查看最新状态', actionUrl: '/devices' },
  { action: '创建新设备', description: '如果设备已删除，可以创建新设备', actionUrl: '/devices/create' },
]

// 设备不可用
recoverySuggestions: [
  { action: '稍后重试', description: '设备可能正在处理其他操作，请稍后再试' },
  { action: '查看设备详情', description: '查看设备详细状态了解具体原因', actionUrl: `/devices/${deviceId}` },
]

// 设备启动失败
recoverySuggestions: [
  { action: '重新启动', description: '尝试重新启动设备', actionUrl: `/devices/${deviceId}/start` },
  { action: '检查日志', description: '查看设备日志了解具体原因', actionUrl: `/devices/${deviceId}/logs` },
  { action: '删除重建', description: '删除设备并重新创建' },
]
```

### 配额相关

```typescript
recoverySuggestions: [
  { action: '升级套餐', description: '升级到更高级的套餐以获得更多配额', actionUrl: '/plans/upgrade' },
  { action: '清理资源', description: '删除不需要的设备以释放配额', actionUrl: '/devices' },
  { action: '联系支持', description: '联系客服申请临时配额提升', actionUrl: '/support/tickets/new' },
]
```

### 余额相关

```typescript
recoverySuggestions: [
  { action: '立即充值', description: '前往充值页面为账户充值', actionUrl: '/billing/recharge' },
  { action: '查看账单', description: '查看账单明细了解余额使用情况', actionUrl: '/billing/invoices' },
  { action: '联系客服', description: '如有疑问请联系客服', actionUrl: '/support' },
]
```

### 服务不可用

```typescript
recoverySuggestions: [
  { action: '稍后重试', description: '服务可能正在维护或重启，请稍后重试' },
  { action: '查看状态页', description: '查看系统状态页了解服务情况', actionUrl: '/system/status' },
  { action: '联系技术支持', description: '如果问题持续存在，请联系技术支持', actionUrl: '/support/tickets/new' },
]
```

---

## 总结

✅ **已增强的工厂方法**:
- `BusinessErrors.quotaExceeded()` - 配额超限
- `BusinessErrors.deviceNotFound()` - 设备不存在
- `BusinessErrors.deviceNotAvailable()` - 设备不可用
- `BusinessErrors.insufficientBalance()` - 余额不足
- `BusinessErrors.serviceUnavailable()` - 服务不可用

✅ **用户体验提升**:
- 友好的错误消息
- 操作性恢复建议
- 文档和支持链接
- 重试标识

✅ **向后兼容**:
- 旧代码无需修改仍可运行
- 逐步迁移到新格式

✅ **前端自动适配**:
- 前端已更新支持新字段
- 自动显示恢复建议
- 自动显示重试按钮

---

**更新日期**: 2025-10-30
**文档版本**: 1.0
