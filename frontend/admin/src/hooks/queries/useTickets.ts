/**
 * Tickets React Query Hooks
 *
 * 基于 @/services/ticket
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { message } from 'antd';
import * as ticketService from '@/services/ticket';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import {
  TicketStatisticsSchema,
} from '@/schemas/api.schemas';
import type {
  Ticket,
  TicketPriority,
  CreateTicketDto,
  UpdateTicketDto,
  TicketListParams,
} from '@/services/ticket';
import type {
  CreateReplyDto,
} from '@/types';

// 重新导出供外部使用(这些类型可能在组件中需要)
export type { TicketStatus, TicketType } from '@/services/ticket';
export type { TicketPriority };

/**
 * Query Keys
 */
export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (params?: TicketListParams) => [...ticketKeys.lists(), params] as const,
  userTickets: (userId: string, params?: Omit<TicketListParams, 'userId'>) =>
    [...ticketKeys.all, 'user', userId, params] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
  replies: (ticketId: string, includeInternal?: boolean) =>
    [...ticketKeys.all, 'replies', ticketId, { includeInternal }] as const,
  statistics: (params?: {
    startDate?: string;
    endDate?: string;
    agentId?: string;
  }) => [...ticketKeys.all, 'statistics', params] as const,
};

/**
 * 获取所有工单（管理员）
 */
export const useTickets = (params?: TicketListParams) => {
  return useQuery({
    queryKey: ticketKeys.list(params),
    queryFn: () => ticketService.getAllTickets(params),
  });
};

/**
 * 获取用户工单列表
 */
export const useUserTickets = (
  userId: string,
  params?: Omit<TicketListParams, 'userId'>
) => {
  return useQuery({
    queryKey: ticketKeys.userTickets(userId, params),
    queryFn: () => ticketService.getAllTickets({ ...params, userId }),
    enabled: !!userId,
  });
};

/**
 * 获取工单详情
 */
export const useTicket = (
  id: string,
  options?: Omit<UseQueryOptions<Ticket>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => ticketService.getTicketById(id),
    enabled: !!id,
    ...options,
  });
};

/**
 * 获取工单回复列表
 */
export const useTicketReplies = (ticketId: string, includeInternal?: boolean) => {
  return useQuery({
    queryKey: ticketKeys.replies(ticketId, includeInternal),
    queryFn: () => ticketService.getTicketReplies(ticketId, { includeInternal }),
    enabled: !!ticketId,
  });
};

/**
 * 获取工单统计
 */
export const useTicketStatistics = (params?: {
  startDate?: string;
  endDate?: string;
  agentId?: string;
}) => {
  return useValidatedQuery({
    queryKey: ticketKeys.statistics(params),
    queryFn: () => ticketService.getTicketStatistics(params),
    schema: TicketStatisticsSchema,
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 创建工单 Mutation
 */
export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTicketDto) => ticketService.createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.statistics() });
      message.success('工单创建成功');
    },
    onError: () => {
      message.error('工单创建失败');
    },
  });
};

/**
 * 更新工单 Mutation
 */
export const useUpdateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTicketDto }) =>
      ticketService.updateTicket(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.statistics() });
      message.success('工单更新成功');
    },
    onError: () => {
      message.error('工单更新失败');
    },
  });
};

/**
 * 添加工单回复 Mutation
 */
export const useAddTicketReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, data }: { ticketId: string; data: Omit<CreateReplyDto, 'ticketId'> }) =>
      ticketService.addTicketReply(ticketId, data),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.replies(ticketId) });
      message.success('回复添加成功');
    },
    onError: () => {
      message.error('回复添加失败');
    },
  });
};

// ==================== 批量操作 ====================

/**
 * 批量删除工单
 */
export const useBatchDeleteTickets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ticketService.batchDeleteTickets,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.statistics() });
      message.success('批量删除成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '批量删除失败');
    },
  });
};

/**
 * 批量分配工单
 */
export const useBatchAssignTickets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketIds, agentId }: { ticketIds: string[]; agentId: string }) =>
      ticketService.batchAssignTickets(ticketIds, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.statistics() });
      message.success('批量分配成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '批量分配失败');
    },
  });
};

/**
 * 批量关闭工单
 */
export const useBatchCloseTickets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, resolution }: { ids: string[]; resolution?: string }) =>
      ticketService.batchCloseTickets(ids, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.statistics() });
      message.success('批量关闭成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '批量关闭失败');
    },
  });
};

// ==================== 工单分配 ====================

/**
 * 分配工单给客服
 */
export const useAssignTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, agentId }: { ticketId: string; agentId: string }) =>
      ticketService.assignTicket(ticketId, agentId),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
      message.success('工单分配成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '工单分配失败');
    },
  });
};

/**
 * 转移工单
 */
export const useTransferTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, fromAgentId, toAgentId, reason }: {
      ticketId: string;
      fromAgentId: string;
      toAgentId: string;
      reason?: string;
    }) => ticketService.transferTicket(ticketId, fromAgentId, toAgentId, reason),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
      message.success('工单转移成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '工单转移失败');
    },
  });
};

/**
 * 取消分配
 */
export const useUnassignTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ticketService.unassignTicket,
    onSuccess: (_, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
      message.success('取消分配成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '取消分配失败');
    },
  });
};

// ==================== 工单状态管理 ====================

/**
 * 关闭工单
 */
export const useCloseTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution?: string }) =>
      ticketService.closeTicket(id, resolution),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.statistics() });
      message.success('工单已关闭');
    },
    onError: (error: any) => {
      message.error(error?.message || '工单关闭失败');
    },
  });
};

/**
 * 重新打开工单
 */
export const useReopenTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      ticketService.reopenTicket(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.statistics() });
      message.success('工单已重新打开');
    },
    onError: (error: any) => {
      message.error(error?.message || '重新打开失败');
    },
  });
};

/**
 * 标记为已解决
 */
export const useResolveTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, solution }: { id: string; solution: string }) =>
      ticketService.resolveTicket(id, solution),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.statistics() });
      message.success('工单已标记为解决');
    },
    onError: (error: any) => {
      message.error(error?.message || '操作失败');
    },
  });
};

/**
 * 设置工单优先级
 */
export const useSetTicketPriority = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: TicketPriority }) =>
      ticketService.setTicketPriority(id, priority),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      message.success('优先级更新成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '优先级更新失败');
    },
  });
};

/**
 * 删除工单
 */
export const useDeleteTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ticketService.deleteTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.statistics() });
      message.success('工单删除成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '工单删除失败');
    },
  });
};

// ==================== 回复管理 ====================

/**
 * 添加内部备注
 */
export const useAddInternalNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, content }: { ticketId: string; content: string }) =>
      ticketService.addInternalNote(ticketId, content),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.replies(ticketId) });
      message.success('内部备注添加成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '内部备注添加失败');
    },
  });
};

/**
 * 删除回复
 */
export const useDeleteReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, replyId }: { ticketId: string; replyId: string }) =>
      ticketService.deleteReply(ticketId, replyId),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.replies(ticketId) });
      message.success('回复删除成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '回复删除失败');
    },
  });
};

// ==================== 客服统计 ====================

/**
 * 获取客服工作统计
 */
export const useAgentStats = (agentId?: string, params?: {
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: [...ticketKeys.statistics(), 'agents', agentId, params],
    queryFn: () => ticketService.getAgentStats(agentId, params),
  });
};

/**
 * 获取客服工作负载
 */
export const useAgentWorkload = () => {
  return useQuery({
    queryKey: [...ticketKeys.statistics(), 'workload'],
    queryFn: ticketService.getAgentWorkload,
    refetchInterval: 60000, // 客服工作负载 - 中等实时性
  });
};

// ==================== 分析统计 ====================

/**
 * 获取响应时间分析
 */
export const useResponseTimeAnalysis = (params?: {
  startDate?: string;
  endDate?: string;
  groupBy?: 'hour' | 'day' | 'week';
}) => {
  return useQuery({
    queryKey: [...ticketKeys.statistics(), 'response-time', params],
    queryFn: () => ticketService.getResponseTimeAnalysis(params),
  });
};

/**
 * 获取解决时间分析
 */
export const useResolutionTimeAnalysis = (params?: {
  startDate?: string;
  endDate?: string;
  groupBy?: 'hour' | 'day' | 'week';
}) => {
  return useQuery({
    queryKey: [...ticketKeys.statistics(), 'resolution-time', params],
    queryFn: () => ticketService.getResolutionTimeAnalysis(params),
  });
};

/**
 * 获取工单趋势
 */
export const useTicketTrend = (params?: {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}) => {
  return useQuery({
    queryKey: [...ticketKeys.statistics(), 'trend', params],
    queryFn: () => ticketService.getTicketTrend(params),
  });
};

/**
 * 获取满意度统计
 */
export const useSatisfactionStats = (params?: {
  startDate?: string;
  endDate?: string;
  agentId?: string;
}) => {
  return useQuery({
    queryKey: [...ticketKeys.statistics(), 'satisfaction', params],
    queryFn: () => ticketService.getSatisfactionStats(params),
  });
};

// ==================== SLA 管理 ====================

/**
 * 获取 SLA 状态
 */
export const useSLAStatus = (ticketId?: string) => {
  return useQuery({
    queryKey: [...ticketKeys.all, 'sla', 'status', ticketId],
    queryFn: () => ticketService.getSLAStatus(ticketId),
    refetchInterval: ticketId ? 60000 : undefined, // 单个工单每分钟刷新
  });
};

/**
 * 获取违反 SLA 的工单
 */
export const useSLAViolations = (params?: {
  severity?: 'warning' | 'critical';
  limit?: number;
}) => {
  return useQuery({
    queryKey: [...ticketKeys.all, 'sla', 'violations', params],
    queryFn: () => ticketService.getSLAViolations(params),
    refetchInterval: 60000, // SLA违规 - 中等实时性
  });
};

// ==================== 标签管理 ====================

/**
 * 获取所有标签
 */
export const useAllTags = () => {
  return useQuery<string[]>({
    queryKey: [...ticketKeys.all, 'tags'],
    queryFn: ticketService.getAllTags,
  });
};

/**
 * 添加标签到工单
 */
export const useAddTagsToTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, tags }: { ticketId: string; tags: string[] }) =>
      ticketService.addTagsToTicket(ticketId, tags),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
      queryClient.invalidateQueries({ queryKey: [...ticketKeys.all, 'tags'] });
      message.success('标签添加成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '标签添加失败');
    },
  });
};

/**
 * 从工单移除标签
 */
export const useRemoveTagFromTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, tag }: { ticketId: string; tag: string }) =>
      ticketService.removeTagFromTicket(ticketId, tag),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
      message.success('标签移除成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '标签移除失败');
    },
  });
};

// ==================== 模板管理 ====================

/**
 * 获取回复模板列表
 */
export const useReplyTemplates = (params?: { type?: any; keyword?: string }) => {
  return useQuery({
    queryKey: [...ticketKeys.all, 'templates', 'replies', params],
    queryFn: () => ticketService.getReplyTemplates(params),
  });
};

/**
 * 创建回复模板
 */
export const useCreateReplyTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ticketService.createReplyTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ticketKeys.all, 'templates'] });
      message.success('模板创建成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '模板创建失败');
    },
  });
};

/**
 * 更新回复模板
 */
export const useUpdateReplyTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      ticketService.updateReplyTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ticketKeys.all, 'templates'] });
      message.success('模板更新成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '模板更新失败');
    },
  });
};

/**
 * 删除回复模板
 */
export const useDeleteReplyTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ticketService.deleteReplyTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ticketKeys.all, 'templates'] });
      message.success('模板删除成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '模板删除失败');
    },
  });
};

// ==================== 导出功能 ====================

/**
 * 导出工单数据
 */
export const useExportTickets = () => {
  return useMutation({
    mutationFn: ticketService.exportTickets,
    onSuccess: () => {
      message.success('工单数据导出成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '导出失败');
    },
  });
};

/**
 * 导出统计报表
 */
export const useExportStatisticsReport = () => {
  return useMutation({
    mutationFn: ticketService.exportStatisticsReport,
    onSuccess: () => {
      message.success('统计报表导出成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '导出失败');
    },
  });
};
