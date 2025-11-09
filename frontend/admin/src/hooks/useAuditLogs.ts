import { useQuery } from '@tanstack/react-query';
import { getAuditLogs, getAuditStats } from '@/services/audit';
import type { AuditLogFilter } from '@/services/audit';
import dayjs from 'dayjs';

/**
 * 审计日志查询 keys
 */
export const auditLogKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (filters: AuditLogFilter & { page?: number; pageSize?: number }) =>
    [...auditLogKeys.lists(), filters] as const,
  stats: () => [...auditLogKeys.all, 'stats'] as const,
};

/**
 * 审计日志列表查询
 */
export const useAuditLogs = (params?: {
  page?: number;
  pageSize?: number;
  filters?: AuditLogFilter;
}) => {
  const { page = 1, pageSize = 20, filters = {} } = params || {};

  return useQuery({
    queryKey: auditLogKeys.list({ ...filters, page, pageSize }),
    queryFn: async () => {
      const response = await getAuditLogs({
        page,
        pageSize,
        ...filters,
      });
      return {
        logs: response.data || [],
        total: response.total || 0,
        page: response.page || page,
        pageSize: response.pageSize || pageSize,
      };
    },
    staleTime: 30 * 1000, // 30秒缓存
    placeholderData: (previousData) => previousData, // 保持之前的数据直到新数据到达
  });
};

/**
 * 审计日志统计查询
 */
export const useAuditStats = (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: [...auditLogKeys.stats(), params],
    queryFn: async () => {
      const response = await getAuditStats(params);
      return response;
    },
    staleTime: 60 * 1000, // 1分钟缓存
  });
};

/**
 * 导出审计日志为CSV
 */
export const exportAuditLogsToCSV = (logs: any[], filename?: string) => {
  const headers = [
    'ID',
    '用户ID',
    '用户名',
    '操作',
    '资源',
    '资源类型',
    'IP地址',
    '方法',
    '状态',
    '详情',
    '创建时间',
  ];

  const csvContent = [
    headers.join(','),
    ...logs.map((log) => {
      const escapedDetails = (log.details || '').replace(/"/g, '""');
      return [
        log.id,
        log.userId,
        log.userName,
        log.action,
        log.resource,
        log.resourceType,
        log.ipAddress,
        log.method,
        log.status,
        `"${escapedDetails}"`,
        dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      ].join(',');
    }),
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    filename || `audit_logs_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
