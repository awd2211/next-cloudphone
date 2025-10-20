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
export const getAuditLogs = (params?: LogParams) => {
  return request.get<PaginatedResponse<AuditLog>>('/logs/audit', { params });
};

// 获取日志详情
export const getAuditLog = (id: string) => {
  return request.get<AuditLog>(`/logs/audit/${id}`);
};

// 导出日志
export const exportAuditLogs = (params?: LogParams) => {
  return request.get('/logs/audit/export', {
    params,
    responseType: 'blob',
  });
};

// 清理过期日志
export const cleanExpiredLogs = (days: number) => {
  return request.post('/logs/audit/clean', { days });
};
