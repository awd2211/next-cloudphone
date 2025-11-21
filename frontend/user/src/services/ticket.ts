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
 * 后端暂未实现此端点
 */
export const closeTicket = (_id: string) => {
  console.warn('closeTicket: 后端暂未实现此端点');
  return Promise.reject(new Error('功能暂未实现'));
};

/**
 * 重新打开工单
 * 后端暂未实现此端点
 */
export const reopenTicket = (_id: string, _reason?: string) => {
  console.warn('reopenTicket: 后端暂未实现此端点');
  return Promise.reject(new Error('功能暂未实现'));
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
 * 后端暂未实现此端点
 */
export const uploadAttachment = (_file: File) => {
  console.warn('uploadAttachment: 后端暂未实现此端点');
  return Promise.reject(new Error('功能暂未实现'));
};

/**
 * 删除附件
 * 后端暂未实现此端点
 */
export const deleteAttachment = (_id: string) => {
  console.warn('deleteAttachment: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 下载附件
 * 后端暂未实现此端点
 */
export const downloadAttachment = (_id: string, _filename: string) => {
  console.warn('downloadAttachment: 后端暂未实现此端点');
  return Promise.reject(new Error('功能暂未实现'));
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
 * 后端暂未实现此端点
 */
export const getUnreadRepliesCount = () => {
  console.warn('getUnreadRepliesCount: 后端暂未实现此端点');
  return Promise.resolve({ count: 0 });
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
 * 后端暂未实现此端点
 */
export const submitSatisfactionSurvey = (_ticketId: string, _data: {
  responseTime: number;
  solutionQuality: number;
  agentAttitude: number;
  overallSatisfaction: number;
  suggestions?: string;
}) => {
  console.warn('submitSatisfactionSurvey: 后端暂未实现此端点');
  return Promise.resolve();
};

// ==================== 快捷操作 ====================

/**
 * 获取常见问题（可能相关的工单）
 * 后端暂未实现此端点
 */
export const getRelatedTickets = (_keyword: string) => {
  console.warn('getRelatedTickets: 后端暂未实现此端点');
  return Promise.resolve([] as Ticket[]);
};

/**
 * 获取建议的标签
 * 后端暂未实现此端点
 */
export const getSuggestedTags = (_title: string, _description: string) => {
  console.warn('getSuggestedTags: 后端暂未实现此端点');
  return Promise.resolve([] as string[]);
};

/**
 * 标记回复为已读
 * 后端暂未实现此端点
 */
export const markReplyAsRead = (_ticketId: string, _replyId: string) => {
  console.warn('markReplyAsRead: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 批量标记回复为已读
 * 后端暂未实现此端点
 */
export const markAllRepliesAsRead = (_ticketId: string) => {
  console.warn('markAllRepliesAsRead: 后端暂未实现此端点');
  return Promise.resolve();
};

// ==================== 通知设置 ====================

/**
 * 获取工单通知设置
 * 后端暂未实现此端点
 */
export const getTicketNotificationSettings = () => {
  console.warn('getTicketNotificationSettings: 后端暂未实现此端点');
  return Promise.resolve({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    notifyOnReply: true,
    notifyOnStatusChange: true,
  });
};

/**
 * 更新工单通知设置
 * 后端暂未实现此端点
 */
export const updateTicketNotificationSettings = (_data: {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  notifyOnReply?: boolean;
  notifyOnStatusChange?: boolean;
}) => {
  console.warn('updateTicketNotificationSettings: 后端暂未实现此端点');
  return Promise.resolve();
};
