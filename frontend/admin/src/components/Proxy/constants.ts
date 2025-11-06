/**
 * 代理IP相关常量
 */

import type { ProxyProtocol, ProxyStatus, ProxyProvider } from './types';

// 状态标签映射
export const STATUS_LABELS: Record<ProxyStatus, string> = {
  available: '可用',
  in_use: '使用中',
  unavailable: '不可用',
  error: '错误',
};

// 状态颜色映射
export const STATUS_COLORS: Record<ProxyStatus, string> = {
  available: 'success',
  in_use: 'processing',
  unavailable: 'default',
  error: 'error',
};

// 协议标签映射
export const PROTOCOL_LABELS: Record<ProxyProtocol, string> = {
  http: 'HTTP',
  https: 'HTTPS',
  socks5: 'SOCKS5',
};

// 供应商标签映射
export const PROVIDER_LABELS: Record<ProxyProvider, string> = {
  iproyal: 'IPRoyal',
  brightdata: 'Bright Data',
  oxylabs: 'Oxylabs',
};

// 供应商颜色映射
export const PROVIDER_COLORS: Record<ProxyProvider, string> = {
  iproyal: 'blue',
  brightdata: 'green',
  oxylabs: 'orange',
};

// 质量等级
export const QUALITY_LEVELS = {
  excellent: { min: 90, label: '优秀', color: 'success' },
  good: { min: 70, label: '良好', color: 'processing' },
  fair: { min: 50, label: '一般', color: 'warning' },
  poor: { min: 0, label: '较差', color: 'error' },
};

// 获取质量等级
export const getQualityLevel = (quality: number) => {
  if (quality >= QUALITY_LEVELS.excellent.min) return QUALITY_LEVELS.excellent;
  if (quality >= QUALITY_LEVELS.good.min) return QUALITY_LEVELS.good;
  if (quality >= QUALITY_LEVELS.fair.min) return QUALITY_LEVELS.fair;
  return QUALITY_LEVELS.poor;
};

// 常用国家列表
export const COMMON_COUNTRIES = [
  { code: 'US', name: '美国' },
  { code: 'GB', name: '英国' },
  { code: 'DE', name: '德国' },
  { code: 'FR', name: '法国' },
  { code: 'JP', name: '日本' },
  { code: 'SG', name: '新加坡' },
  { code: 'HK', name: '香港' },
  { code: 'CN', name: '中国' },
];
