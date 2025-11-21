/**
 * API 响应验证 Schemas
 * 使用 Zod 进行运行时类型验证，防止 API 返回异常数据导致的崩溃
 *
 * 架构说明:
 * 1. 用户端简化版本，只包含用户端需要的 schemas
 * 2. 与 Admin 端保持一致的设计模式
 */

import { z } from 'zod';

// ==================== 基础 Schema 组件 ====================

/**
 * BaseEntity Schema
 * 所有实体的基础字段 (id, createdAt, updatedAt)
 */
export const BaseEntitySchema = z.object({
  id: z.string().uuid('无效的 UUID 格式'),
  createdAt: z.string().datetime('无效的日期时间格式'),
  updatedAt: z.string().datetime('无效的日期时间格式'),
});

/**
 * Timestamps Schema
 */
export const TimestampsSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * 可选的 Timestamps Schema
 */
export const OptionalTimestampsSchema = z.object({
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// ==================== 通用验证 Schema ====================

/**
 * Email Schema
 */
export const EmailSchema = z.string().email('无效的邮箱格式');

/**
 * UUID Schema
 */
export const UUIDSchema = z.string().uuid('无效的 UUID 格式');

/**
 * 手机号 Schema (中国大陆)
 */
export const PhoneSchema = z
  .string()
  .regex(/^1[3-9]\d{9}$/, '无效的手机号格式');

/**
 * 金额 Schema
 */
export const MoneyAmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, '无效的金额格式');

/**
 * URL Schema
 */
export const URLSchema = z.string().url('无效的 URL 格式');

/**
 * 分页参数 Schema
 */
export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
});

// ==================== Schema 工具函数 ====================

/**
 * 格式化 Zod 验证错误
 */
export function formatZodError(error: z.ZodError<unknown>): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  error.issues.forEach((err: z.ZodIssue) => {
    const path = err.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(err.message);
  });

  return formatted;
}

/**
 * 安全解析 Schema
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: formatZodError(result.error),
  };
}

/**
 * 创建带 BaseEntity 的 Schema
 */
export function createEntitySchema<T extends z.ZodRawShape>(fields: T) {
  return BaseEntitySchema.extend(fields);
}

/**
 * 通用分页响应 Schema
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().optional(),
  });

/**
 * 通用成功响应 Schema
 */
export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
  });

// ==================== 用户端业务实体 Schemas ====================

/**
 * 设备状态枚举
 */
export const DeviceStatusEnum = z.enum([
  'creating',
  'running',
  'stopped',
  'starting',
  'stopping',
  'rebooting',
  'error',
  'deleted',
]);

/**
 * 设备 Schema
 */
export const DeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: DeviceStatusEnum,
  userId: z.string(),
  template: z.string().optional(),
  adbPort: z.number().int().optional(),
  webrtcPort: z.number().int().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Device = z.infer<typeof DeviceSchema>;

/**
 * 设备统计 Schema
 */
export const DeviceStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  running: z.number().int().nonnegative(),
  stopped: z.number().int().nonnegative(),
  error: z.number().int().nonnegative().optional(),
});

/**
 * 订单状态枚举
 */
export const OrderStatusEnum = z.enum([
  'pending',
  'paid',
  'cancelled',
  'refunded',
  'expired',
]);

/**
 * 订单 Schema
 */
export const OrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  planId: z.string(),
  planName: z.string().optional(),
  amount: z.number().nonnegative(),
  status: OrderStatusEnum,
  paymentMethod: z.string().optional(),
  createdAt: z.string(),
  paidAt: z.string().optional(),
  expiredAt: z.string().optional(),
});

export type Order = z.infer<typeof OrderSchema>;

/**
 * 账单 Schema
 */
export const BillSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  amount: z.number().nonnegative(),
  status: z.enum(['unpaid', 'paid', 'cancelled', 'refunding', 'refunded']),
  description: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  dueDate: z.string().optional(),
  paidAt: z.string().optional(),
  createdAt: z.string(),
});

export type Bill = z.infer<typeof BillSchema>;

/**
 * 账单统计 Schema
 */
export const BillStatsSchema = z.object({
  totalUnpaid: z.number().nonnegative(),
  totalPaid: z.number().nonnegative(),
  unpaidCount: z.number().int().nonnegative(),
  paidCount: z.number().int().nonnegative(),
});

/**
 * 余额 Schema
 */
export const BalanceSchema = z.object({
  balance: z.number().nonnegative(),
  currency: z.string().default('CNY'),
  frozenBalance: z.number().nonnegative().optional(),
});

/**
 * 支付方式 Schema
 */
export const PaymentMethodSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  enabled: z.boolean(),
  icon: z.string().optional(),
  description: z.string().optional(),
});

/**
 * 工单状态枚举
 */
export const TicketStatusEnum = z.enum([
  'open',
  'in_progress',
  'resolved',
  'closed',
]);

/**
 * 工单优先级枚举
 */
export const TicketPriorityEnum = z.enum([
  'low',
  'medium',
  'high',
  'urgent',
]);

/**
 * 工单 Schema
 */
export const TicketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: TicketStatusEnum,
  priority: TicketPriorityEnum,
  category: z.string(),
  userId: z.string(),
  assigneeId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().optional(),
});

export type Ticket = z.infer<typeof TicketSchema>;

/**
 * 工单回复 Schema
 */
export const TicketReplySchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  userId: z.string(),
  content: z.string(),
  isAdmin: z.boolean().default(false),
  attachments: z.array(z.string()).optional(),
  createdAt: z.string(),
});

/**
 * 快照 Schema
 */
export const SnapshotSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['creating', 'ready', 'restoring', 'error', 'deleting']),
  size: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export type Snapshot = z.infer<typeof SnapshotSchema>;

/**
 * 应用 Schema
 */
export const AppSchema = z.object({
  id: z.string(),
  name: z.string(),
  packageName: z.string(),
  versionName: z.string(),
  versionCode: z.number().int(),
  size: z.number().nonnegative(),
  iconUrl: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  createdAt: z.string(),
});

export type App = z.infer<typeof AppSchema>;

/**
 * 套餐 Schema
 */
export const PlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().optional(),
  duration: z.number().int().positive(), // 天数
  features: z.array(z.string()).optional(),
  maxDevices: z.number().int().positive(),
  cpuCores: z.number().int().positive(),
  memoryMB: z.number().int().positive(),
  storageMB: z.number().int().positive(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean(),
});

export type Plan = z.infer<typeof PlanSchema>;

/**
 * 通知 Schema
 */
export const NotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  type: z.enum(['system', 'billing', 'device', 'promotion', 'security']),
  isRead: z.boolean(),
  createdAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type Notification = z.infer<typeof NotificationSchema>;

/**
 * 代理 Schema
 */
export const ProxySchema = z.object({
  id: z.string(),
  host: z.string(),
  port: z.number().int(),
  protocol: z.enum(['http', 'https', 'socks5']),
  username: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['active', 'expired', 'disabled']),
  expiresAt: z.string().optional(),
  createdAt: z.string(),
});

export type Proxy = z.infer<typeof ProxySchema>;

/**
 * 短信 Schema
 */
export const SMSSchema = z.object({
  id: z.string(),
  phoneNumber: z.string(),
  content: z.string(),
  sender: z.string().optional(),
  receivedAt: z.string(),
  isRead: z.boolean(),
  deviceId: z.string().optional(),
});

export type SMS = z.infer<typeof SMSSchema>;

/**
 * 活动 Schema
 */
export const ActivitySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['discount', 'bonus', 'trial', 'referral']),
  startTime: z.string(),
  endTime: z.string(),
  rules: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean(),
});

export type Activity = z.infer<typeof ActivitySchema>;

/**
 * 优惠券 Schema
 */
export const CouponSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.enum(['discount', 'amount', 'trial']),
  value: z.number().nonnegative(),
  minAmount: z.number().nonnegative().optional(),
  status: z.enum(['unused', 'used', 'expired']),
  expiresAt: z.string(),
  createdAt: z.string(),
});

export type Coupon = z.infer<typeof CouponSchema>;

/**
 * 推荐返利 Schema
 */
export const ReferralSchema = z.object({
  id: z.string(),
  inviteCode: z.string(),
  totalReferrals: z.number().int().nonnegative(),
  totalEarnings: z.number().nonnegative(),
  pendingEarnings: z.number().nonnegative(),
  withdrawnEarnings: z.number().nonnegative(),
});

export type Referral = z.infer<typeof ReferralSchema>;

/**
 * 帮助文章 Schema
 */
export const HelpArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  category: z.string(),
  tags: z.array(z.string()).optional(),
  viewCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type HelpArticle = z.infer<typeof HelpArticleSchema>;

/**
 * 导出任务 Schema
 */
export const ExportTaskSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  fileName: z.string().optional(),
  fileUrl: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});

export type ExportTask = z.infer<typeof ExportTaskSchema>;

// ==================== 分页响应 Schemas ====================

export const PaginatedDevicesResponseSchema = PaginatedResponseSchema(DeviceSchema);
export const PaginatedOrdersResponseSchema = PaginatedResponseSchema(OrderSchema);
export const PaginatedBillsResponseSchema = PaginatedResponseSchema(BillSchema);
export const PaginatedTicketsResponseSchema = PaginatedResponseSchema(TicketSchema);
export const PaginatedSnapshotsResponseSchema = PaginatedResponseSchema(SnapshotSchema);
export const PaginatedAppsResponseSchema = PaginatedResponseSchema(AppSchema);
export const PaginatedNotificationsResponseSchema = PaginatedResponseSchema(NotificationSchema);
export const PaginatedProxiesResponseSchema = PaginatedResponseSchema(ProxySchema);
export const PaginatedSMSResponseSchema = PaginatedResponseSchema(SMSSchema);
