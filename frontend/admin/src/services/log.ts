/**
 * 操作日志 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import request from '@/utils/request';
import type { PaginationParams, PaginatedResponse } from '@/types';

export interface AuditLog {
  id: string;
  userId: string;
  user?: {
    username: string;
    email: string;
  };
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  requestBody?: any;
  responseStatus: number;
  duration: number;
  createdAt: string;
}

export interface LogParams extends PaginationParams {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// 获取操作日志列表
export const getAuditLogs = (params?: LogParams): Promise<PaginatedResponse<AuditLog>> =>
  api.get<PaginatedResponse<AuditLog>>('/logs/audit', { params });

// 获取日志详情
export const getAuditLog = (id: string): Promise<AuditLog> =>
  api.get<AuditLog>(`/logs/audit/${id}`);

// 导出日志 (使用 raw request 因为需要 blob)
export const exportAuditLogs = (params?: LogParams): Promise<Blob> =>
  request.get('/logs/audit/export', {
    params,
    responseType: 'blob',
  });

// 清理过期日志
export const cleanExpiredLogs = (days: number): Promise<void> =>
  api.post('/logs/audit/clean', { days });
