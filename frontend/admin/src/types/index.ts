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
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
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
  createdAt: string;
  updatedAt: string;
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
