/**
 * 黑名单 API 服务
 */
import request from '@/utils/request';

export type BlacklistType = 'ip' | 'device' | 'user' | 'fingerprint';
export type BlacklistStatus = 'active' | 'expired' | 'revoked';

export interface Blacklist {
  id: string;
  tenantId: string;
  type: BlacklistType;
  value: string;
  reason?: string;
  status: BlacklistStatus;
  isPermanent: boolean;
  expiresAt?: string;
  blockCount: number;
  lastBlockedAt?: string;
  metadata?: {
    userAgent?: string;
    location?: string;
    lastConversationId?: string;
    blockedMessages?: number;
  };
  createdBy?: string;
  revokedBy?: string;
  revokedAt?: string;
  revokeReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchBlacklistParams {
  keyword?: string;
  type?: BlacklistType;
  status?: BlacklistStatus;
  page?: number;
  limit?: number;
}

export interface SearchBlacklistResult {
  items: Blacklist[];
  total: number;
  page: number;
  limit: number;
}

export interface BlacklistStats {
  total: number;
  byType: Record<string, number>;
  totalBlocks: number;
  recentBlocks: Blacklist[];
}

/**
 * 搜索黑名单
 */
export async function searchBlacklist(params?: SearchBlacklistParams): Promise<SearchBlacklistResult> {
  return request.get('/livechat/blacklist', { params });
}

/**
 * 获取黑名单详情
 */
export async function getBlacklist(id: string): Promise<Blacklist> {
  return request.get(`/livechat/blacklist/${id}`);
}

/**
 * 获取黑名单统计
 */
export async function getBlacklistStats(): Promise<BlacklistStats> {
  return request.get('/livechat/blacklist/stats');
}

/**
 * 添加到黑名单
 */
export async function createBlacklist(data: {
  type: BlacklistType;
  value: string;
  reason?: string;
  isPermanent?: boolean;
  expiresAt?: string;
  metadata?: Record<string, any>;
}): Promise<Blacklist> {
  return request.post('/livechat/blacklist', data);
}

/**
 * 批量添加黑名单
 */
export async function batchCreateBlacklist(items: {
  type: BlacklistType;
  value: string;
  reason?: string;
  isPermanent?: boolean;
  expiresAt?: string;
}[]): Promise<{ created: number; skipped: number }> {
  return request.post('/livechat/blacklist/batch', { items });
}

/**
 * 检查是否在黑名单中
 */
export async function checkBlacklist(type: BlacklistType, value: string): Promise<{ isBlacklisted: boolean }> {
  return request.post('/livechat/blacklist/check', { type, value });
}

/**
 * 更新黑名单
 */
export async function updateBlacklist(id: string, data: {
  reason?: string;
  isPermanent?: boolean;
  expiresAt?: string;
  status?: BlacklistStatus;
}): Promise<Blacklist> {
  return request.put(`/livechat/blacklist/${id}`, data);
}

/**
 * 撤销黑名单
 */
export async function revokeBlacklist(id: string, reason?: string): Promise<Blacklist> {
  return request.post(`/livechat/blacklist/${id}/revoke`, { reason });
}

/**
 * 删除黑名单
 */
export async function deleteBlacklist(id: string): Promise<void> {
  return request.delete(`/livechat/blacklist/${id}`);
}
