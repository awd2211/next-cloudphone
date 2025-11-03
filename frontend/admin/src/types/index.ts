// 通用类型
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 游标分页类型
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  count: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

// 用户相关
export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  balance: number;
  roles: Role[];
  status: 'active' | 'inactive' | 'banned';
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  phone?: string;
  roleIds?: string[];
}

export interface UpdateUserDto {
  email?: string;
  phone?: string;
  status?: 'active' | 'inactive' | 'banned';
  roleIds?: string[];
}

// 设备相关
export interface Device {
  id: string;
  name: string;
  userId: string;
  user?: User;
  status: 'idle' | 'running' | 'stopped' | 'error';
  androidVersion: string;
  cpuCores: number;
  memoryMB: number;
  storageMB: number;
  ipAddress?: string;
  adbPort?: number;
  vncPort?: number;
  containerId?: string;
  createdAt: string;
  updatedAt: string;
  lastStartedAt?: string;
  lastStoppedAt?: string;
}

export interface CreateDeviceDto {
  name?: string;
  userId: string;
  androidVersion?: string;
  cpuCores?: number;
  memoryMB?: number;
  storageMB?: number;
}

export interface UpdateDeviceDto {
  name?: string;
  status?: string;
}

export interface DeviceStats {
  total: number;
  idle: number;
  running: number;
  stopped: number;
  error: number;
}

// 应用相关
export interface Application {
  id: string;
  name: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  size: number;
  iconUrl?: string;
  icon?: string; // 应用图标（别名，兼容旧代码）
  description?: string;
  category?: string;
  uploadedBy: string;
  objectKey: string;
  apkPath?: string; // APK 文件路径
  version?: string; // 版本号（可能与 versionName 重复）
  minSdkVersion?: number;
  targetSdkVersion?: number;
  permissions?: string[];
  reviewStatus?: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  reviewComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 类型别名，为了兼容性
export type App = Application;

export interface CreateAppDto {
  name: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  file: File | Blob;
  description?: string;
  category?: string;
  iconUrl?: string;
}

export interface UpdateAppDto {
  name?: string;
  description?: string;
  category?: string;
  iconUrl?: string;
  reviewStatus?: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  reviewComment?: string;
}

// 应用审核相关
export interface AppReviewRecord {
  id: string;
  applicationId: string;
  application?: Application;
  action: 'submit' | 'approve' | 'reject' | 'request_changes';
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  comment?: string;
  reviewedBy?: string;
  reviewer?: User;
  reviewerName?: string; // 审核者名称（兼容旧代码）
  createdAt: string;
}

export interface SubmitReviewDto {
  applicationId: string;
}

export interface ApproveAppDto {
  comment?: string;
}

export interface RejectAppDto {
  reason: string;
}

export interface RequestChangesDto {
  changes: string;
}

export interface DeviceApplication {
  id: string;
  deviceId: string;
  applicationId: string;
  application?: Application;
  status: 'installing' | 'installed' | 'failed' | 'uninstalling';
  installedAt?: string;
  uninstalledAt?: string;
}

export interface InstallAppDto {
  deviceId: string;
  applicationId: string;
}

// 套餐相关
export interface Plan {
  id: string;
  name: string;
  description?: string;
  type: 'monthly' | 'yearly' | 'one-time';
  price: string | number; // PostgreSQL numeric(10,2) serializes as string in JSON
  duration: number;
  deviceLimit: number;
  features?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanDto {
  name: string;
  description?: string;
  type: 'monthly' | 'yearly' | 'one-time';
  price: number;
  duration: number;
  deviceLimit: number;
  features?: Record<string, any>;
}

// 订单相关
export interface Order {
  id: string;
  orderNo: string;
  userId: string;
  user?: User;
  planId: string;
  plan?: Plan;
  amount: string | number; // PostgreSQL numeric serializes as string in JSON
  status: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'expired';
  paymentMethod?: 'wechat' | 'alipay' | 'balance';
  paidAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderDto {
  planId: string;
  userId: string;
}

// 支付相关
export interface Payment {
  id: string;
  paymentNo: string;
  orderId: string;
  order?: Order;
  amount: string | number; // PostgreSQL numeric serializes as string in JSON
  method: 'wechat' | 'alipay' | 'balance';
  status: 'pending' | 'processing' | 'success' | 'failed' | 'refunding' | 'refunded' | 'cancelled';
  transactionId?: string;
  paymentUrl?: string;
  paidAt?: string;
  refundedAt?: string;
  failedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentDto {
  orderId: string;
  method: 'wechat' | 'alipay' | 'balance';
  amount: number;
}

// 使用记录
export interface UsageRecord {
  id: string;
  userId: string;
  deviceId: string;
  device?: Device;
  startTime: string;
  endTime?: string;
  duration: number;
  cpuUsage?: number;
  memoryUsage?: number;
  storageUsage?: number;
  networkUsage?: number;
  cost: string | number; // PostgreSQL numeric serializes as string in JSON
  createdAt: string;
}

// 统计相关
export interface DashboardStats {
  totalDevices: number;
  onlineDevices: number;
  totalUsers: number;
  totalApps: number;
  todayRevenue: number;
  monthRevenue: number;
  todayOrders: number;
  monthOrders: number;
}

export interface RevenueStats {
  date: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
}

export interface UserBill {
  userId: string;
  username: string;
  email: string;
  orders: Order[];
  usageRecords: UsageRecord[];
  totalAmount: number;
  totalDuration: number;
  period: {
    start: string;
    end: string;
  };
}

// ADB 相关
export interface ShellCommandDto {
  command: string;
}

export interface ShellCommandResult {
  output: string;
  exitCode: number;
}

export interface DevicePackage {
  name: string;
  versionName: string;
  versionCode: number;
}

export interface DeviceProperties {
  [key: string]: string;
}

// 设备模板相关
export interface DeviceTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  isPublic: boolean;
  androidVersion: string;
  cpuCores: number;
  memoryMB: number;
  storageMB: number;
  preInstalledApps?: string[];
  config?: Record<string, any>;
  tags?: string[];
  usageCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
  androidVersion: string;
  cpuCores: number;
  memoryMB: number;
  storageMB: number;
  preInstalledApps?: string[];
  config?: Record<string, any>;
  tags?: string[];
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
  tags?: string[];
}

export interface CreateDeviceFromTemplateDto {
  templateId: string;
  name?: string;
  userId: string;
  count?: number;
}

// 设备快照相关
export interface DeviceSnapshot {
  id: string;
  deviceId: string;
  device?: Device;
  name: string;
  description?: string;
  size: number;
  compressed: boolean;
  status: 'creating' | 'ready' | 'restoring' | 'failed';
  storagePath: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSnapshotDto {
  deviceId: string;
  name: string;
  description?: string;
}

export interface SnapshotStats {
  totalSnapshots: number;
  totalSize: number;
  avgSize: number;
}

// 物理设备相关
export interface PhysicalDevice {
  id: string;
  serialNumber: string;
  name: string;
  status: 'online' | 'offline' | 'unregistered';
  model?: string;
  manufacturer?: string;
  androidVersion?: string;
  connectionType: 'usb' | 'network';
  ipAddress?: string;
  adbPort?: number;
  lastSeenAt?: string;
  assignedUserId?: string;
  assignedUser?: User;
  createdAt: string;
  updatedAt: string;
}

export interface ScanNetworkDto {
  subnet: string;
}

export interface RegisterPhysicalDeviceDto {
  serialNumber: string;
  name?: string;
  connectionType?: 'usb' | 'network';
  ipAddress?: string;
  adbPort?: number;
}

// 计费规则相关
export interface BillingRule {
  id: string;
  name: string;
  description?: string;
  type: 'time-based' | 'usage-based' | 'tiered' | 'custom';
  formula: string;
  parameters: Record<string, any>;
  isActive: boolean;
  priority: number;
  validFrom?: string;
  validUntil?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBillingRuleDto {
  name: string;
  description?: string;
  type: 'time-based' | 'usage-based' | 'tiered' | 'custom';
  formula: string;
  parameters: Record<string, any>;
  priority?: number;
  validFrom?: string;
  validUntil?: string;
}

export interface UpdateBillingRuleDto {
  name?: string;
  description?: string;
  formula?: string;
  parameters?: Record<string, any>;
  priority?: number;
  validFrom?: string;
  validUntil?: string;
}

export interface BillingRuleTestResult {
  success: boolean;
  cost: number;
  breakdown: {
    component: string;
    value: number;
    unit: string;
  }[];
  formula: string;
  inputs: Record<string, any>;
}

// 生命周期自动化相关
export interface LifecycleRule {
  id: string;
  name: string;
  description?: string;
  type: 'cleanup' | 'autoscaling' | 'backup' | 'expiration-warning';
  enabled: boolean;
  priority: number;
  schedule?: string; // Cron 表达式
  config: Record<string, any>;
  lastExecutedAt?: string;
  nextExecutionAt?: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLifecycleRuleDto {
  name: string;
  description?: string;
  type: 'cleanup' | 'autoscaling' | 'backup' | 'expiration-warning';
  enabled?: boolean;
  priority?: number;
  schedule?: string;
  config: Record<string, any>;
}

export interface UpdateLifecycleRuleDto {
  name?: string;
  description?: string;
  enabled?: boolean;
  priority?: number;
  schedule?: string;
  config?: Record<string, any>;
}

export interface LifecycleExecutionHistory {
  id: string;
  ruleId: string;
  ruleName: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'success' | 'failed' | 'partial';
  affectedDevices: number;
  details?: {
    succeeded: number;
    failed: number;
    skipped: number;
    errors?: string[];
  };
  executedBy?: 'system' | 'manual';
  triggeredBy?: string;
}

export interface LifecycleStats {
  totalRules: number;
  activeRules: number;
  inactiveRules: number;
  totalExecutions: number;
  successRate: number;
  lastExecutionTime?: string;
}

// GPU 资源管理相关
export interface GPUDevice {
  id: string;
  name: string;
  model: string;
  vendor: string;
  driverVersion: string;
  cudaVersion?: string;
  totalMemoryMB: number;
  status: 'online' | 'offline' | 'error';
  nodeId: string;
  nodeName: string;
  temperature?: number;
  powerUsage?: number;
  powerLimit?: number;
  fanSpeed?: number;
  utilizationRate: number;
  memoryUsed: number;
  allocatedTo?: string; // deviceId
  allocationMode: 'exclusive' | 'shared' | 'available';
  createdAt: string;
  updatedAt: string;
}

export interface GPUAllocation {
  id: string;
  gpuId: string;
  deviceId: string;
  userId: string;
  allocatedAt: string;
  releasedAt?: string;
  status: 'active' | 'released';
  usageStats?: {
    avgUtilization: number;
    peakUtilization: number;
    avgMemoryUsage: number;
    peakMemoryUsage: number;
  };
}

export interface GPUStats {
  totalGPUs: number;
  onlineGPUs: number;
  offlineGPUs: number;
  avgUtilization: number;
  avgTemperature: number;
  totalMemoryMB: number;
  usedMemoryMB: number;
  allocations: number;
}

export interface GPUUsageTrend {
  timestamp: string;
  utilization: number;
  memoryUsage: number;
  temperature: number;
  powerUsage: number;
}

// 通知模板相关
export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'email' | 'sms' | 'websocket';
  subject?: string; // 仅邮件
  content: string;
  contentType: 'plain' | 'html' | 'markdown';
  variables: string[]; // 可用变量列表
  isActive: boolean;
  language: string; // 语言代码
  category?: string;
  version: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationTemplateDto {
  name: string;
  description?: string;
  type: 'email' | 'sms' | 'websocket';
  subject?: string;
  content: string;
  contentType: 'plain' | 'html' | 'markdown';
  isActive?: boolean;
  language?: string;
  category?: string;
}

export interface UpdateNotificationTemplateDto {
  name?: string;
  description?: string;
  subject?: string;
  content?: string;
  contentType?: 'plain' | 'html' | 'markdown';
  isActive?: boolean;
  category?: string;
}

export interface NotificationTemplateVersion {
  id: string;
  templateId: string;
  version: number;
  content: string;
  subject?: string;
  createdBy: string;
  createdAt: string;
  changeNote?: string;
}

export interface TemplateTestRequest {
  templateId: string;
  recipient: string; // email or phone
  variables: Record<string, any>;
}

// 设备分组管理相关
export interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  deviceCount: number;
  tags?: string[];
  rules?: GroupRule[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupRule {
  field: string; // status, userId, tag, etc.
  operator: 'equals' | 'contains' | 'in' | 'gt' | 'lt';
  value: any;
}

export interface CreateDeviceGroupDto {
  name: string;
  description?: string;
  tags?: string[];
  rules?: GroupRule[];
}

export interface BatchOperationDto {
  operation: 'start' | 'stop' | 'restart' | 'install-app' | 'update-config';
  deviceIds?: string[];
  groupId?: string;
  params?: Record<string, any>;
}

// 网络策略配置相关
export interface NetworkPolicy {
  id: string;
  name: string;
  description?: string;
  deviceId?: string;
  groupId?: string;
  direction: 'inbound' | 'outbound' | 'both';
  protocol?: 'tcp' | 'udp' | 'icmp' | 'all';
  sourceIp?: string;
  sourcePort?: string;
  destIp?: string;
  destPort?: string;
  action: 'allow' | 'deny';
  priority: number;
  isEnabled: boolean;
  bandwidthLimit?: number; // Mbps
  createdAt: string;
  updatedAt: string;
}

export interface CreateNetworkPolicyDto {
  name: string;
  description?: string;
  deviceId?: string;
  groupId?: string;
  direction: 'inbound' | 'outbound' | 'both';
  protocol?: 'tcp' | 'udp' | 'icmp' | 'all';
  sourceIp?: string;
  sourcePort?: string;
  destIp?: string;
  destPort?: string;
  action: 'allow' | 'deny';
  priority?: number;
  bandwidthLimit?: number;
}

export interface NetworkStats {
  deviceId: string;
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  connectionsActive: number;
  bandwidthUsage: number; // Mbps
  timestamp: string;
}

// 菜单权限相关
export interface MenuItem {
  id: string;
  name: string;
  path: string;
  icon?: string;
  component?: string;
  permission?: string;
  children?: MenuItem[];
  meta?: {
    title?: string;
    requiresAuth?: boolean;
    hidden?: boolean;
    hideInMenu?: boolean;
    order?: number;
    [key: string]: any;
  };
}

export interface MenuCacheStats {
  totalCached: number;
  activeUsers: number;
  hitRate: number;
  missRate: number;
  avgLoadTime: number;
  cacheSize: number;
  lastClearTime?: string;
  uptime: number;
}

// 缓存管理相关
export interface CacheStats {
  l1Hits: number;
  l2Hits: number;
  misses: number;
  sets: number;
  totalRequests: number;
  hitRate: number;
  missRate: number;
  l1Size: number;
  l2Size: number;
  timestamp: string;
}

export interface CacheKey {
  key: string;
  value?: any;
  ttl?: number;
  createdAt?: string;
}

// 队列管理相关
export interface QueueStatus {
  name: string;
  isPaused: boolean;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
}

export interface QueueSummary {
  totalQueues: number;
  totalWaiting: number;
  totalActive: number;
  totalCompleted: number;
  totalFailed: number;
}

export interface QueueJob {
  id: string;
  name: string;
  data: any;
  progress: number;
  attemptsMade: number;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
}

export interface QueueJobDetail {
  id: string;
  name: string;
  data: any;
  opts: any;
  progress: number;
  delay: number;
  timestamp: number;
  attemptsMade: number;
  failedReason?: string;
  stacktrace?: string[];
  returnvalue?: any;
  finishedOn?: number;
  processedOn?: number;
  error?: string;
}

// 事件溯源相关
export interface UserEvent {
  id: string;
  aggregateId: string; // 用户ID
  eventType: string;
  version: number;
  createdAt: string;
  eventData: any;
}

export interface EventHistory {
  userId: string;
  events: UserEvent[];
  totalEvents: number;
  currentVersion: number;
}

export interface EventStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
}

// 数据范围权限相关
export type ScopeType = 'all' | 'tenant' | 'department' | 'department_only' | 'self' | 'custom';

export interface DataScope {
  id: string;
  roleId: string;
  role?: Role;
  resourceType: string; // 资源类型，如 'user', 'device', 'order'
  scopeType: ScopeType;
  filter?: Record<string, any>; // 自定义过滤条件
  departmentIds?: string[]; // 部门ID列表
  includeSubDepartments?: boolean; // 是否包含子部门
  description?: string;
  isActive: boolean;
  priority: number; // 优先级，数字越小优先级越高
  createdAt: string;
  updatedAt: string;
}

export interface CreateDataScopeDto {
  roleId: string;
  resourceType: string;
  scopeType: ScopeType;
  filter?: Record<string, any>;
  departmentIds?: string[];
  includeSubDepartments?: boolean;
  description?: string;
  priority?: number;
}

export interface UpdateDataScopeDto {
  scopeType?: ScopeType;
  filter?: Record<string, any>;
  departmentIds?: string[];
  includeSubDepartments?: boolean;
  description?: string;
  isActive?: boolean;
  priority?: number;
}

// ==================== Field Permission Types ====================

export type FieldAccessLevel = 'hidden' | 'read' | 'write' | 'required';

export type OperationType = 'create' | 'update' | 'view' | 'export';

export interface FieldPermission {
  id: string;
  roleId: string;
  role?: Role;
  resourceType: string;
  operation: OperationType;
  hiddenFields?: string[];
  readOnlyFields?: string[];
  writableFields?: string[];
  requiredFields?: string[];
  fieldAccessMap?: Record<string, FieldAccessLevel>;
  fieldTransforms?: Record<
    string,
    {
      type: 'mask' | 'hash' | 'encrypt' | 'truncate';
      config?: Record<string, any>;
    }
  >;
  description?: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFieldPermissionDto {
  roleId: string;
  resourceType: string;
  operation: OperationType;
  hiddenFields?: string[];
  readOnlyFields?: string[];
  writableFields?: string[];
  requiredFields?: string[];
  fieldAccessMap?: Record<string, FieldAccessLevel>;
  fieldTransforms?: Record<
    string,
    {
      type: 'mask' | 'hash' | 'encrypt' | 'truncate';
      config?: Record<string, any>;
    }
  >;
  description?: string;
  priority?: number;
}

export interface UpdateFieldPermissionDto {
  operation?: OperationType;
  hiddenFields?: string[];
  readOnlyFields?: string[];
  writableFields?: string[];
  requiredFields?: string[];
  fieldAccessMap?: Record<string, FieldAccessLevel>;
  fieldTransforms?: Record<
    string,
    {
      type: 'mask' | 'hash' | 'encrypt' | 'truncate';
      config?: Record<string, any>;
    }
  >;
  description?: string;
  isActive?: boolean;
  priority?: number;
}

// ==================== Ticket System Types ====================

export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketCategory = 'technical' | 'billing' | 'account' | 'feature_request' | 'other';

export type ReplyType = 'user' | 'staff' | 'system';

export interface TicketAttachment {
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  userId: string;
  user?: User;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  attachments?: TicketAttachment[];
  tags?: string[];
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  replyCount: number;
  lastReplyAt?: string;
  internalNotes?: string;
  rating?: number;
  feedback?: string;
  replies?: TicketReply[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketReply {
  id: string;
  ticketId: string;
  ticket?: Ticket;
  userId: string;
  user?: User;
  type: ReplyType;
  content: string;
  attachments?: TicketAttachment[];
  isInternal: boolean;
  createdAt: string;
}

export interface CreateTicketDto {
  userId: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  attachments?: TicketAttachment[];
  tags?: string[];
}

export interface UpdateTicketDto {
  subject?: string;
  description?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  status?: TicketStatus;
  assignedTo?: string;
  tags?: string[];
  internalNotes?: string;
}

export interface CreateReplyDto {
  ticketId: string;
  userId: string;
  type: ReplyType;
  content: string;
  attachments?: TicketAttachment[];
  isInternal?: boolean;
}

export interface TicketStatistics {
  total: number;
  byStatus: {
    open: number;
    in_progress: number;
    pending: number;
    resolved: number;
    closed: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  byCategory: {
    technical: number;
    billing: number;
    account: number;
    feature_request: number;
    other: number;
  };
  avgResponseTime?: number;
  avgResolutionTime?: number;
  satisfactionRate?: number;
}

// ==================== Audit Log Types ====================

export type AuditAction =
  // 用户操作
  | 'user_login'
  | 'user_logout'
  | 'user_register'
  | 'user_update'
  | 'user_delete'
  | 'password_change'
  | 'password_reset'
  // 配额操作
  | 'quota_create'
  | 'quota_update'
  | 'quota_deduct'
  | 'quota_restore'
  // 余额操作
  | 'balance_recharge'
  | 'balance_consume'
  | 'balance_adjust'
  | 'balance_freeze'
  | 'balance_unfreeze'
  // 设备操作
  | 'device_create'
  | 'device_start'
  | 'device_stop'
  | 'device_delete'
  | 'device_update'
  // 权限操作
  | 'role_assign'
  | 'role_revoke'
  | 'permission_grant'
  | 'permission_revoke'
  // 系统操作
  | 'config_update'
  | 'system_maintenance'
  // API 操作
  | 'api_key_create'
  | 'api_key_revoke';

export type AuditLevel = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLog {
  id: string;
  userId: string;
  targetUserId?: string;
  action: AuditAction;
  level: AuditLevel;
  resourceType: string;
  resourceId?: string;
  description: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

export interface AuditLogStatistics {
  total: number;
  byAction: Record<string, number>;
  byLevel: {
    info: number;
    warning: number;
    error: number;
    critical: number;
  };
  byResourceType: Record<string, number>;
  successRate: number;
  recentActivity: {
    hour: number;
    day: number;
    week: number;
  };
}

// ==================== API Key Types ====================

export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export interface ApiKey {
  id: string;
  userId: string;
  user?: User;
  name: string;
  key: string; // 哈希后的密钥
  prefix: string; // 密钥前缀 (如 cp_live_)
  status: ApiKeyStatus;
  scopes: string[]; // 权限范围 ['devices:read', 'devices:write']
  expiresAt?: string;
  lastUsedAt?: string;
  usageCount: number;
  lastUsedIp?: string;
  description?: string;
  metadata?: Record<string, any>;
  revokedAt?: string; // 撤销时间
  revokedBy?: string; // 撤销者 ID
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyDto {
  userId: string;
  name: string;
  scopes: string[];
  description?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface UpdateApiKeyDto {
  name?: string;
  scopes?: string[];
  description?: string;
  expiresAt?: string;
}

export interface ApiKeyStatistics {
  total: number;
  active: number;
  revoked: number;
  expired: number;
  totalUsage: number;
  byStatus: {
    active: number;
    revoked: number;
    expired: number;
  };
  recentUsage: {
    hour: number;
    day: number;
    week: number;
  };
  topKeys: Array<{
    id: string;
    name: string;
    usageCount: number;
  }>;
}

// ==================== Quota Management Types ====================

export type QuotaStatus = 'active' | 'exceeded' | 'suspended' | 'expired';

export type QuotaType = 'device' | 'cpu' | 'memory' | 'storage' | 'bandwidth' | 'duration';

export interface QuotaLimits {
  // 设备限制
  maxDevices: number;
  maxConcurrentDevices: number;

  // 资源限制
  maxCpuCoresPerDevice: number;
  maxMemoryMBPerDevice: number;
  maxStorageGBPerDevice: number;
  totalCpuCores: number;
  totalMemoryGB: number;
  totalStorageGB: number;

  // 带宽限制
  maxBandwidthMbps: number;
  monthlyTrafficGB: number;

  // 时长限制
  maxUsageHoursPerDay: number;
  maxUsageHoursPerMonth: number;
}

export interface QuotaUsage {
  // 设备使用量
  currentDevices: number;
  currentConcurrentDevices: number;

  // 资源使用量
  usedCpuCores: number;
  usedMemoryGB: number;
  usedStorageGB: number;

  // 带宽使用量
  currentBandwidthMbps: number;
  monthlyTrafficUsedGB: number;

  // 时长使用量
  todayUsageHours: number;
  monthlyUsageHours: number;

  // 最后更新时间
  lastUpdatedAt: string;
}

export interface Quota {
  id: string;
  userId: string;
  user?: User;
  planId?: string;
  planName?: string;
  status: QuotaStatus;
  limits: QuotaLimits;
  usage: QuotaUsage;
  validFrom?: string;
  validUntil?: string;
  autoRenew: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuotaDto {
  userId: string;
  planId?: string;
  planName?: string;
  limits: QuotaLimits;
  validFrom?: string;
  validUntil?: string;
  autoRenew?: boolean;
}

export interface UpdateQuotaDto {
  planId?: string;
  planName?: string;
  limits?: Partial<QuotaLimits>;
  validFrom?: string;
  validUntil?: string;
  autoRenew?: boolean;
  status?: QuotaStatus;
}

export interface CheckQuotaRequest {
  userId: string;
  quotaType: QuotaType;
  requestedAmount: number;
}

export interface DeductQuotaRequest {
  userId: string;
  deviceCount?: number;
  cpuCores?: number;
  memoryGB?: number;
  storageGB?: number;
  bandwidthMbps?: number;
  trafficGB?: number;
  usageHours?: number;
}

export interface RestoreQuotaRequest {
  userId: string;
  deviceCount?: number;
  cpuCores?: number;
  memoryGB?: number;
  storageGB?: number;
  bandwidthMbps?: number;
  trafficGB?: number;
  usageHours?: number;
}

export interface QuotaStatistics {
  userId: string;
  quota: Quota;
  currentUsage?: {
    devices: number;
    cpuCores: number;
    memoryGB: number;
    storageGB: number;
    bandwidth?: number;
    monthlyTrafficGB?: number;
  };
  usagePercentages: {
    devices: number;
    cpu: number;
    memory: number;
    storage: number;
    bandwidth: number;
    monthlyTraffic: number;
    dailyUsageHours: number;
    monthlyUsageHours: number;
  };
  trends: {
    deviceUsageTrend: 'increasing' | 'stable' | 'decreasing';
    resourceUsageTrend: 'increasing' | 'stable' | 'decreasing';
  };
  predictions: {
    daysUntilDeviceLimit?: number;
    daysUntilResourceLimit?: number;
  };
  dailyUsage?: Array<{
    date: string;
    devices: number;
    cpuCores: number;
    memoryGB: number;
    storageGB: number;
  }>;
}

export interface QuotaAlert {
  id: string;
  userId: string;
  user?: User;
  quotaType: QuotaType;
  usagePercent: number;
  current: number;
  limit: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
  createdAt: string;
}
