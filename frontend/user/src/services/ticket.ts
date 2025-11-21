import request from '@/utils/request';

/**
 * 工单服务 API (用户端)
 * 提供用户提交工单、查看工单、回复工单等功能
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
  attachments?: Attachment[];
  createdAt: string;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  closed: number;
}

export interface CreateTicketDto {
  title: string;
  type: TicketType;
  priority: TicketPriority;
  description: string;
  tags?: string[];
  attachmentIds?: string[];
}

export interface UpdateTicketDto {
  title?: string;
  type?: TicketType;
  priority?: TicketPriority;
  description?: string;
  tags?: string[];
}

export interface AddReplyDto {
  content: string;
  attachmentIds?: string[];
}

export interface TicketListQuery {
  page?: number;
  pageSize?: number;
  status?: TicketStatus;
  type?: TicketType;
  priority?: TicketPriority;
  keyword?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

export interface TicketListResponse {
  items: Ticket[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== 工单管理 ====================

/**
 * 获取我的工单列表
 */
export const getMyTickets = (params?: TicketListQuery) => {
  return request.get<TicketListResponse>('/tickets/my', { params });
};

/**
 * 获取工单详情
 */
export const getTicketDetail = (id: string) => {
  return request.get<Ticket>(`/tickets/${id}`);
};

/**
 * 创建工单
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
 * 关闭工单
 */
export const closeTicket = (id: string) => {
  return request.post(`/tickets/${id}/close`);
};

/**
 * 重新打开工单
 */
export const reopenTicket = (id: string, reason?: string) => {
  return request.post(`/tickets/${id}/reopen`, { reason });
};

// ==================== 回复管理 ====================

/**
 * 获取工单回复列表
 */
export const getTicketReplies = (ticketId: string) => {
  return request.get<TicketReply[]>(`/tickets/${ticketId}/replies`);
};

/**
 * 添加工单回复
 */
export const addTicketReply = (ticketId: string, data: AddReplyDto) => {
  return request.post<TicketReply>(`/tickets/${ticketId}/replies`, data);
};

// ==================== 附件管理 ====================

/**
 * 上传附件
 */
export const uploadAttachment = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return request.post<Attachment>('/tickets/attachments/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * 删除附件
 */
export const deleteAttachment = (id: string) => {
  return request.delete(`/tickets/attachments/${id}`);
};

/**
 * 下载附件
 */
export const downloadAttachment = (id: string, filename: string) => {
  return request.get(`/tickets/attachments/${id}/download`, {
    responseType: 'blob',
  }).then((blob: Blob) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  });
};

// ==================== 统计数据 ====================

/**
 * 获取我的工单统计
 */
export const getMyTicketStats = () => {
  return request.get<TicketStats>('/tickets/my/stats');
};

/**
 * 获取未读回复数量
 */
export const getUnreadRepliesCount = () => {
  return request.get<{ count: number }>('/tickets/unread-replies/count');
};

// ==================== 评分与反馈 ====================

/**
 * 对工单进行评分
 */
export const rateTicket = (id: string, rating: number, feedback?: string) => {
  return request.post(`/tickets/${id}/rate`, { rating, feedback });
};

/**
 * 提交满意度调查
 */
export const submitSatisfactionSurvey = (ticketId: string, data: {
  responseTime: number;
  solutionQuality: number;
  agentAttitude: number;
  overallSatisfaction: number;
  suggestions?: string;
}) => {
  return request.post(`/tickets/${ticketId}/satisfaction-survey`, data);
};

// ==================== 快捷操作 ====================

/**
 * 获取常见问题（可能相关的工单）
 */
export const getRelatedTickets = (keyword: string) => {
  return request.get<Ticket[]>('/tickets/search/related', {
    params: { keyword, limit: 5 },
  });
};

/**
 * 获取建议的标签
 */
export const getSuggestedTags = (title: string, description: string) => {
  return request.post<string[]>('/tickets/suggest-tags', {
    title,
    description,
  });
};

/**
 * 标记回复为已读
 */
export const markReplyAsRead = (ticketId: string, replyId: string) => {
  return request.post(`/tickets/${ticketId}/replies/${replyId}/mark-read`);
};

/**
 * 批量标记回复为已读
 */
export const markAllRepliesAsRead = (ticketId: string) => {
  return request.post(`/tickets/${ticketId}/replies/mark-all-read`);
};

// ==================== 通知设置 ====================

/**
 * 获取工单通知设置
 */
export const getTicketNotificationSettings = () => {
  return request.get('/tickets/notification-settings');
};

/**
 * 更新工单通知设置
 */
export const updateTicketNotificationSettings = (data: {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  notifyOnReply?: boolean;
  notifyOnStatusChange?: boolean;
}) => {
  return request.put('/tickets/notification-settings', data);
};
