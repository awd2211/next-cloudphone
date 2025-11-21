import request from '@/utils/request';

/**
 * 工单服务 API (管理员后台)
 * 提供完整的工单管理、客服分配、统计分析等功能
 */

// ==================== 类型定义 ====================

export enum TicketType {
  TECHNICAL = 'technical',
  BILLING = 'billing',
  DEVICE = 'device',
  APP = 'app',
  FEATURE = 'feature',
  OTHER = 'other',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING = 'waiting',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export interface Ticket {
  id: string;
  title: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  resolvedAt?: string;
  firstResponseAt?: string;
  tags?: string[];
  rating?: number;
  ratingFeedback?: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface TicketReply {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  isStaff: boolean;
  isInternal: boolean;
  attachments?: Attachment[];
  createdAt: string;
}

export interface TicketStatistics {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  closed: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  satisfactionRate: number;
}

export interface AgentStats {
  agentId: string;
  agentName: string;
  assignedTickets: number;
  resolvedTickets: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  satisfactionRate: number;
  workload: number;
}

export interface CreateTicketDto {
  title: string;
  type: TicketType;
  priority: TicketPriority;
  description: string;
  userId: string;
  tags?: string[];
  attachmentIds?: string[];
}

export interface UpdateTicketDto {
  title?: string;
  type?: TicketType;
  priority?: TicketPriority;
  status?: TicketStatus;
  description?: string;
  tags?: string[];
}

export interface TicketListParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
  status?: TicketStatus;
  type?: TicketType;
  priority?: TicketPriority;
  assignedTo?: string;
  userId?: string;
  keyword?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

export interface TicketListResponse {
  data: Ticket[];
  total: number;
  page?: number;
  pageSize?: number;
}

// ==================== 工单管理 ====================

/**
 * 获取所有工单列表（管理员）
 */
export const getAllTickets = (params?: TicketListParams) => {
  // 支持两种分页模式
  const queryParams: any = { ...params };
  if (params?.page && params?.pageSize) {
    queryParams.limit = params.pageSize;
    queryParams.offset = (params.page - 1) * params.pageSize;
    delete queryParams.page;
    delete queryParams.pageSize;
  }

  return request.get<TicketListResponse>('/tickets', { params: queryParams });
};

/**
 * 获取工单详情
 */
export const getTicketById = (id: string) => {
  return request.get<Ticket>(`/tickets/${id}`);
};

/**
 * 创建工单（代用户创建）
 */
export const createTicket = (data: CreateTicketDto) => {
  return request.post<Ticket>('/tickets', data);
};

/**
 * 更新工单
 */
export const updateTicket = (id: string, data: UpdateTicketDto) => {
  return request.put<Ticket>(`/tickets/${id}`, data);
};

/**
 * 删除工单
 */
export const deleteTicket = (id: string) => {
  return request.delete(`/tickets/${id}`);
};

/**
 * 批量删除工单
 */
export const batchDeleteTickets = (ids: string[]) => {
  return request.post('/tickets/batch/delete', { ids });
};

// ==================== 工单分配 ====================

/**
 * 分配工单给客服
 */
export const assignTicket = (ticketId: string, agentId: string) => {
  return request.post(`/tickets/${ticketId}/assign`, { agentId });
};

/**
 * 批量分配工单
 */
export const batchAssignTickets = (ticketIds: string[], agentId: string) => {
  return request.post('/tickets/batch/assign', { ticketIds, agentId });
};

/**
 * 转移工单到其他客服
 */
export const transferTicket = (ticketId: string, fromAgentId: string, toAgentId: string, reason?: string) => {
  return request.post(`/tickets/${ticketId}/transfer`, {
    fromAgentId,
    toAgentId,
    reason,
  });
};

/**
 * 取消分配
 */
export const unassignTicket = (ticketId: string) => {
  return request.post(`/tickets/${ticketId}/unassign`);
};

// ==================== 工单状态管理 ====================

/**
 * 关闭工单
 */
export const closeTicket = (id: string, resolution?: string) => {
  return request.post(`/tickets/${id}/close`, { resolution });
};

/**
 * 批量关闭工单
 */
export const batchCloseTickets = (ids: string[], resolution?: string) => {
  return request.post('/tickets/batch/close', { ids, resolution });
};

/**
 * 重新打开工单
 */
export const reopenTicket = (id: string, reason?: string) => {
  return request.post(`/tickets/${id}/reopen`, { reason });
};

/**
 * 标记为已解决
 */
export const resolveTicket = (id: string, solution: string) => {
  return request.post(`/tickets/${id}/resolve`, { solution });
};

/**
 * 设置工单优先级
 */
export const setTicketPriority = (id: string, priority: TicketPriority) => {
  return request.patch(`/tickets/${id}/priority`, { priority });
};

// ==================== 回复管理 ====================

/**
 * 获取工单回复列表（包括内部备注）
 */
export const getTicketReplies = (ticketId: string, params?: {
  includeInternal?: boolean;
}) => {
  return request.get<TicketReply[]>(`/tickets/${ticketId}/replies`, { params });
};

/**
 * 添加工单回复
 */
export const addTicketReply = (ticketId: string, data: {
  content: string;
  isInternal?: boolean;
  attachmentIds?: string[];
}) => {
  return request.post<TicketReply>(`/tickets/${ticketId}/replies`, data);
};

/**
 * 添加内部备注（不通知用户）
 */
export const addInternalNote = (ticketId: string, content: string) => {
  return request.post<TicketReply>(`/tickets/${ticketId}/internal-notes`, {
    content,
    isInternal: true,
  });
};

/**
 * 删除回复
 */
export const deleteReply = (ticketId: string, replyId: string) => {
  return request.delete(`/tickets/${ticketId}/replies/${replyId}`);
};

// ==================== 统计分析 ====================

/**
 * 获取工单统计总览
 */
export const getTicketStatistics = (params?: {
  startDate?: string;
  endDate?: string;
  agentId?: string;
}) => {
  return request.get<TicketStatistics>('/tickets/statistics/overview', { params });
};

/**
 * 获取客服工作统计
 */
export const getAgentStats = (agentId?: string, params?: {
  startDate?: string;
  endDate?: string;
}) => {
  const endpoint = agentId
    ? `/tickets/statistics/agents/${agentId}`
    : '/tickets/statistics/agents';
  return request.get<AgentStats | AgentStats[]>(endpoint, { params });
};

/**
 * 获取客服工作负载
 */
export const getAgentWorkload = () => {
  return request.get<Array<{
    agentId: string;
    agentName: string;
    activeTickets: number;
    capacity: number;
    utilizationRate: number;
  }>>('/tickets/statistics/workload');
};

/**
 * 获取响应时间分析
 */
export const getResponseTimeAnalysis = (params?: {
  startDate?: string;
  endDate?: string;
  groupBy?: 'hour' | 'day' | 'week';
}) => {
  return request.get('/tickets/analytics/response-time', { params });
};

/**
 * 获取解决时间分析
 */
export const getResolutionTimeAnalysis = (params?: {
  startDate?: string;
  endDate?: string;
  groupBy?: 'hour' | 'day' | 'week';
}) => {
  return request.get('/tickets/analytics/resolution-time', { params });
};

/**
 * 获取工单趋势
 */
export const getTicketTrend = (params?: {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}) => {
  return request.get('/tickets/analytics/trend', { params });
};

/**
 * 获取满意度统计
 */
export const getSatisfactionStats = (params?: {
  startDate?: string;
  endDate?: string;
  agentId?: string;
}) => {
  return request.get('/tickets/analytics/satisfaction', { params });
};

// ==================== SLA 管理 ====================

/**
 * 获取 SLA 状态
 */
export const getSLAStatus = (ticketId?: string) => {
  const endpoint = ticketId
    ? `/tickets/${ticketId}/sla`
    : '/tickets/sla/overview';
  return request.get(endpoint);
};

/**
 * 获取违反 SLA 的工单
 */
export const getSLAViolations = (params?: {
  severity?: 'warning' | 'critical';
  limit?: number;
}) => {
  return request.get('/tickets/sla/violations', { params });
};

// ==================== 标签管理 ====================

/**
 * 获取所有标签
 */
export const getAllTags = () => {
  return request.get<string[]>('/tickets/tags');
};

/**
 * 添加标签到工单
 */
export const addTagsToTicket = (ticketId: string, tags: string[]) => {
  return request.post(`/tickets/${ticketId}/tags`, { tags });
};

/**
 * 从工单移除标签
 */
export const removeTagFromTicket = (ticketId: string, tag: string) => {
  return request.delete(`/tickets/${ticketId}/tags/${tag}`);
};

// ==================== 模板管理 ====================

/**
 * 获取回复模板列表
 */
export const getReplyTemplates = (params?: {
  type?: TicketType;
  keyword?: string;
}) => {
  return request.get('/tickets/templates/replies', { params });
};

/**
 * 创建回复模板
 */
export const createReplyTemplate = (data: {
  title: string;
  content: string;
  type?: TicketType;
  tags?: string[];
}) => {
  return request.post('/tickets/templates/replies', data);
};

/**
 * 更新回复模板
 */
export const updateReplyTemplate = (id: string, data: {
  title?: string;
  content?: string;
  type?: TicketType;
  tags?: string[];
}) => {
  return request.put(`/tickets/templates/replies/${id}`, data);
};

/**
 * 删除回复模板
 */
export const deleteReplyTemplate = (id: string) => {
  return request.delete(`/tickets/templates/replies/${id}`);
};

// ==================== 导出功能 ====================

/**
 * 导出工单数据
 */
export const exportTickets = (params?: {
  startDate?: string;
  endDate?: string;
  status?: TicketStatus;
  format?: 'csv' | 'excel';
}) => {
  return request.get('/tickets/export', {
    params,
    responseType: 'blob',
  });
};

/**
 * 导出统计报表
 */
export const exportStatisticsReport = (params?: {
  startDate?: string;
  endDate?: string;
  format?: 'pdf' | 'excel';
}) => {
  return request.get('/tickets/statistics/export', {
    params,
    responseType: 'blob',
  });
};
