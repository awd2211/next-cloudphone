// 通用类型
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 用户相关
export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  balance: number;
  avatar?: string;
  status: 'active' | 'inactive' | 'banned';
  twoFactorEnabled?: boolean;
  createdAt: string;
}

export interface LoginDto {
  username: string;
  password: string;
  captcha: string;
  captchaId: string;
}

export interface CaptchaResponse {
  id: string;
  svg: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  phone?: string;
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
  features?: string[];
  isActive: boolean;
}

// 设备相关
export interface Device {
  id: string;
  name: string;
  userId: string;
  status: 'idle' | 'running' | 'stopped' | 'error';
  androidVersion: string;
  cpuCores: number;
  memoryMB: number;
  storageMB: number;
  ipAddress?: string;
  vncPort?: number;
  createdAt: string;
  lastStartedAt?: string;
  lastStoppedAt?: string;
}

// 订单相关
export interface Order {
  id: string;
  orderNo: string;
  userId: string;
  planId: string;
  plan?: Plan;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'expired';
  paymentMethod?: 'wechat' | 'alipay' | 'balance';
  paidAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface CreateOrderDto {
  planId: string;
}

// 支付相关
export interface Payment {
  id: string;
  paymentNo: string;
  orderId: string;
  order?: Order;
  amount: number;
  method: 'wechat' | 'alipay' | 'balance';
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
  paymentUrl?: string;
  qrCode?: string;
  createdAt: string;
}

export interface CreatePaymentDto {
  orderId: string;
  method: 'wechat' | 'alipay' | 'balance';
}

// 应用相关
export interface Application {
  id: string;
  name: string;
  packageName: string;
  version: string;
  category: string;
  icon?: string;
  size: number;
  description?: string;
  createdAt: string;
}
