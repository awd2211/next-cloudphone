/**
 * LiveChat 在线客服服务 API
 * 所有路由使用 /livechat/* 前缀
 */
import { api } from '@/utils/api';

// ==================== 类型定义 ====================

// 客服状态
export type AgentStatus = 'online' | 'offline' | 'busy' | 'away';

// 会话状态
export type ConversationStatus = 'waiting' | 'active' | 'resolved' | 'closed';

// 消息类型
export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'system';

// 排队策略
export type RoutingStrategy = 'ROUND_ROBIN' | 'LEAST_BUSY' | 'SKILL_BASED' | 'PRIORITY' | 'RANDOM';

// 客服实体
export interface Agent {
  id: string;
  userId: string;
  displayName: string;
  avatar?: string;
  status: AgentStatus;
  groupId?: string;
  group?: AgentGroup;
  maxConcurrentChats: number;
  currentChats: number;
  skills: string[];
  rating: number;
  totalRatings: number;
  isOnline: boolean;
  lastActiveAt?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

// 客服分组
export interface AgentGroup {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

// 排队配置
export interface QueueConfig {
  id: string;
  name: string;
  description?: string;
  routingStrategy: RoutingStrategy;
  maxWaitTime: number;
  priority: number;
  groupId?: string;
  isDefault: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

// 快捷回复
export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  shortcut?: string;
  category?: string;
  groupId?: string;
  useCount: number;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

// 敏感词
export interface SensitiveWord {
  id: string;
  word: string;
  level: 'low' | 'medium' | 'high';
  replacement?: string;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
}

// 会话
export interface Conversation {
  id: string;
  visitorId: string;
  visitorName?: string;
  agentId?: string;
  agent?: Agent;
  status: ConversationStatus;
  subject?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
  metadata?: Record<string, any>;
  rating?: number;
  ratingComment?: string;
  startedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

// 消息
export interface Message {
  id: string;
  conversationId: string;
  sender: 'visitor' | 'agent' | 'system' | 'ai';
  senderId?: string;
  content: string;
  type: MessageType;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

// 质检评分
export interface QualityReview {
  id: string;
  conversationId: string;
  agentId: string;
  reviewerId: string;
  score: number;
  categories: {
    greeting: number;
    professionalism: number;
    problemSolving: number;
    responseSpeed: number;
  };
  comment?: string;
  status: 'pending' | 'completed' | 'disputed';
  createdAt: string;
}

// 统计概览
export interface AnalyticsOverview {
  totalConversations: number;
  resolvedConversations: number;
  resolutionRate: number;
  avgResponseTime: number;
  avgRating: number;
}

// 客服绩效
export interface AgentPerformance {
  agentId: string;
  agentName: string;
  totalConversations: number;
  resolvedConversations: number;
  avgResponseTime: number;
  avgRating: number;
  totalRatings: number;
}

// ==================== 客服管理 API ====================

// 获取客服列表
export const getAgents = (params?: { status?: AgentStatus; groupId?: string }): Promise<Agent[]> =>
  api.get<Agent[]>('/livechat/agents', { params });

// 获取可用客服
export const getAvailableAgents = (): Promise<Agent[]> =>
  api.get<Agent[]>('/livechat/agents/available');

// 获取当前客服信息
export const getCurrentAgent = (): Promise<Agent> =>
  api.get<Agent>('/livechat/agents/me');

// 更新当前客服状态
export const updateAgentStatus = (status: AgentStatus): Promise<Agent> =>
  api.put<Agent>('/livechat/agents/me/status', { status });

// 获取客服详情
export const getAgent = (id: string): Promise<Agent> =>
  api.get<Agent>(`/livechat/agents/${id}`);

// 创建客服
export const createAgent = (data: {
  userId: string;
  displayName: string;
  groupId?: string;
  maxConcurrentChats?: number;
  skills?: string[];
}): Promise<Agent> =>
  api.post<Agent>('/livechat/agents', data);

// 更新客服
export const updateAgent = (id: string, data: Partial<Agent>): Promise<Agent> =>
  api.put<Agent>(`/livechat/agents/${id}`, data);

// 获取客服统计
export const getAgentStats = (id: string): Promise<{
  totalConversations: number;
  resolvedConversations: number;
  avgResponseTime: number;
  avgRating: number;
}> =>
  api.get(`/livechat/agents/${id}/stats`);

// ==================== 客服分组 API ====================

// 获取分组列表
export const getAgentGroups = (): Promise<AgentGroup[]> =>
  api.get<AgentGroup[]>('/livechat/agents/groups/list');

// 创建分组
export const createAgentGroup = (data: {
  name: string;
  description?: string;
  isDefault?: boolean;
}): Promise<AgentGroup> =>
  api.post<AgentGroup>('/livechat/agents/groups', data);

// 更新分组
export const updateAgentGroup = (id: string, data: Partial<AgentGroup>): Promise<AgentGroup> =>
  api.put<AgentGroup>(`/livechat/agents/groups/${id}`, data);

// 删除分组
export const deleteAgentGroup = (id: string): Promise<void> =>
  api.delete<void>(`/livechat/agents/groups/${id}`);

// ==================== 排队配置 API ====================

// 获取排队配置列表
export const getQueueConfigs = (): Promise<QueueConfig[]> =>
  api.get<QueueConfig[]>('/livechat/queues/configs');

// 创建排队配置
export const createQueueConfig = (data: {
  name: string;
  description?: string;
  routingStrategy: RoutingStrategy;
  maxWaitTime?: number;
  priority?: number;
  groupId?: string;
  isDefault?: boolean;
}): Promise<QueueConfig> =>
  api.post<QueueConfig>('/livechat/queues/configs', data);

// 更新排队配置
export const updateQueueConfig = (id: string, data: Partial<QueueConfig>): Promise<QueueConfig> =>
  api.put<QueueConfig>(`/livechat/queues/configs/${id}`, data);

// 删除排队配置
export const deleteQueueConfig = (id: string): Promise<void> =>
  api.delete<void>(`/livechat/queues/configs/${id}`);

// 获取排队统计
export const getQueueStats = (): Promise<{
  waitingCount: number;
  avgWaitTime: number;
  maxWaitTime: number;
}> =>
  api.get('/livechat/queues/stats');

// ==================== 快捷回复 API ====================

// 获取快捷回复列表
export const getCannedResponses = (): Promise<CannedResponse[]> =>
  api.get<CannedResponse[]>('/livechat/agents/canned-responses/list');

// 创建快捷回复
export const createCannedResponse = (data: {
  title: string;
  content: string;
  shortcut?: string;
  category?: string;
  groupId?: string;
}): Promise<CannedResponse> =>
  api.post<CannedResponse>('/livechat/agents/canned-responses', data);

// 更新快捷回复
export const updateCannedResponse = (id: string, data: Partial<CannedResponse>): Promise<CannedResponse> =>
  api.put<CannedResponse>(`/livechat/agents/canned-responses/${id}`, data);

// 删除快捷回复
export const deleteCannedResponse = (id: string): Promise<void> =>
  api.delete<void>(`/livechat/agents/canned-responses/${id}`);

// 使用快捷回复（增加使用次数）
export const useCannedResponse = (id: string): Promise<void> =>
  api.post<void>(`/livechat/agents/canned-responses/${id}/use`);

// ==================== 敏感词管理 API ====================

// 获取敏感词列表
export const getSensitiveWords = (): Promise<SensitiveWord[]> =>
  api.get<SensitiveWord[]>('/livechat/quality/sensitive-words');

// 创建敏感词
export const createSensitiveWord = (data: {
  word: string;
  level?: 'low' | 'medium' | 'high';
  replacement?: string;
  isActive?: boolean;
}): Promise<SensitiveWord> =>
  api.post<SensitiveWord>('/livechat/quality/sensitive-words', data);

// 更新敏感词
export const updateSensitiveWord = (id: string, data: Partial<SensitiveWord>): Promise<SensitiveWord> =>
  api.put<SensitiveWord>(`/livechat/quality/sensitive-words/${id}`, data);

// 删除敏感词
export const deleteSensitiveWord = (id: string): Promise<void> =>
  api.delete<void>(`/livechat/quality/sensitive-words/${id}`);

// 检查敏感词
export const checkSensitiveWords = (content: string): Promise<{
  hasSensitiveWords: boolean;
  words: string[];
  filteredContent: string;
}> =>
  api.post('/livechat/quality/check', { content });

// ==================== 会话管理 API ====================

// 获取会话列表
export const getConversations = (params?: {
  status?: ConversationStatus;
  agentId?: string;
  limit?: number;
  offset?: number;
}): Promise<Conversation[]> =>
  api.get<Conversation[]>('/livechat/chat/conversations', { params });

// 获取客服的会话列表
export const getAgentConversations = (): Promise<Conversation[]> =>
  api.get<Conversation[]>('/livechat/chat/agent/conversations');

// 获取会话详情
export const getConversation = (id: string): Promise<Conversation> =>
  api.get<Conversation>(`/livechat/chat/conversations/${id}`);

// 获取会话消息
export const getConversationMessages = (id: string, params?: {
  limit?: number;
  before?: string;
}): Promise<Message[]> =>
  api.get<Message[]>(`/livechat/chat/conversations/${id}/messages`, { params });

// 分配客服
export const assignAgent = (conversationId: string, agentId: string): Promise<Conversation> =>
  api.post<Conversation>(`/livechat/chat/conversations/${conversationId}/assign`, { agentId });

// 转接会话
export const transferConversation = (conversationId: string, targetAgentId: string, reason?: string): Promise<Conversation> =>
  api.post<Conversation>(`/livechat/chat/conversations/${conversationId}/transfer`, { targetAgentId, reason });

// 关闭会话
export const closeConversation = (conversationId: string): Promise<Conversation> =>
  api.post<Conversation>(`/livechat/chat/conversations/${conversationId}/close`);

// 获取等待统计
export const getWaitingStats = (): Promise<{ count: number }> =>
  api.get('/livechat/chat/stats/waiting');

// 获取活跃统计
export const getActiveStats = (): Promise<{ count: number }> =>
  api.get('/livechat/chat/stats/active');

// ==================== 质检管理 API ====================

// 获取质检列表
export const getQualityReviews = (params?: {
  agentId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<QualityReview[]> =>
  api.get<QualityReview[]>('/livechat/quality/reviews', { params });

// 创建质检评分
export const createQualityReview = (data: {
  conversationId: string;
  agentId: string;
  score: number;
  categories: {
    greeting: number;
    professionalism: number;
    problemSolving: number;
    responseSpeed: number;
  };
  comment?: string;
}): Promise<QualityReview> =>
  api.post<QualityReview>('/livechat/quality/reviews', data);

// 获取客服质检列表
export const getAgentQualityReviews = (agentId: string): Promise<QualityReview[]> =>
  api.get<QualityReview[]>(`/livechat/quality/reviews/agent/${agentId}`);

// ==================== 数据统计 API ====================

// 获取概览统计
export const getAnalyticsOverview = (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<AnalyticsOverview> =>
  api.get<AnalyticsOverview>('/livechat/analytics/overview', { params });

// 获取会话趋势
export const getConversationTrends = (days?: number): Promise<{
  date: string;
  total: number;
  resolved: number;
}[]> =>
  api.get('/livechat/analytics/trends', { params: { days } });

// 获取客服绩效
export const getAgentPerformance = (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<AgentPerformance[]> =>
  api.get<AgentPerformance[]>('/livechat/analytics/agents', { params });

// 获取评分分布
export const getRatingDistribution = (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ rating: number; count: number }[]> =>
  api.get('/livechat/analytics/ratings', { params });

// 获取高峰时段
export const getPeakHours = (days?: number): Promise<{ hour: number; count: number }[]> =>
  api.get('/livechat/analytics/peak-hours', { params: { days } });

// ==================== 归档管理 API ====================

// 获取归档统计
export const getArchiveStats = (): Promise<{
  totalArchived: number;
  oldestArchive: string | null;
  pendingDeletion: number;
}> =>
  api.get('/livechat/archives/stats');

// 搜索归档消息
export const searchArchives = (params?: {
  conversationId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<any[]> =>
  api.get('/livechat/archives/search', { params });

// 手动归档会话
export const archiveConversation = (conversationId: string): Promise<void> =>
  api.post<void>(`/livechat/archives/${conversationId}/archive`);
