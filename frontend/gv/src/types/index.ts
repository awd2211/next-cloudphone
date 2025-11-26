// 设备相关类型
export interface Device {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'starting' | 'stopping' | 'error' | 'unknown';
  androidVersion: string;
  cpuCores: number;
  memoryMB: number;
  storageMB: number;
  adbHost?: string;
  adbPort?: number;
  containerIp?: string;
  proxyId?: string;
  proxyConfig?: ProxyConfig;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
  userId: string;
  tenantId: string;
}

export interface CreateDeviceDto {
  name: string;
  androidVersion?: string;
  cpuCores?: number;
  memoryMB?: number;
  storageMB?: number;
}

export interface DeviceStats {
  total: number;
  running: number;
  stopped: number;
  error: number;
}

// 代理相关类型
export interface ProxyConfig {
  id: string;
  deviceId?: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol: 'http' | 'https' | 'socks5';
  country: string;
  city?: string;
  provider: string;
  quality: number;
  latency?: number;
  status: 'available' | 'in_use' | 'unavailable';
  acquiredAt: string;
  expiresAt?: string;
}

export interface ProxyStats {
  total: number;
  active: number;
  expired: number;
  totalBandwidthUsed: number;
}

export interface AcquireProxyDto {
  country: string;
  protocol?: 'http' | 'https' | 'socks5';
  minQuality?: number;
}

// 短信验证码相关类型
export interface VerificationCode {
  id: string;
  phone: string;
  code: string;
  codeType: string;
  sender: string;
  content: string;
  receivedAt: string;
  used: boolean;
  expiresAt?: string;
}

export interface VerificationCodeQuery {
  phoneNumber: string;
  hasActive: boolean;
  type?: string;
  remainingSeconds?: number;
}

// 分页相关类型
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  tenantId: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

// 工具函数
export function getListData<T>(response: PaginatedResponse<T> | T[] | undefined): T[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  return response.data || [];
}

// 导出通知类型
export * from './notification';
