import request from '@/utils/request';
import type { PaginationParams, PaginatedResponse } from '@/types';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceType: 'user' | 'device' | 'plan' | 'quota' | 'billing' | 'ticket' | 'apikey' | 'system';
  resourceId?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failed' | 'warning';
  details?: string;
  changes?: any;
  createdAt: string;
}

export interface AuditLogFilter {
  userId?: string;
  resourceType?: string;
  resource?: string;
  method?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// 获取审计日志列表（使用search API）
export const getAuditLogs = (params?: PaginationParams & AuditLogFilter) => {
  // 转换 page/pageSize 为 limit/offset
  const { page = 1, pageSize = 20, ...filters } = params || {};
  const limit = pageSize;
  const offset = (page - 1) * pageSize;

  return request.get<{
    success: boolean;
    logs: AuditLog[];
    total: number;
  }>('/audit-logs/search', {
    params: {
      ...filters,
      limit,
      offset
    }
  }).then(response => {
    // 转换为 PaginatedResponse 格式
    return {
      success: response.success,
      data: response.logs || [],
      total: response.total || 0,
      page,
      pageSize: limit,
    };
  });
};

// 获取审计日志详情
export const getAuditLogDetail = (id: string) => {
  return request.get<AuditLog>(`/audit-logs/${id}`);
};

// 获取用户操作历史
export const getUserAuditLogs = (userId: string, params?: PaginationParams) => {
  return request.get<PaginatedResponse<AuditLog>>(`/audit-logs/user/${userId}`, { params });
};

// 获取资源操作历史
export const getResourceAuditLogs = (
  resourceType: string,
  resourceId: string,
  params?: PaginationParams
) => {
  return request.get<PaginatedResponse<AuditLog>>(
    `/audit-logs/resource/${resourceType}/${resourceId}`,
    { params }
  );
};

// 导出审计日志
export const exportAuditLogs = (params?: AuditLogFilter) => {
  return request.get('/audit-logs/export', {
    params,
    responseType: 'blob',
  });
};

// 获取审计日志统计
export const getAuditStats = (params?: { startDate?: string; endDate?: string }) => {
  return request.get<{
    totalLogs: number;
    successCount: number;
    failedCount: number;
    warningCount: number;
    byResourceType: Record<string, number>;
    byMethod: Record<string, number>;
    byStatus: Record<string, number>;
    topUsers: Array<{ userId: string; userName: string; count: number }>;
    recentActions: AuditLog[];
  }>('/audit-logs/stats', { params });
};

// 清理旧日志（管理员功能）
export const cleanOldAuditLogs = (beforeDate: string) => {
  return request.delete('/audit-logs/cleanup', {
    data: { beforeDate },
  });
};
