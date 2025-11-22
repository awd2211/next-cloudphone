/**
 * 用户审计日志服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { AuditLog, AuditAction, AuditLevel, AuditLogStatistics } from '@/types';

/**
 * 获取用户审计日志
 */
export const getUserAuditLogs = (
  userId: string,
  params?: {
    action?: AuditAction;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{
  data: AuditLog[];
  total: number;
}> =>
  api.get<{
    data: AuditLog[];
    total: number;
  }>(`/audit-logs/user/${userId}`, { params });

/**
 * 获取资源的审计日志
 */
export const getResourceAuditLogs = (
  resourceType: string,
  resourceId: string,
  limit?: number
): Promise<{
  data: AuditLog[];
  total: number;
}> =>
  api.get<{
    data: AuditLog[];
    total: number;
  }>(`/audit-logs/resource/${resourceType}/${resourceId}`, {
    params: limit ? { limit } : undefined,
  });

/**
 * 搜索审计日志（管理员）
 */
export const searchAuditLogs = (params?: {
  userId?: string;
  action?: AuditAction;
  level?: AuditLevel;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  startDate?: string;
  endDate?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{
  data: AuditLog[];
  total: number;
}> =>
  api.get<{
    data: AuditLog[];
    total: number;
  }>('/audit-logs/search', { params });

/**
 * 获取审计日志统计
 */
export const getAuditLogStatistics = (userId?: string): Promise<{
  data: AuditLogStatistics;
}> =>
  api.get<{
    data: AuditLogStatistics;
  }>('/audit-logs/statistics', {
    params: userId ? { userId } : undefined,
  });
