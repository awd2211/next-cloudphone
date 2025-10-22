import request from '@/utils/request';
import type { PaginationParams, PaginatedResponse } from '@/types';

export interface Ticket {
  id: string;
  ticketNo: string;
  title: string;
  content: string;
  category: 'technical' | 'billing' | 'account' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  userId: string;
  userName: string;
  userEmail: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  lastReplyAt?: string;
  replyCount: number;
  unreadReplies: number;
}

export interface TicketReply {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  userType: 'customer' | 'admin';
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface CreateTicketDto {
  title: string;
  content: string;
  category: Ticket['category'];
  priority: Ticket['priority'];
  userId?: string;
}

export interface UpdateTicketDto {
  title?: string;
  content?: string;
  category?: Ticket['category'];
  priority?: Ticket['priority'];
  status?: Ticket['status'];
  assignedTo?: string;
}

export interface CreateReplyDto {
  content: string;
  isInternal?: boolean;
}

// 获取工单列表
export const getTickets = (params?: PaginationParams & {
  category?: string;
  priority?: string;
  status?: string;
  assignedTo?: string;
  search?: string;
}) => {
  return request.get<PaginatedResponse<Ticket>>('/tickets', { params });
};

// 获取工单详情
export const getTicketDetail = (id: string) => {
  return request.get<Ticket>(`/tickets/${id}`);
};

// 创建工单
export const createTicket = (data: CreateTicketDto) => {
  return request.post<Ticket>('/tickets', data);
};

// 更新工单
export const updateTicket = (id: string, data: UpdateTicketDto) => {
  return request.patch<Ticket>(`/tickets/${id}`, data);
};

// 关闭工单
export const closeTicket = (id: string) => {
  return request.post(`/tickets/${id}/close`);
};

// 重新打开工单
export const reopenTicket = (id: string) => {
  return request.post(`/tickets/${id}/reopen`);
};

// 分配工单
export const assignTicket = (id: string, assignedTo: string) => {
  return request.post(`/tickets/${id}/assign`, { assignedTo });
};

// 获取工单回复列表
export const getTicketReplies = (ticketId: string, params?: PaginationParams) => {
  return request.get<PaginatedResponse<TicketReply>>(`/tickets/${ticketId}/replies`, { params });
};

// 添加回复
export const addTicketReply = (ticketId: string, data: CreateReplyDto) => {
  return request.post<TicketReply>(`/tickets/${ticketId}/replies`, data);
};

// 标记回复为已读
export const markReplyAsRead = (ticketId: string, replyId: string) => {
  return request.post(`/tickets/${ticketId}/replies/${replyId}/read`);
};

// 获取工单统计
export const getTicketStats = () => {
  return request.get<{
    total: number;
    open: number;
    inProgress: number;
    waitingCustomer: number;
    resolved: number;
    closed: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  }>('/tickets/stats');
};
