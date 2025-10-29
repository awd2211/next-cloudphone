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
  description?: string;
  category?: string;
  uploadedBy: string;
  objectKey: string;
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
  price: number;
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
  amount: number;
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
  amount: number;
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
  cost: number;
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
