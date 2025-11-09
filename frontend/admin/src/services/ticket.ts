import request from '@/utils/request';
import type {
  Ticket,
  TicketReply,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  ReplyType,
  CreateTicketDto,
  UpdateTicketDto,
  CreateReplyDto,
  TicketStatistics,
} from '@/types';

/**
 * 创建工单
 */
export const createTicket = (data: CreateTicketDto) => {
  return request.post<{
    success: boolean;
    message: string;
    data: Ticket;
  }>('/tickets', data);
};

/**
 * 获取工单详情
 */
export const getTicketById = (id: string) => {
  return request.get<{
    success: boolean;
    data: Ticket;
  }>(`/tickets/${id}`);
};

/**
 * 获取用户工单列表
 */
export const getUserTickets = (
  userId: string,
  params?: {
    status?: TicketStatus;
    category?: TicketCategory;
    priority?: TicketPriority;
    limit?: number;
    offset?: number;
  }
) => {
  return request.get<{
    success: boolean;
    data: Ticket[];
    total: number;
  }>(`/tickets/user/${userId}`, { params });
};

/**
 * 获取所有工单（管理员）- 支持page/pageSize分页
 */
export const getAllTickets = (params?: {
  page?: number;
  pageSize?: number;
  status?: TicketStatus;
  assignedTo?: string;
  priority?: TicketPriority;
  category?: TicketCategory;
}) => {
  // 转换 page/pageSize 为 limit/offset
  const { page = 1, pageSize = 20, ...filters } = params || {};
  const limit = pageSize;
  const offset = (page - 1) * pageSize;

  return request.get<{
    success: boolean;
    data: Ticket[];
    total: number;
  }>('/tickets', {
    params: {
      ...filters,
      limit,
      offset,
    },
  });
};

/**
 * 更新工单
 */
export const updateTicket = (id: string, data: UpdateTicketDto) => {
  return request.put<{
    success: boolean;
    message: string;
    data: Ticket;
  }>(`/tickets/${id}`, data);
};

/**
 * 添加工单回复
 */
export const addTicketReply = (ticketId: string, data: Omit<CreateReplyDto, 'ticketId'>) => {
  return request.post<{
    success: boolean;
    message: string;
    data: TicketReply;
  }>(`/tickets/${ticketId}/replies`, data);
};

/**
 * 获取工单回复列表
 */
export const getTicketReplies = (ticketId: string, includeInternal?: boolean) => {
  return request.get<{
    success: boolean;
    data: TicketReply[];
    total: number;
  }>(`/tickets/${ticketId}/replies`, {
    params: includeInternal !== undefined ? { includeInternal } : undefined,
  });
};

/**
 * 工单评分
 */
export const rateTicket = (id: string, rating: number, feedback?: string) => {
  return request.post<{
    success: boolean;
    message: string;
    data: Ticket;
  }>(`/tickets/${id}/rate`, { rating, feedback });
};

/**
 * 获取工单统计
 */
export const getTicketStatistics = (userId?: string) => {
  return request.get<{
    success: boolean;
    data: TicketStatistics;
  }>('/tickets/statistics/overview', {
    params: userId ? { userId } : undefined,
  });
};
