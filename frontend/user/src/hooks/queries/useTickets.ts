import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
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

/**
 * Ticket 工单管理 React Query Hooks (用户端)
 *
 * 提供用户自助工单管理、查询、回复功能
 */

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
  });
};

/**
 * 获取我的工单统计
 */
export const useMyTicketStats = () => {
  return useQuery<TicketStats>({
    queryKey: ticketKeys.stats(),
    queryFn: getMyTicketStats,
    refetchInterval: 30000, // 每30秒自动刷新
  });
};

/**
 * 获取未读回复数量
 */
export const useUnreadRepliesCount = () => {
  return useQuery<{ count: number }>({
    queryKey: ticketKeys.unreadCount(),
    queryFn: getUnreadRepliesCount,
    refetchInterval: 10000, // 每10秒刷新未读数
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
  });
};

/**
 * 获取工单通知设置
 */
export const useTicketNotificationSettings = () => {
  return useQuery({
    queryKey: ticketKeys.notificationSettings(),
    queryFn: getTicketNotificationSettings,
  });
};

// ==================== Mutation Hooks ====================

/**
 * 创建工单
 */
export const useCreateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.myTickets() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
      message.success('工单创建成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '工单创建失败');
    },
  });
};

/**
 * 更新工单
 */
export const useUpdateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTicketDto }) =>
      updateTicket(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.myTickets() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
      message.success('工单更新成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '工单更新失败');
    },
  });
};

/**
 * 关闭工单
 */
export const useCloseTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: closeTicket,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.myTickets() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
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
      reopenTicket(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.myTickets() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
      message.success('工单已重新打开');
    },
    onError: (error: any) => {
      message.error(error?.message || '重新打开失败');
    },
  });
};

/**
 * 添加工单回复
 */
export const useAddTicketReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, data }: { ticketId: string; data: AddReplyDto }) =>
      addTicketReply(ticketId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.replies(variables.ticketId) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.unreadCount() });
      message.success('回复添加成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '回复添加失败');
    },
  });
};

/**
 * 对工单进行评分
 */
export const useRateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, rating, feedback }: { id: string; rating: number; feedback?: string }) =>
      rateTicket(id, rating, feedback),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
      message.success('评分成功，感谢您的反馈');
    },
    onError: (error: any) => {
      message.error(error?.message || '评分失败');
    },
  });
};

/**
 * 提交满意度调查
 */
export const useSubmitSatisfactionSurvey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, data }: {
      ticketId: string;
      data: {
        responseTime: number;
        solutionQuality: number;
        agentAttitude: number;
        overallSatisfaction: number;
        suggestions?: string;
      };
    }) => submitSatisfactionSurvey(ticketId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) });
      message.success('满意度调查提交成功，感谢您的反馈');
    },
    onError: (error: any) => {
      message.error(error?.message || '提交失败');
    },
  });
};

/**
 * 标记回复为已读
 */
export const useMarkReplyAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, replyId }: { ticketId: string; replyId: string }) =>
      markReplyAsRead(ticketId, replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.myTickets() });
    },
    onError: (error: any) => {
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
    mutationFn: markAllRepliesAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.unreadCount() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.myTickets() });
      message.success('所有回复已标记为已读');
    },
    onError: (error: any) => {
      message.error(error?.message || '标记失败');
    },
  });
};

/**
 * 更新工单通知设置
 */
export const useUpdateTicketNotificationSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTicketNotificationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.notificationSettings() });
      message.success('通知设置更新成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '设置更新失败');
    },
  });
};
