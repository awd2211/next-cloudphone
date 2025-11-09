import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import * as ticketService from '@/services/ticket';
import type { Ticket, TicketStatus, TicketPriority, TicketCategory, UpdateTicketDto } from '@/types';

/**
 * 工单查询 keys
 */
export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (params: {
    page?: number;
    pageSize?: number;
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
  }) => [...ticketKeys.lists(), params] as const,
  detail: (id: string) => [...ticketKeys.all, 'detail', id] as const,
  statistics: () => [...ticketKeys.all, 'statistics'] as const,
};

/**
 * 工单列表查询
 */
export const useTickets = (params?: {
  page?: number;
  pageSize?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
}) => {
  const { page = 1, pageSize = 20, ...filters } = params || {};

  return useQuery({
    queryKey: ticketKeys.list({ page, pageSize, ...filters }),
    queryFn: async () => {
      const response = await ticketService.getAllTickets({
        page,
        pageSize,
        ...filters,
      });
      return {
        tickets: response.data || [],
        total: response.total || 0,
      };
    },
    staleTime: 30 * 1000, // 30秒缓存
    placeholderData: (previousData) => previousData,
  });
};

/**
 * 工单详情查询
 */
export const useTicketDetail = (id: string) => {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: async () => {
      const response = await ticketService.getTicketById(id);
      return response.data;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

/**
 * 工单统计查询
 */
export const useTicketStatistics = (userId?: string) => {
  return useQuery({
    queryKey: [...ticketKeys.statistics(), userId],
    queryFn: async () => {
      const response = await ticketService.getTicketStatistics(userId);
      return response.data;
    },
    staleTime: 60 * 1000,
  });
};

/**
 * 更新工单
 */
export const useUpdateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTicketDto }) =>
      ticketService.updateTicket(id, data),
    onSuccess: (_, variables) => {
      message.success('工单更新成功');
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
    },
    onError: (error: any) => {
      message.error(error.message || '更新失败');
    },
  });
};

/**
 * 工单评分
 */
export const useRateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, rating, feedback }: { id: string; rating: number; feedback?: string }) =>
      ticketService.rateTicket(id, rating, feedback),
    onSuccess: (_, variables) => {
      message.success('评分成功');
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
    },
    onError: (error: any) => {
      message.error(error.message || '评分失败');
    },
  });
};

/**
 * 工单列表页面Hook（向后兼容）
 */
export const useTicketList = () => {
  const navigate = useNavigate();

  const handleViewDetail = (ticket: Ticket) => {
    navigate(`/tickets/${ticket.id}`);
  };

  const handleCreateTicket = () => {
    navigate('/tickets/create');
  };

  return {
    handleViewDetail,
    handleCreateTicket,
  };
};
