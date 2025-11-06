/**
 * API响应验证Schemas
 * 使用Zod进行运行时类型验证，防止API返回异常数据导致的崩溃
 */

import { z } from 'zod';

/**
 * 通用分页响应Schema
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().optional(),
  });

/**
 * 通用成功响应Schema
 */
export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
  });

/**
 * 数组响应Schema (简化版)
 */
export const ArrayResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.array(itemSchema);

// ============ 业务实体 Schemas ============

/**
 * 用户Schema
 */
export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  role: z.string(),
  status: z.enum(['active', 'inactive', 'banned']).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * 设备Schema
 */
export const DeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['idle', 'running', 'stopped', 'error']),
  userId: z.string(),
  template: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Device = z.infer<typeof DeviceSchema>;

/**
 * Device package schema (for installed apps)
 */
export const DevicePackageSchema = z.object({
  name: z.string(),
  versionName: z.string(),
  versionCode: z.number().int().nonnegative(),
});

/**
 * 设备分组Schema
 */
export const DeviceGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  deviceCount: z.number().int().nonnegative(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
});

export type DeviceGroup = z.infer<typeof DeviceGroupSchema>;

// ApplicationSchema moved to line 1062 (more complete definition)

/**
 * 通知Schema
 */
export const NotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  type: z.string(),
  isRead: z.boolean(),
  createdAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

export type Notification = z.infer<typeof NotificationSchema>;

/**
 * API密钥Schema
 */
export const ApiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  scopes: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  lastUsedAt: z.string().datetime().nullable().optional(),
  isRevoked: z.boolean().optional(),
  createdAt: z.string().datetime().optional(),
});

export type ApiKey = z.infer<typeof ApiKeySchema>;

// AppReviewRecordSchema moved to line 1091 (more complete definition)

// PaymentDetailSchema moved to line 1088 (more complete definition)
// RefundSchema alias moved after PaymentDetailSchema definition

/**
 * 审计日志Schema
 */
export const AuditLogSchema = z.object({
  id: z.string(),
  user: UserSchema.optional(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().optional(),
  method: z.string(),
  path: z.string(),
  ip: z.string(),
  responseStatus: z.number().optional(),
  duration: z.number().optional(),
  createdAt: z.string().datetime(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

/**
 * 支付方法统计Schema
 */
export const PaymentMethodStatSchema = z.object({
  method: z.string(),
  count: z.number().int().nonnegative(),
  totalAmount: z.number().nonnegative(),
});

export type PaymentMethodStat = z.infer<typeof PaymentMethodStatSchema>;

/**
 * 每日统计Schema
 */
export const DailyStatSchema = z.object({
  date: z.string(),
  count: z.number().int().nonnegative(),
  amount: z.number().nonnegative().optional(),
});

export type DailyStat = z.infer<typeof DailyStatSchema>;

/**
 * Dashboard统计Schema
 */
export const DashboardStatsSchema = z.object({
  totalDevices: z.number().int().nonnegative(),
  onlineDevices: z.number().int().nonnegative(),
  totalUsers: z.number().int().nonnegative(),
  totalApps: z.number().int().nonnegative(),
  todayRevenue: z.number().nonnegative(),
  monthRevenue: z.number().nonnegative(),
  todayOrders: z.number().int().nonnegative(),
  monthOrders: z.number().int().nonnegative(),
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

/**
 * 设备状态统计Schema
 */
export const DeviceStatusItemSchema = z.object({
  status: z.string(),
  count: z.number().int().nonnegative(),
});

export type DeviceStatusItem = z.infer<typeof DeviceStatusItemSchema>;

/**
 * 用户增长数据Schema (复用 DailyStatSchema)
 */
export const UserGrowthItemSchema = DailyStatSchema;

/**
 * 套餐分布数据Schema
 */
export const PlanDistributionItemSchema = z.object({
  name: z.string(),
  value: z.number().int().nonnegative(),
});

export type PlanDistributionItem = z.infer<typeof PlanDistributionItemSchema>;

/**
 * 图表数据组合Schema
 */
export const ChartDataResponseSchema = z.object({
  revenueData: z.array(DailyStatSchema),
  deviceStatusData: z.array(DeviceStatusItemSchema),
  userGrowthData: z.array(UserGrowthItemSchema),
  planDistributionData: z.array(PlanDistributionItemSchema),
});

export type ChartDataResponse = z.infer<typeof ChartDataResponseSchema>;

/**
 * 队列Schema
 */
export const QueueSchema = z.object({
  name: z.string(),
  waiting: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  delayed: z.number().int().nonnegative().optional(),
});

export type Queue = z.infer<typeof QueueSchema>;

/**
 * 数据范围类型Schema
 */
export const ScopeTypeSchema = z.enum(['all', 'tenant', 'department', 'department_only', 'self', 'custom']);

export type ScopeType = z.infer<typeof ScopeTypeSchema>;

/**
 * 范围类型选项Schema
 */
export const ScopeTypeOptionSchema = z.object({
  value: ScopeTypeSchema,
  label: z.string(),
});

export type ScopeTypeOption = z.infer<typeof ScopeTypeOptionSchema>;

/**
 * 数据范围Schema
 */
export const DataScopeSchema = z.object({
  id: z.string(),
  roleId: z.string(),
  role: z.any().optional(), // RoleSchema - 避免循环依赖
  resourceType: z.string(),
  scopeType: ScopeTypeSchema,
  filter: z.record(z.any()).optional(),
  departmentIds: z.array(z.string()).optional(),
  includeSubDepartments: z.boolean().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
  priority: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type DataScope = z.infer<typeof DataScopeSchema>;

/**
 * 数据范围响应Schema
 */
export const DataScopesResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(DataScopeSchema),
});

/**
 * 范围类型响应Schema
 */
export const ScopeTypesResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(ScopeTypeOptionSchema),
});

/**
 * 任务Schema
 */
export const JobSchema = z.object({
  id: z.string(),
  name: z.string(),
  data: z.record(z.unknown()).optional(),
  progress: z.number().min(0).max(100).optional(),
  attempts: z.number().int().nonnegative().optional(),
  timestamp: z.number().optional(),
  finishedOn: z.number().nullable().optional(),
  failedReason: z.string().optional(),
});

export type Job = z.infer<typeof JobSchema>;

// ============ 复合响应 Schemas ============

/**
 * 分页用户响应
 */
export const PaginatedUsersResponseSchema = PaginatedResponseSchema(UserSchema);

/**
 * 分页设备响应
 */
export const PaginatedDevicesResponseSchema = PaginatedResponseSchema(DeviceSchema);

// PaginatedAppsResponseSchema moved after ApplicationSchema definition
// PaginatedAppReviewRecordsResponseSchema moved after AppReviewRecordSchema definition

/**
 * 通知列表响应
 */
export const NotificationsResponseSchema = z.object({
  data: z.array(NotificationSchema),
  total: z.number().int().nonnegative(),
});

/**
 * API密钥列表响应
 */
export const ApiKeysResponseSchema = SuccessResponseSchema(z.array(ApiKeySchema));

// RefundsArraySchema moved after RefundSchema definition

/**
 * 审计日志响应
 */
export const AuditLogsResponseSchema = z.object({
  data: z.array(AuditLogSchema),
  total: z.number().int().nonnegative(),
});

/**
 * 队列状态响应
 */
export const QueuesStatusResponseSchema = z.object({
  queues: z.array(QueueSchema),
  summary: z
    .object({
      totalQueues: z.number().int().nonnegative(),
      totalWaiting: z.number().int().nonnegative(),
      totalActive: z.number().int().nonnegative(),
      totalCompleted: z.number().int().nonnegative(),
      totalFailed: z.number().int().nonnegative(),
    })
    .optional(),
});

/**
 * 队列任务响应
 */
export const QueueJobsResponseSchema = z.object({
  jobs: z.array(JobSchema),
  total: z.number().int().nonnegative().optional(),
});

/**
 * 队列任务详情Schema
 */
export const QueueJobDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  data: z.any(),
  opts: z.any(),
  progress: z.number().nonnegative(),
  delay: z.number().nonnegative(),
  timestamp: z.number().nonnegative(),
  attemptsMade: z.number().int().nonnegative(),
  failedReason: z.string().optional(),
  stacktrace: z.array(z.string()).optional(),
  returnvalue: z.any().optional(),
  finishedOn: z.number().nonnegative().optional(),
  processedOn: z.number().nonnegative().optional(),
  error: z.string().optional(),
});

/**
 * GPU设备Schema
 */
export const GPUDeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: z.string(),
  vendor: z.string(),
  driverVersion: z.string(),
  cudaVersion: z.string().optional(),
  totalMemoryMB: z.number().nonnegative(),
  status: z.enum(['online', 'offline', 'error']),
  nodeId: z.string(),
  nodeName: z.string(),
  temperature: z.number().nonnegative().optional(),
  powerUsage: z.number().nonnegative().optional(),
  powerLimit: z.number().nonnegative().optional(),
  fanSpeed: z.number().nonnegative().optional(),
  utilizationRate: z.number().nonnegative(),
  memoryUsed: z.number().nonnegative(),
  allocatedTo: z.string().optional(),
  allocationMode: z.enum(['exclusive', 'shared', 'available']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * GPU统计Schema
 */
export const GPUStatsSchema = z.object({
  totalGPUs: z.number().int().nonnegative(),
  onlineGPUs: z.number().int().nonnegative(),
  offlineGPUs: z.number().int().nonnegative(),
  avgUtilization: z.number().nonnegative(),
  avgTemperature: z.number().nonnegative(),
  totalMemoryMB: z.number().nonnegative(),
  usedMemoryMB: z.number().nonnegative(),
  allocations: z.number().int().nonnegative(),
});

/**
 * GPU分配Schema
 */
export const GPUAllocationSchema = z.object({
  id: z.string(),
  gpuId: z.string(),
  deviceId: z.string(),
  userId: z.string(),
  allocatedAt: z.string(),
  releasedAt: z.string().optional(),
  status: z.enum(['active', 'released']),
  usageStats: z.object({
    avgUtilization: z.number().nonnegative(),
    peakUtilization: z.number().nonnegative(),
    avgMemoryUsage: z.number().nonnegative(),
    peakMemoryUsage: z.number().nonnegative(),
  }).optional(),
});

/**
 * GPU设备响应Schema
 */
export const GPUDevicesResponseSchema = z.object({
  data: z.array(GPUDeviceSchema),
  total: z.number().int().nonnegative().optional(),
});

/**
 * GPU分配响应Schema
 */
export const GPUAllocationsResponseSchema = z.object({
  data: z.array(GPUAllocationSchema),
  total: z.number().int().nonnegative().optional(),
});

/**
 * 字段权限Schema
 */
export const FieldPermissionSchema = z.object({
  id: z.string(),
  roleId: z.string(),
  role: z.any().optional(),
  resourceType: z.string(),
  operation: z.enum(['create', 'read', 'update', 'delete', 'export', 'import']),
  hiddenFields: z.array(z.string()).optional(),
  readOnlyFields: z.array(z.string()).optional(),
  writableFields: z.array(z.string()).optional(),
  requiredFields: z.array(z.string()).optional(),
  fieldAccessMap: z.record(z.string()).optional(),
  fieldTransforms: z.record(z.object({
    type: z.enum(['mask', 'hash', 'encrypt', 'truncate']),
    config: z.record(z.any()).optional(),
  })).optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
  priority: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * 字段访问级别选项Schema
 */
export const FieldAccessLevelOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

/**
 * 操作类型选项Schema
 */
export const OperationTypeOptionSchema = z.object({
  value: z.enum(['create', 'read', 'update', 'delete', 'export', 'import']),
  label: z.string(),
});

/**
 * 字段权限响应Schema (带 success 包装)
 */
export const FieldPermissionsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(FieldPermissionSchema),
});

/**
 * 单个字段权限响应Schema
 */
export const FieldPermissionDetailResponseSchema = z.object({
  success: z.boolean(),
  data: FieldPermissionSchema,
});

/**
 * 访问级别响应Schema
 */
export const AccessLevelsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(FieldAccessLevelOptionSchema),
});

/**
 * 操作类型响应Schema
 */
export const OperationTypesResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(OperationTypeOptionSchema),
});

// UsageRecordSchema moved to line 1432 (more complete definition)

// AdminUsageRecordsResponseSchema moved after UsageRecordSchema definition

/**
 * 使用统计Schema
 */
export const AdminUsageStatsSchema = z.object({
  totalDuration: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  activeUsers: z.number().int().nonnegative(),
  activeDevices: z.number().int().nonnegative(),
  avgDuration: z.number().nonnegative(),
  totalRecords: z.number().int().nonnegative(),
});

/**
 * 管理员使用统计响应Schema
 */
export const AdminUsageStatsResponseSchema = z.object({
  data: AdminUsageStatsSchema,
});

/**
 * 支付统计响应
 */
export const PaymentStatsResponseSchema = z.object({
  methodStats: z.array(PaymentMethodStatSchema),
  dailyStats: z.array(DailyStatSchema),
});

// ========================================
// Device Template Schemas
// ========================================

/**
 * 设备模板 Schema
 */
export const DeviceTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  isPublic: z.boolean(),
  androidVersion: z.string(),
  cpuCores: z.number().int().positive(),
  memoryMB: z.number().int().positive(),
  storageMB: z.number().int().positive(),
  preInstalledApps: z.array(z.string()).optional(),
  config: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  usageCount: z.number().int().nonnegative(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type DeviceTemplate = z.infer<typeof DeviceTemplateSchema>;

/**
 * 分页模板响应
 */
export const PaginatedTemplatesResponseSchema = PaginatedResponseSchema(DeviceTemplateSchema);

/**
 * 模板统计数据 Schema
 */
export const TemplateStatsSchema = z.object({
  totalTemplates: z.number().int().nonnegative(),
  publicTemplates: z.number().int().nonnegative(),
  privateTemplates: z.number().int().nonnegative(),
  totalUsage: z.number().int().nonnegative(),
  avgUsagePerTemplate: z.number().nonnegative(),
  popularCategories: z.array(
    z.object({
      category: z.string(),
      count: z.number().int().nonnegative(),
    })
  ).optional(),
});

export type TemplateStats = z.infer<typeof TemplateStatsSchema>;

// ========================================
// Menu Permission Schemas
// ========================================

export const MenuItemSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    path: z.string(),
    icon: z.string().optional(),
    component: z.string().optional(),
    permission: z.string().optional(),
    children: z.array(MenuItemSchema).optional(),
    meta: z.record(z.any()).optional(),
  })
);

export const MenuCacheStatsSchema = z.object({
  totalCached: z.number().int().nonnegative(),
  activeUsers: z.number().int().nonnegative(),
  hitRate: z.number().nonnegative(),
  missRate: z.number().nonnegative(),
  avgLoadTime: z.number().nonnegative(),
  cacheSize: z.number().int().nonnegative(),
  lastClearTime: z.string().optional(),
  uptime: z.number().nonnegative(),
});

// ========================================
// Scheduler Schemas
// ========================================

export const SchedulerNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  host: z.string(),
  port: z.number().int(),
  status: z.enum(['active', 'inactive', 'maintenance', 'draining']),
  region: z.string().optional(),
  zone: z.string().optional(),
  capacity: z.object({
    cpu: z.number().int(),
    memory: z.number().int(),
    storage: z.number().int(),
    maxDevices: z.number().int(),
  }),
  usage: z.object({
    cpu: z.number().int(),
    memory: z.number().int(),
    storage: z.number().int(),
    deviceCount: z.number().int(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ClusterStatsSchema = z.object({
  totalNodes: z.number().int().nonnegative(),
  activeNodes: z.number().int().nonnegative(),
  totalCapacity: z.object({
    cpu: z.number().int(),
    memory: z.number().int(),
    storage: z.number().int(),
  }),
  totalUsage: z.object({
    cpu: z.number().int(),
    memory: z.number().int(),
    storage: z.number().int(),
  }),
  utilizationRate: z.object({
    cpu: z.number(),
    memory: z.number(),
    storage: z.number(),
  }),
});

export const SchedulingStrategySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  config: z.record(z.any()).optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});

export const SchedulingTaskSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  deviceId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  priority: z.number().int(),
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

// ===== Report Analytics Schemas =====

// RevenueStatsSchema moved to line 1421 (more complete definition)

/**
 * Device statistics schema for analytics
 */
export const DeviceStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  running: z.number().int().nonnegative(),
  idle: z.number().int().nonnegative(),
  stopped: z.number().int().nonnegative(),
});

// ===== Lifecycle Management Schemas =====

/**
 * Lifecycle rule schema
 */
export const LifecycleRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['cleanup', 'autoscaling', 'backup', 'expiration-warning']),
  enabled: z.boolean(),
  priority: z.number().int(),
  schedule: z.string().optional(), // Cron expression
  config: z.record(z.any()),
  lastExecutedAt: z.string().optional(),
  nextExecutionAt: z.string().optional(),
  executionCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Lifecycle execution history schema
 */
export const LifecycleExecutionHistorySchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  ruleName: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  status: z.enum(['running', 'success', 'failed', 'partial']),
  affectedDevices: z.number().int().nonnegative(),
  details: z.object({
    succeeded: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    errors: z.array(z.string()).optional(),
  }).optional(),
  executedBy: z.enum(['system', 'manual']).optional(),
  triggeredBy: z.string().optional(),
});

/**
 * Lifecycle statistics schema
 */
export const LifecycleStatsSchema = z.object({
  totalRules: z.number().int().nonnegative(),
  activeRules: z.number().int().nonnegative(),
  inactiveRules: z.number().int().nonnegative(),
  totalExecutions: z.number().int().nonnegative(),
  successRate: z.number().nonnegative(),
  lastExecutionTime: z.string().optional(),
});

/**
 * Lifecycle rule template schema
 */
export const LifecycleRuleTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['cleanup', 'autoscaling', 'backup', 'expiration-warning']),
  defaultConfig: z.record(z.any()),
  recommended: z.boolean().optional(),
});

export const PaginatedLifecycleRulesResponseSchema = PaginatedResponseSchema(LifecycleRuleSchema);
export const PaginatedLifecycleHistoryResponseSchema = PaginatedResponseSchema(LifecycleExecutionHistorySchema);

// ===== Event Sourcing Schemas =====

/**
 * User event schema for event sourcing
 */
export const UserEventSchema = z.object({
  id: z.string(),
  aggregateId: z.string(), // 用户ID
  eventType: z.string(),
  version: z.number().int().nonnegative(),
  createdAt: z.string(),
  eventData: z.any(),
});

/**
 * Event history schema
 */
export const EventHistorySchema = z.object({
  userId: z.string(),
  events: z.array(UserEventSchema),
  totalEvents: z.number().int().nonnegative(),
  currentVersion: z.number().int().nonnegative(),
});

/**
 * Event statistics schema
 */
export const EventStatsSchema = z.object({
  totalEvents: z.number().int().nonnegative(),
  eventsByType: z.record(z.number().int().nonnegative()),
});

/**
 * Wrapped API response schemas for event sourcing
 */
export const EventStatsResponseSchema = z.object({
  success: z.boolean(),
  data: EventStatsSchema,
});

export const RecentEventsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(UserEventSchema),
});

export const EventHistoryResponseSchema = z.object({
  success: z.boolean(),
  data: EventHistorySchema,
});

// ===== Notification Template Schemas =====

/**
 * Notification template schema
 */
export const NotificationTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['email', 'sms', 'websocket']),
  subject: z.string().optional(), // 仅邮件
  content: z.string(),
  contentType: z.enum(['plain', 'html', 'markdown']),
  variables: z.array(z.string()), // 可用变量列表
  isActive: z.boolean(),
  language: z.string(), // 语言代码
  category: z.string().optional(),
  version: z.number().int().nonnegative(),
  createdBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Notification template version schema
 */
export const NotificationTemplateVersionSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  version: z.number().int().nonnegative(),
  content: z.string(),
  subject: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string(),
  changeNote: z.string().optional(),
});

export const PaginatedNotificationTemplatesResponseSchema = PaginatedResponseSchema(NotificationTemplateSchema);

// ===== Metering Schemas =====

/**
 * Metering overview schema
 */
export const MeteringOverviewSchema = z.object({
  totalUsers: z.number().int().nonnegative(),
  activeUsers: z.number().int().nonnegative(),
  totalDevices: z.number().int().nonnegative(),
  totalHours: z.number().nonnegative(),
  cpuUsage: z.number().nonnegative(),
  memoryUsage: z.number().nonnegative(),
  storageUsage: z.number().nonnegative(),
});

/**
 * User metering schema
 */
export const UserMeteringSchema = z.object({
  userId: z.string(),
  username: z.string(),
  deviceCount: z.number().int().nonnegative(),
  totalHours: z.number().nonnegative(),
  cpuHours: z.number().nonnegative(),
  memoryMB: z.number().nonnegative(),
  storageMB: z.number().nonnegative(),
  cost: z.number().nonnegative(),
});

/**
 * Device metering schema
 */
export const DeviceMeteringSchema = z.object({
  deviceId: z.string(),
  deviceName: z.string(),
  userId: z.string(),
  hours: z.number().nonnegative(),
  cpuUsage: z.number().nonnegative(),
  memoryUsage: z.number().nonnegative(),
  storageUsage: z.number().nonnegative(),
  cost: z.number().nonnegative(),
});

// ========================================
// Provider Health Schemas
// ========================================

/**
 * Provider Health Data Schema
 */
export const ProviderHealthDataSchema = z.object({
  provider: z.enum(['docker', 'huawei', 'aliyun', 'physical']),
  healthy: z.boolean(),
  message: z.string().optional(),
  lastCheck: z.string(),
});

/**
 * Provider Health Response Schema
 */
export const ProviderHealthResponseSchema = z.object({
  data: z.array(ProviderHealthDataSchema),
});

// ========================================
// Application Review Schemas
// ========================================

/**
 * Application Schema (App Detail)
 */
export const ApplicationSchema = z.object({
  id: z.string(),
  name: z.string(),
  packageName: z.string(),
  versionName: z.string(),
  versionCode: z.number().int(),
  size: z.number().nonnegative(),
  iconUrl: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  uploadedBy: z.string(),
  objectKey: z.string(),
  apkPath: z.string().optional(),
  version: z.string().optional(),
  minSdkVersion: z.number().int().optional(),
  targetSdkVersion: z.number().int().optional(),
  permissions: z.array(z.string()).optional(),
  reviewStatus: z.enum(['pending', 'approved', 'rejected', 'changes_requested']).optional(),
  reviewComment: z.string().optional(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Application = z.infer<typeof ApplicationSchema>;

/**
 * 分页应用响应
 */
export const PaginatedAppsResponseSchema = PaginatedResponseSchema(ApplicationSchema);

/**
 * App Review Record Schema
 */
export const AppReviewRecordSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  application: ApplicationSchema.optional(),
  action: z.enum(['submit', 'approve', 'reject', 'request_changes']),
  status: z.enum(['pending', 'approved', 'rejected', 'changes_requested']),
  comment: z.string().optional(),
  reviewedBy: z.string().optional(),
  reviewer: z.any().optional(), // User object
  reviewerName: z.string().optional(),
  createdAt: z.string(),
});

export type AppReviewRecord = z.infer<typeof AppReviewRecordSchema>;

/**
 * 分页应用审核记录响应
 */
export const PaginatedAppReviewRecordsResponseSchema = PaginatedResponseSchema(AppReviewRecordSchema);

/**
 * App Review History Response Schema
 */
export const AppReviewHistoryResponseSchema = z.array(AppReviewRecordSchema);

// ========================================
// API Key Statistics Schemas
// ========================================

/**
 * API Key Statistics Schema
 */
export const ApiKeyStatisticsSchema = z.object({
  total: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  revoked: z.number().int().nonnegative(),
  expired: z.number().int().nonnegative(),
  totalUsage: z.number().int().nonnegative(),
  byStatus: z.object({
    active: z.number().int().nonnegative(),
    revoked: z.number().int().nonnegative(),
    expired: z.number().int().nonnegative(),
  }),
});

/**
 * API Key Statistics Response Schema
 */
export const ApiKeyStatisticsResponseSchema = z.object({
  success: z.boolean(),
  data: ApiKeyStatisticsSchema,
});

// ========================================
// Cache Management Schemas
// ========================================

/**
 * Cache Stats Schema
 */
export const CacheStatsSchema = z.object({
  l1Hits: z.number().int().nonnegative(),
  l2Hits: z.number().int().nonnegative(),
  misses: z.number().int().nonnegative(),
  totalRequests: z.number().int().nonnegative(),
  hitRate: z.number().nonnegative(),
  missRate: z.number().nonnegative(),
  l1Size: z.number().int().nonnegative(),
  l2Size: z.number().int().nonnegative(),
});

/**
 * Cache Stats Response Schema
 */
export const CacheStatsResponseSchema = z.object({
  success: z.boolean(),
  data: CacheStatsSchema,
});

// ========================================
// Payment Management Schemas
// ========================================

/**
 * Payment Detail Schema
 */
export const PaymentDetailSchema = z.object({
  id: z.string(),
  paymentNo: z.string(),
  orderId: z.string(),
  userId: z.string(),
  amount: z.number().nonnegative(),
  currency: z.string(),
  method: z.string(),
  status: z.string(),
  transactionId: z.string().optional(),
  customerId: z.string().optional(),
  paymentUrl: z.string().optional(),
  clientSecret: z.string().optional(),
  metadata: z.any().optional(),
  paidAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  order: z.any().optional(),
});

export type PaymentDetail = z.infer<typeof PaymentDetailSchema>;

// 兼容旧名称
export const RefundSchema = PaymentDetailSchema;
export type Refund = PaymentDetail;

/**
 * 退款列表响应
 */
export const RefundsArraySchema = z.array(RefundSchema);

/**
 * Exception Payments Response Schema
 */
export const ExceptionPaymentsResponseSchema = z.object({
  data: z.array(PaymentDetailSchema),
  pagination: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().optional(),
  }).optional(),
});

// ========================================
// Network Policy Schemas
// ========================================

/**
 * Network Policy Schema
 */
export const NetworkPolicySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  direction: z.string(),
  protocol: z.string().optional(),
  sourceIp: z.string().optional(),
  destIp: z.string().optional(),
  destPort: z.string().optional(),
  action: z.string(),
  priority: z.number().int(),
  isEnabled: z.boolean(),
  bandwidthLimit: z.number().nonnegative().optional(),
  createdAt: z.string(),
});

/**
 * Network Policies Response Schema
 */
export const NetworkPoliciesResponseSchema = z.array(NetworkPolicySchema);

/**
 * Billing Rule Schema
 */
export const BillingRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['time-based', 'usage-based', 'tiered', 'custom']),
  formula: z.string(),
  parameters: z.record(z.any()),
  isActive: z.boolean(),
  priority: z.number().int(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  createdBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Billing Rules Response Schema
 */
export const BillingRulesResponseSchema = z.object({
  data: z.array(BillingRuleSchema),
  total: z.number().int().nonnegative(),
});

/**
 * Billing Rule Template Schema
 */
export const BillingRuleTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['time-based', 'usage-based', 'tiered', 'custom']),
  formula: z.string(),
  defaultParameters: z.record(z.any()),
  category: z.string().optional(),
});

/**
 * Billing Rule Templates Response Schema
 */
export const BillingRuleTemplatesResponseSchema = z.array(BillingRuleTemplateSchema);

/**
 * Payment Config Schema
 */
export const PaymentConfigSchema = z.object({
  enabledMethods: z.array(z.string()),
  enabledCurrencies: z.array(z.string()),
  providers: z.record(
    z.object({
      enabled: z.boolean(),
      mode: z.string(),
      connected: z.object({
        success: z.boolean(),
        message: z.string(),
      }),
    })
  ),
});

/**
 * Physical Device Schema
 */
export const PhysicalDeviceSchema = z.object({
  id: z.string(),
  serialNumber: z.string(),
  name: z.string(),
  status: z.enum(['online', 'offline', 'unregistered']),
  model: z.string().optional(),
  manufacturer: z.string().optional(),
  androidVersion: z.string().optional(),
  connectionType: z.enum(['usb', 'network']),
  ipAddress: z.string().optional(),
  adbPort: z.number().int().optional(),
  lastSeenAt: z.string().optional(),
  assignedUserId: z.string().optional(),
  assignedUser: z.any().optional(), // User type is complex, use any for now
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Physical Devices Response Schema
 */
export const PhysicalDevicesResponseSchema = z.object({
  data: z.array(PhysicalDeviceSchema),
  total: z.number().int().nonnegative(),
});

/**
 * Quota Limits Schema
 */
export const QuotaLimitsSchema = z.object({
  maxDevices: z.number().int().nonnegative(),
  maxCpuCores: z.number().int().nonnegative(),
  maxMemoryGB: z.number().int().nonnegative(),
  maxStorageGB: z.number().int().nonnegative(),
  maxBandwidthMbps: z.number().nonnegative().optional(),
  maxMonthlyTrafficGB: z.number().nonnegative().optional(),
  maxDailyUsageHours: z.number().nonnegative().optional(),
  maxMonthlyUsageHours: z.number().nonnegative().optional(),
});

/**
 * Quota Usage Schema
 */
export const QuotaUsageSchema = z.object({
  devices: z.number().int().nonnegative(),
  cpuCores: z.number().int().nonnegative(),
  memoryGB: z.number().int().nonnegative(),
  storageGB: z.number().int().nonnegative(),
  bandwidthMbps: z.number().nonnegative().optional(),
  monthlyTrafficGB: z.number().nonnegative().optional(),
  dailyUsageHours: z.number().nonnegative().optional(),
  monthlyUsageHours: z.number().nonnegative().optional(),
});

/**
 * Quota Schema
 */
export const QuotaSchema = z.object({
  id: z.string(),
  userId: z.string(),
  user: z.any().optional(),
  planId: z.string().optional(),
  planName: z.string().optional(),
  status: z.enum(['active', 'suspended', 'expired', 'pending']),
  limits: QuotaLimitsSchema,
  usage: QuotaUsageSchema,
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  autoRenew: z.boolean(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Quota Statistics Schema
 */
export const QuotaStatisticsSchema = z.object({
  userId: z.string(),
  quota: QuotaSchema,
  currentUsage: z
    .object({
      devices: z.number().int().nonnegative(),
      cpuCores: z.number().int().nonnegative(),
      memoryGB: z.number().int().nonnegative(),
      storageGB: z.number().int().nonnegative(),
      bandwidth: z.number().nonnegative().optional(),
      monthlyTrafficGB: z.number().nonnegative().optional(),
    })
    .optional(),
  usagePercentages: z.object({
    devices: z.number().nonnegative(),
    cpu: z.number().nonnegative(),
    memory: z.number().nonnegative(),
    storage: z.number().nonnegative(),
    bandwidth: z.number().nonnegative(),
    monthlyTraffic: z.number().nonnegative(),
    dailyUsageHours: z.number().nonnegative(),
    monthlyUsageHours: z.number().nonnegative(),
  }),
  trends: z.object({
    deviceUsageTrend: z.enum(['increasing', 'stable', 'decreasing']),
    resourceUsageTrend: z.enum(['increasing', 'stable', 'decreasing']),
  }),
  predictions: z.object({
    daysUntilDeviceLimit: z.number().int().optional(),
    daysUntilResourceLimit: z.number().int().optional(),
  }),
  dailyUsage: z
    .array(
      z.object({
        date: z.string(),
        devices: z.number().int().nonnegative(),
        cpuCores: z.number().int().nonnegative(),
        memoryGB: z.number().int().nonnegative(),
        storageGB: z.number().int().nonnegative(),
      })
    )
    .optional(),
});

/**
 * Quota Statistics Response Schema
 */
export const QuotaStatisticsResponseSchema = z.object({
  success: z.boolean(),
  data: QuotaStatisticsSchema.optional(),
});

/**
 * Quota Alert Schema
 */
export const QuotaAlertSchema = z.object({
  id: z.string(),
  userId: z.string(),
  user: z.any().optional(),
  quotaType: z.enum(['device', 'cpu', 'memory', 'storage', 'bandwidth', 'duration']),
  usagePercent: z.number().nonnegative(),
  current: z.number().nonnegative(),
  limit: z.number().nonnegative(),
  threshold: z.number().nonnegative(),
  severity: z.enum(['warning', 'critical']),
  message: z.string(),
  createdAt: z.string().optional(),
});

/**
 * Quota Alerts Response Schema
 */
export const QuotaAlertsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(QuotaAlertSchema).optional(),
});

/**
 * Daily Stats Schema
 */
export const DailyStatsSchema = z.object({
  date: z.string(),
  revenue: z.number().nonnegative(),
  orders: z.number().int().nonnegative(),
});

/**
 * Plan Stats Schema
 */
export const PlanStatsSchema = z.object({
  planId: z.string(),
  planName: z.string(),
  revenue: z.number().nonnegative(),
  orders: z.number().int().nonnegative(),
});

/**
 * Revenue Stats Schema
 */
export const RevenueStatsSchema = z.object({
  totalRevenue: z.number().nonnegative(),
  totalOrders: z.number().int().nonnegative(),
  avgOrderValue: z.number().nonnegative(),
  dailyStats: z.array(DailyStatsSchema),
  planStats: z.array(PlanStatsSchema),
});

export type RevenueStats = z.infer<typeof RevenueStatsSchema>;

/**
 * Usage Record Schema
 */
export const UsageRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  deviceId: z.string(),
  device: z.any().optional(), // Device type is complex
  startTime: z.string(),
  endTime: z.string().optional(),
  duration: z.number().nonnegative(),
  cpuUsage: z.number().nonnegative().optional(),
  memoryUsage: z.number().nonnegative().optional(),
  storageUsage: z.number().nonnegative().optional(),
  networkUsage: z.number().nonnegative().optional(),
  cost: z.union([z.string(), z.number()]), // PostgreSQL numeric serializes as string
  createdAt: z.string(),
});

export type UsageRecord = z.infer<typeof UsageRecordSchema>;

/**
 * 管理员使用记录响应Schema
 */
export const AdminUsageRecordsResponseSchema = z.object({
  data: z.object({
    data: z.array(UsageRecordSchema),
    total: z.number().int().nonnegative(),
  }),
});

/**
 * Usage Records Response Schema
 */
export const UsageRecordsResponseSchema = z.object({
  data: z.array(UsageRecordSchema),
  total: z.number().int().nonnegative(),
});

/**
 * Webhook Log Schema
 */
export const WebhookLogSchema = z.object({
  id: z.string(),
  provider: z.string(),
  event: z.string(),
  status: z.enum(['success', 'failed', 'pending']),
  requestBody: z.any(),
  responseBody: z.any().optional(),
  errorMessage: z.string().optional(),
  retryCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  processedAt: z.string().optional(),
});

/**
 * Webhook Logs Response Schema
 */
export const WebhookLogsResponseSchema = z.object({
  data: z.object({
    data: z.array(WebhookLogSchema),
    pagination: z
      .object({
        total: z.number().int().nonnegative(),
        page: z.number().int().positive().optional(),
        limit: z.number().int().positive().optional(),
      })
      .optional(),
  }),
});

/**
 * Two Factor Secret Schema
 */
export const TwoFactorSecretSchema = z.object({
  secret: z.string(),
  qrCode: z.string(),
  otpauthUrl: z.string().optional(),
});
