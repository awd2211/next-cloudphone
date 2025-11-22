/**
 * Audit React Query Hooks
 *
 * 基于 @/services/audit
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { message } from 'antd';
import * as auditService from '@/services/audit';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import {
  AuditStatsSchema,
} from '@/schemas/api.schemas';
import type { PaginationParams } from '@/types';
import type { AuditLog, AuditLogFilter } from '@/services/audit';

/**
 * Query Keys
 */
export const auditKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (params?: PaginationParams & AuditLogFilter) => [...auditKeys.lists(), params] as const,
  details: () => [...auditKeys.all, 'detail'] as const,
  detail: (id: string) => [...auditKeys.details(), id] as const,
  userLogs: (userId: string, params?: PaginationParams) =>
    [...auditKeys.all, 'user', userId, params] as const,
  resourceLogs: (resourceType: string, resourceId: string, params?: PaginationParams) =>
    [...auditKeys.all, 'resource', resourceType, resourceId, params] as const,
  stats: (params?: { startDate?: string; endDate?: string }) =>
    [...auditKeys.all, 'stats', params] as const,
};

/**
 * 获取审计日志列表
 */
export const useAuditLogs = (params?: PaginationParams & AuditLogFilter) => {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => auditService.getAuditLogs(params),
  });
};

/**
 * 获取审计日志详情
 */
export const useAuditLog = (
  id: string,
  options?: Omit<UseQueryOptions<AuditLog, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: auditKeys.detail(id),
    queryFn: () => auditService.getAuditLogDetail(id),
    enabled: !!id,
    ...options,
  });
};

/**
 * 获取用户操作历史
 */
export const useUserAuditLogs = (userId: string, params?: PaginationParams) => {
  return useQuery({
    queryKey: auditKeys.userLogs(userId, params),
    queryFn: () => auditService.getUserAuditLogs(userId, params),
    enabled: !!userId,
  });
};

/**
 * 获取资源操作历史
 */
export const useResourceAuditLogs = (
  resourceType: string,
  resourceId: string,
  params?: PaginationParams
) => {
  return useQuery({
    queryKey: auditKeys.resourceLogs(resourceType, resourceId, params),
    queryFn: () => auditService.getResourceAuditLogs(resourceType, resourceId, params),
    enabled: !!resourceType && !!resourceId,
  });
};

/**
 * 获取审计日志统计
 */
export const useAuditStats = (params?: { startDate?: string; endDate?: string }) => {
  return useValidatedQuery({
    queryKey: auditKeys.stats(params),
    queryFn: () => auditService.getAuditStats(params),
    schema: AuditStatsSchema,
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 导出审计日志 Mutation
 */
export const useExportAuditLogs = () => {
  return useMutation({
    mutationFn: (params?: AuditLogFilter) => auditService.exportAuditLogs(params),
    onSuccess: () => {
      message.success('导出成功');
    },
    onError: () => {
      message.error('导出失败');
    },
  });
};

/**
 * 清理旧日志 Mutation
 */
export const useCleanOldAuditLogs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (beforeDate: string) => auditService.cleanOldAuditLogs(beforeDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auditKeys.lists() });
      queryClient.invalidateQueries({ queryKey: auditKeys.stats() });
      message.success('清理成功');
    },
    onError: () => {
      message.error('清理失败');
    },
  });
};
