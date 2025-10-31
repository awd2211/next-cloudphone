import request from '@/utils/request';

// 工单类型
export enum TicketType {
  TECHNICAL = 'technical', // 技术问题
  BILLING = 'billing', // 账单问题
  DEVICE = 'device', // 设备问题
  APP = 'app', // 应用问题
  FEATURE = 'feature', // 功能建议
  OTHER = 'other', // 其他
}

// 工单优先级
export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// 工单状态
export enum TicketStatus {
  OPEN = 'open', // 待处理
  IN_PROGRESS = 'in_progress', // 处理中
  WAITING = 'waiting', // 等待用户
  RESOLVED = 'resolved', // 已解决
  CLOSED = 'closed', // 已关闭
}

// 工单接口
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
  tags?: string[];
  attachments?: Attachment[];
}

// 附件接口
export interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

// 工单回复接口
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

// 创建工单参数
export interface CreateTicketDto {
  title: string;
  type: TicketType;
  priority: TicketPriority;
  description: string;
  tags?: string[];
  attachmentIds?: string[];
}

// 添加回复参数
export interface AddReplyDto {
  content: string;
  attachmentIds?: string[];
}

// 工单列表查询参数
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

// 工单列表响应
export interface TicketListResponse {
  items: Ticket[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 获取工单列表
 */
export const getTickets = (params?: TicketListQuery): Promise<TicketListResponse> => {
  return request({
    url: '/tickets',
    method: 'GET',
    params,
  });
};

/**
 * 获取工单详情
 */
export const getTicketDetail = (id: string): Promise<Ticket> => {
  return request({
    url: `/tickets/${id}`,
    method: 'GET',
  });
};

/**
 * 创建工单
 */
export const createTicket = (data: CreateTicketDto): Promise<Ticket> => {
  return request({
    url: '/tickets',
    method: 'POST',
    data,
  });
};

/**
 * 更新工单
 */
export const updateTicket = (id: string, data: Partial<CreateTicketDto>): Promise<Ticket> => {
  return request({
    url: `/tickets/${id}`,
    method: 'PUT',
    data,
  });
};

/**
 * 关闭工单
 */
export const closeTicket = (id: string): Promise<void> => {
  return request({
    url: `/tickets/${id}/close`,
    method: 'POST',
  });
};

/**
 * 重新打开工单
 */
export const reopenTicket = (id: string): Promise<void> => {
  return request({
    url: `/tickets/${id}/reopen`,
    method: 'POST',
  });
};

/**
 * 获取工单回复列表
 */
export const getTicketReplies = (ticketId: string): Promise<TicketReply[]> => {
  return request({
    url: `/tickets/${ticketId}/replies`,
    method: 'GET',
  });
};

/**
 * 添加工单回复
 */
export const addTicketReply = (ticketId: string, data: AddReplyDto): Promise<TicketReply> => {
  return request({
    url: `/tickets/${ticketId}/replies`,
    method: 'POST',
    data,
  });
};

/**
 * 上传附件
 */
export const uploadAttachment = (file: File): Promise<Attachment> => {
  const formData = new FormData();
  formData.append('file', file);

  return request({
    url: '/tickets/attachments/upload',
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * 删除附件
 */
export const deleteAttachment = (id: string): Promise<void> => {
  return request({
    url: `/tickets/attachments/${id}`,
    method: 'DELETE',
  });
};

/**
 * 获取工单统计
 */
export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  closed: number;
}

export const getTicketStats = (): Promise<TicketStats> => {
  return request({
    url: '/tickets/stats',
    method: 'GET',
  });
};
