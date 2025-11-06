/**
 * 代理IP相关类型定义
 */

// 代理协议类型
export type ProxyProtocol = 'http' | 'https' | 'socks5';

// 代理状态
export type ProxyStatus = 'available' | 'in_use' | 'unavailable' | 'error';

// 代理供应商
export type ProxyProvider = 'iproyal' | 'brightdata' | 'oxylabs';

// 代理记录
export interface ProxyRecord {
  id: string;
  host: string;
  port: number;
  protocol: ProxyProtocol;
  country: string;
  city?: string;
  state?: string;
  provider: ProxyProvider;
  status: ProxyStatus;
  quality: number; // 0-100
  latency: number; // 毫秒
  lastChecked: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalBandwidth: number; // MB
  costPerGB: number; // USD
  createdAt: string;
  updatedAt: string;
  userId?: string;
  deviceId?: string;
}

// 代理统计
export interface ProxyStats {
  total: number;
  available: number;
  inUse: number;
  unavailable: number;
  avgQuality: number;
  avgLatency: number;
  totalBandwidth: number;
  totalCost: number;
  byProvider: {
    provider: ProxyProvider;
    count: number;
    avgQuality: number;
  }[];
  byCountry: {
    country: string;
    count: number;
  }[];
}

// 代理搜索参数
export interface ProxySearchParams {
  status?: ProxyStatus;
  protocol?: ProxyProtocol;
  provider?: ProxyProvider;
  country?: string;
  minQuality?: number;
  maxLatency?: number;
  page: number;
  limit: number;
}

// 代理操作类型
export type ProxyAction = 'acquire' | 'release' | 'refresh' | 'test';
