/**
 * Ticket 工单管理 React Query Hooks (用户端)
 *
 * 提供用户自助工单管理、查询、回复功能
 *
 * ✅ 统一使用 const 箭头函数风格
 * ✅ 使用类型化的错误处理
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyTickets,
  getTicketDetail,
  createTicket,
  updateTicket,
  closeTicket,
  reopenTicket,
  getTicketReplies,
  addTicketReply,
  getMyTicketStats,
  getUnreadRepliesCount,
  rateTicket,
  submitSatisfactionSurvey,
  getRelatedTickets,
  getSuggestedTags,
  markReplyAsRead,
  markAllRepliesAsRead,
  getTicketNotificationSettings,
  updateTicketNotificationSettings,
  type TicketListQuery,
  type TicketListResponse,
  type Ticket,
  type CreateTicketDto,
  type UpdateTicketDto,
  type AddReplyDto,
  type TicketReply,
  type TicketStats,
} from '@/services/ticket';
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig, RefetchIntervalConfig } from '../utils/cacheConfig';

// ==================== Query Keys ====================

export const ticketKeys = {
  all: ['tickets'] as const,
  myTickets: (params?: TicketListQuery) => [...ticketKeys.all, 'my', params] as const,
  detail: (id: string) => [...ticketKeys.all, 'detail', id] as const,
  replies: (ticketId: string) => [...ticketKeys.all, 'replies', ticketId] as const,
  stats: () => [...ticketKeys.all, 'stats'] as const,
  unreadCount: () => [...ticketKeys.all, 'unread-count'] as const,
  related: (keyword: string) => [...ticketKeys.all, 'related', keyword] as const,
  suggestedTags: (title: string, description: string) =>
    [...ticketKeys.all, 'suggested-tags', title, description] as const,
  notificationSettings: () => [...ticketKeys.all, 'notification-settings'] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取我的工单列表
 */
export const useMyTickets = (params?: TicketListQuery) => {
  return useQuery<TicketListResponse>({
    queryKey: ticketKeys.myTickets(params),
    queryFn: () => getMyTickets(params),
    staleTime: StaleTimeConfig.tickets,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * 获取工单详情
 */
export const useTicketDetail = (id: string, options?: { enabled?: boolean }) => {
  return useQuery<Ticket>({
    queryKey: ticketKeys.detail(id),
    queryFn: () => getTicketDetail(id),
    enabled: options?.enabled !== false && !!id,
    staleTime: StaleTimeConfig.ticketDetail,
  });
};

/**
 * 获取工单回复列表
 */
export const useTicketReplies = (ticketId: string, options?: { enabled?: boolean }) => {
  return useQuery<TicketReply[]>({
    queryKey: ticketKeys.replies(ticketId),
    queryFn: () => getTicketReplies(ticketId),
    enabled: options?.enabled !== false && !!ticketId,
    staleTime: StaleTimeConfig.ticketDetail,
  });
};

/**
 * 获取我的工单统计
 */
export const useMyTicketStats = () => {
  return useQuery<TicketStats>({
    queryKey: ticketKeys.stats(),
    queryFn: getMyTicketStats,
    staleTime: StaleTimeConfig.tickets,
    refetchInterval: RefetchIntervalConfig.normal,
  });
};

/**
 * 获取未读回复数量
 */
export const useUnreadRepliesCount = () => {
  return useQuery<{ count: number }>({
    queryKey: ticketKeys.unreadCount(),
    queryFn: getUnreadRepliesCount,
    staleTime: StaleTimeConfig.tickets,
    refetchInterval: RefetchIntervalConfig.fast,
  });
};

/**
 * 获取相关工单（可能相关的工单）
 */
export const useRelatedTickets = (keyword: string, options?: { enabled?: boolean }) => {
  return useQuery<Ticket[]>({
    queryKey: ticketKeys.related(keyword),
    queryFn: () => getRelatedTickets(keyword),
    enabled: options?.enabled !== false && !!keyword && keyword.length >= 2,
    staleTime: StaleTimeConfig.tickets,
  });
};

/**
 * 获取建议的标签
 */
export const useSuggestedTags = (
  title: string,
  description: string,
  options?: { enabled?: boolean }
) => {
  return useQuery<string[]>({
    queryKey: ticketKeys.suggestedTags(title, description),
    queryFn: () => getSuggestedTags(title, description),
    enabled: options?.enabled !== false && !!title && !!description,
    staleTime: StaleTimeConfig.tickets,
  });
};

/**
 * 获取工单通知设置
 */
export const useTicketNotificationSettings = () => {
  return useQuery({
    queryKey: ticketKeys.notificationSettings(),
    queryFn: getTicketNotificationSettings,
    staleTime: StaleTimeConfig.tickets,
  });
};

// ==================== Mutation Hooks ====================

/**
 * 创建工单
 */
export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation<Ticket, Error, CreateTicketDto>({
    mutationFn: createTicket,
    onSuccess: () => {
      handleMutationSuccess('工单创建成功');
      queryClient.invalidateQueries({ queryKey: ticketKeys.myTickets() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '工单创建失败');
    },
  });
};

/**
 * 更新工单
 */
export const useUpdateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation<Ticket, Error, { id: string; data: UpdateTicketDto }>({
    mutationFn: ({ id, data }) => updateTicket(id, data),
    onSuccess: (_, variables) => {
      handleMutationSuccess('工单更新成功');
      queryClient.invalidateQueries({ queryKey: ticketKeys.myTickets() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
    },
    onError: (error) => {
      handleMutationError(error, '工单更新失败');
    },
  });
};

/**
 * 关闭工单
 */
export const useCloseTicket = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: closeTicket,
    onSuccess: (_, id) => {
      handleMutationSuccess('工单已关闭');
      queryClient.invalidateQueries({ queryKey: ticketKeys.myTickets() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '工单关闭失败');
    },
  });
};

/**
 * 重新打开工单
 */
export const useReopenTicket = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; reason?: string }>({
    mutationFn: ({ id, reason }) => reopenTicket(id, reason),
    onSuccess: (_, variables) => {
      handleMutationSuccess('工单已重新打开');
      queryClient.invalidateQueries({ queryKey: ticketKeys.myTickets() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '重新打开失败');
    },
  });
};

/**
 * 添加工单回复
 */
export const useAddTicketReply = () => {
  const queryClient = useQueryClient();

  return useMutation<TicketReply, Error, { ticketId: string; data: AddReplyDto }>({
    mutationFn: ({ ticketId, data }) => addTicketReply(ticketId, data),
    onSuccess: (_, variables) => {
      handleMutationSuccess('回复添加成功');
      queryClient.invalidateQueries({ queryKey: ticketKeys.replies(variables.ticketId) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.unreadCount() });
    },
    onError: (error) => {
      handleMutationError(error, '回复添加失败');
    },
  });
};

/**
 * 对工单进行评分
 */
export const useRateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; rating: number; feedback?: string }>({
    mutationFn: ({ id, rating, feedback }) => rateTicket(id, rating, feedback),
    onSuccess: (_, variables) => {
      handleMutationSuccess('评分成功，感谢您的反馈');
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
    },
    onError: (error) => {
      handleMutationError(error, '评分失败');
    },
  });
};

/**
 * 提交满意度调查
 */
export const useSubmitSatisfactionSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, {
    ticketId: string;
    data: {
      responseTime: number;
      solutionQuality: number;
      agentAttitude: number;
      overallSatisfaction: number;
      suggestions?: string;
    };
  }>({
    mutationFn: ({ ticketId, data }) => submitSatisfactionSurvey(ticketId, data),
    onSuccess: (_, variables) => {
      handleMutationSuccess('满意度调查提交成功，感谢您的反馈');
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) });
    },
    onError: (error) => {
      handleMutationError(error, '提交失败');
    },
  });
};

/**
 * 标记回复为已读
 */
export const useMarkReplyAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { ticketId: string; replyId: string }>({
    mutationFn: ({ ticketId, replyId }) => markReplyAsRead(ticketId, replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.myTickets() });
    },
    onError: (error) => {
      console.error('标记已读失败:', error);
    },
  });
};

/**
 * 批量标记回复为已读
 */
export const useMarkAllRepliesAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId: string) => markAllRepliesAsRead(ticketId),
    onSuccess: () => {
      handleMutationSuccess('所有回复已标记为已读');
      queryClient.invalidateQueries({ queryKey: ticketKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.myTickets() });
    },
    onError: (error: Error) => {
      handleMutationError(error, '标记失败');
    },
  });
};

/**
 * 更新工单通知设置
 */
export const useUpdateTicketNotificationSettings = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, Parameters<typeof updateTicketNotificationSettings>[0]>({
    mutationFn: updateTicketNotificationSettings,
    onSuccess: () => {
      handleMutationSuccess('通知设置更新成功');
      queryClient.invalidateQueries({ queryKey: ticketKeys.notificationSettings() });
    },
    onError: (error) => {
      handleMutationError(error, '设置更新失败');
    },
  });
};
