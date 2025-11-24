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
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
}

// 消息编辑历史
export interface MessageEditHistory {
  content: string;
  editedAt: string;
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

// ==================== 消息编辑/撤回 API ====================

// 编辑消息
export const editMessage = (messageId: string, content: string): Promise<Message> =>
  api.put<Message>(`/livechat/chat/messages/${messageId}`, { content });

// 撤回消息
export const revokeMessage = (messageId: string, reason?: string): Promise<Message> =>
  api.post<Message>(`/livechat/chat/messages/${messageId}/revoke`, { reason });

// 获取消息详情（包含编辑历史）
export const getMessageDetail = (messageId: string): Promise<Message & {
  editHistory?: MessageEditHistory[];
}> =>
  api.get(`/livechat/chat/messages/${messageId}`);

// ==================== 会话监听/插话 API ====================

export type SupervisionMode = 'listen' | 'whisper' | 'barge';

export interface SupervisionSession {
  supervisorId: string;
  supervisorName: string;
  conversationId: string;
  mode: SupervisionMode;
  startedAt: string;
}

// 开始监听会话
export const startSupervision = (conversationId: string, mode: SupervisionMode): Promise<SupervisionSession> =>
  api.post<SupervisionSession>(`/livechat/supervision/${conversationId}/start`, { mode });

// 停止监听会话
export const stopSupervision = (conversationId: string): Promise<void> =>
  api.delete<void>(`/livechat/supervision/${conversationId}/stop`);

// 获取监听状态
export const getSupervisionSession = (conversationId: string): Promise<SupervisionSession | null> =>
  api.get(`/livechat/supervision/${conversationId}`);

// 获取会话的所有监督者
export const getConversationSupervisors = (conversationId: string): Promise<SupervisionSession[]> =>
  api.get<SupervisionSession[]>(`/livechat/supervision/${conversationId}/supervisors`);

// 发送悄悄话
export const sendWhisper = (conversationId: string, content: string): Promise<Message> =>
  api.post<Message>(`/livechat/supervision/${conversationId}/whisper`, { content });

// 发送插话
export const sendBarge = (conversationId: string, content: string): Promise<Message> =>
  api.post<Message>(`/livechat/supervision/${conversationId}/barge`, { content });

// 切换监听模式
export const changeSupervisionMode = (conversationId: string, mode: SupervisionMode): Promise<SupervisionSession> =>
  api.post<SupervisionSession>(`/livechat/supervision/${conversationId}/mode/${mode}`);

// 获取我正在监听的所有会话
export const getMySupervisorSessions = (): Promise<SupervisionSession[]> =>
  api.get<SupervisionSession[]>('/livechat/supervision/my/sessions');

// ==================== SLA 预警系统 API ====================

export type SlaMetricType =
  | 'first_response_time'
  | 'avg_response_time'
  | 'resolution_time'
  | 'wait_time'
  | 'queue_length'
  | 'satisfaction_rate'
  | 'resolution_rate';

export type SlaSeverity = 'warning' | 'critical';
export type SlaAlertStatus = 'active' | 'acknowledged' | 'resolved' | 'expired';
export type SlaActionType = 'notification' | 'email' | 'escalate' | 'auto_assign';

export interface SlaRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  metricType: SlaMetricType;
  severity: SlaSeverity;
  threshold: number;
  thresholdUnit: string;
  actions?: SlaActionType[];
  actionConfig?: {
    notifyRoles?: string[];
    emailRecipients?: string[];
    escalateTo?: string;
  };
  isActive: boolean;
  priorityFilter?: string[];
  groupFilter?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SlaAlert {
  id: string;
  tenantId: string;
  ruleId: string;
  rule?: SlaRule;
  conversationId?: string;
  agentId?: string;
  metricType: SlaMetricType;
  severity: SlaSeverity;
  currentValue: number;
  thresholdValue: number;
  status: SlaAlertStatus;
  message?: string;
  metadata?: Record<string, any>;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface SlaStats {
  activeAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  resolvedToday: number;
  metrics: Record<SlaMetricType, number>;
}

// SLA 规则管理
export const createSlaRule = (data: Partial<SlaRule>): Promise<SlaRule> =>
  api.post<SlaRule>('/livechat/sla/rules', data);

export const getSlaRules = (isActive?: boolean): Promise<SlaRule[]> =>
  api.get<SlaRule[]>('/livechat/sla/rules', { params: { isActive } });

export const getSlaRule = (id: string): Promise<SlaRule> =>
  api.get<SlaRule>(`/livechat/sla/rules/${id}`);

export const updateSlaRule = (id: string, data: Partial<SlaRule>): Promise<SlaRule> =>
  api.put<SlaRule>(`/livechat/sla/rules/${id}`, data);

export const deleteSlaRule = (id: string): Promise<void> =>
  api.delete<void>(`/livechat/sla/rules/${id}`);

// SLA 告警管理
export const getSlaAlerts = (params?: {
  status?: SlaAlertStatus;
  severity?: SlaSeverity;
  conversationId?: string;
  limit?: number;
}): Promise<SlaAlert[]> =>
  api.get<SlaAlert[]>('/livechat/sla/alerts', { params });

export const getActiveSlaAlerts = (): Promise<SlaAlert[]> =>
  api.get<SlaAlert[]>('/livechat/sla/alerts/active');

export const acknowledgeSlaAlert = (id: string): Promise<SlaAlert> =>
  api.post<SlaAlert>(`/livechat/sla/alerts/${id}/acknowledge`);

export const resolveSlaAlert = (id: string): Promise<SlaAlert> =>
  api.post<SlaAlert>(`/livechat/sla/alerts/${id}/resolve`);

// SLA 统计
export const getSlaStats = (): Promise<SlaStats> =>
  api.get<SlaStats>('/livechat/sla/stats');

// ==================== 智能机器人 ====================

// 意图匹配类型
export type IntentMatchType = 'keyword' | 'regex' | 'exact' | 'similarity';

// 意图回复类型
export type IntentResponseType = 'text' | 'rich_text' | 'quick_replies' | 'card' | 'transfer' | 'knowledge_base';

// 机器人会话状态
export type BotConversationStatus = 'bot_handling' | 'transferred' | 'user_ended' | 'timeout' | 'bot_resolved';

// 机器人实体
export interface Bot {
  id: string;
  tenantId: string;
  name: string;
  avatar?: string;
  description?: string;
  welcomeMessage: string;
  fallbackMessage: string;
  transferMessage: string;
  offlineMessage: string;
  isEnabled: boolean;
  isDefault: boolean;
  maxBotRounds: number;
  idleTimeout: number;
  workingHours?: Record<string, { start: string; end: string }>;
  intents?: BotIntent[];
  settings?: {
    enableTypingIndicator?: boolean;
    typingDelayMs?: number;
    enableQuickReplies?: boolean;
    enableFeedback?: boolean;
    aiEnabled?: boolean;
    aiModel?: string;
  };
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// 机器人意图
export interface BotIntent {
  id: string;
  botId: string;
  name: string;
  displayName: string;
  description?: string;
  matchType: IntentMatchType;
  matchRules: string[];
  similarityThreshold: number;
  responseType: IntentResponseType;
  responseContent: any;
  alternativeResponses?: any[];
  priority: number;
  isEnabled: boolean;
  hitCount: number;
  contextConditions?: {
    previousIntent?: string;
    sessionTags?: string[];
    userTags?: string[];
  };
  postActions?: {
    setSessionTags?: string[];
    setUserTags?: string[];
    triggerEvent?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// 机器人会话
export interface BotConversation {
  id: string;
  tenantId: string;
  botId: string;
  bot?: Bot;
  conversationId: string;
  userId: string;
  status: BotConversationStatus;
  botRounds: number;
  userMessageCount: number;
  matchedIntents: {
    intentId: string;
    intentName: string;
    userMessage: string;
    matchedAt: string;
    confidence?: number;
  }[];
  sessionTags: string[];
  transferReason?: string;
  transferredAt?: string;
  transferredToAgentId?: string;
  satisfactionScore?: number;
  userFeedback?: string;
  resolvedByBot: boolean;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 机器人回复
export interface BotResponse {
  type: 'text' | 'quick_replies' | 'card' | 'transfer' | 'knowledge';
  content: string;
  quickReplies?: string[];
  card?: {
    title: string;
    description?: string;
    image?: string;
    buttons?: { text: string; action: string }[];
  };
  transferTo?: string;
  knowledgeArticles?: { id: string; title: string; summary: string }[];
  matchedIntent?: {
    id: string;
    name: string;
    confidence: number;
  };
}

// 机器人统计
export interface BotStats {
  totalConversations: number;
  botResolvedCount: number;
  transferredCount: number;
  avgBotRounds: number;
  avgSatisfactionScore: number;
  topIntents: { intentId: string; intentName: string; hitCount: number }[];
  resolutionRate: number;
}

// 机器人 CRUD
export const createBot = (data: Partial<Bot>): Promise<Bot> =>
  api.post<Bot>('/livechat/bot', data);

export const getBots = (params?: { isEnabled?: boolean; page?: number; pageSize?: number }): Promise<{ items: Bot[]; total: number }> =>
  api.get<{ items: Bot[]; total: number }>('/livechat/bot', { params });

export const getBot = (id: string): Promise<Bot> =>
  api.get<Bot>(`/livechat/bot/${id}`);

export const getDefaultBot = (): Promise<Bot | null> =>
  api.get<Bot | null>('/livechat/bot/default');

export const updateBot = (id: string, data: Partial<Bot>): Promise<Bot> =>
  api.put<Bot>(`/livechat/bot/${id}`, data);

export const deleteBot = (id: string): Promise<void> =>
  api.delete<void>(`/livechat/bot/${id}`);

// 意图 CRUD
export const createIntent = (botId: string, data: Partial<BotIntent>): Promise<BotIntent> =>
  api.post<BotIntent>(`/livechat/bot/${botId}/intents`, data);

export const getIntents = (botId: string): Promise<BotIntent[]> =>
  api.get<BotIntent[]>(`/livechat/bot/${botId}/intents`);

export const updateIntent = (intentId: string, data: Partial<BotIntent>): Promise<BotIntent> =>
  api.put<BotIntent>(`/livechat/bot/intents/${intentId}`, data);

export const deleteIntent = (intentId: string): Promise<void> =>
  api.delete<void>(`/livechat/bot/intents/${intentId}`);

// 机器人交互
export const sendBotMessage = (conversationId: string, content: string): Promise<BotResponse> =>
  api.post<BotResponse>('/livechat/bot/message', { conversationId, content });

export const getBotWelcomeMessage = (): Promise<BotResponse | null> =>
  api.get<BotResponse | null>('/livechat/bot/welcome');

export const transferToAgent = (conversationId: string, reason?: string, preferredAgentId?: string): Promise<void> =>
  api.post<void>('/livechat/bot/transfer', { conversationId, reason, preferredAgentId });

// 机器人会话管理
export const getBotConversations = (params?: {
  botId?: string;
  status?: BotConversationStatus;
  resolvedByBot?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: BotConversation[]; total: number }> =>
  api.get<{ items: BotConversation[]; total: number }>('/livechat/bot/conversations', { params });

export const submitBotFeedback = (botConversationId: string, score: number, feedback?: string): Promise<void> =>
  api.post<void>(`/livechat/bot/conversations/${botConversationId}/feedback`, { botConversationId, score, feedback });

export const markBotConversationResolved = (botConversationId: string): Promise<void> =>
  api.post<void>(`/livechat/bot/conversations/${botConversationId}/resolve`);

// 机器人统计
export const getBotStats = (botId?: string): Promise<BotStats> =>
  api.get<BotStats>('/livechat/bot/stats', { params: { botId } });

// ==================== 满意度调查 ====================

// 调查问题类型
export type SurveyQuestionType = 'rating' | 'nps' | 'single' | 'multi' | 'text' | 'tags';

// 调查触发条件
export type SurveyTrigger = 'conversation_resolved' | 'conversation_closed' | 'agent_request' | 'scheduled' | 'bot_transfer';

// 调查响应状态
export type SurveyResponseStatus = 'pending' | 'completed' | 'expired' | 'skipped';

// 调查问题
export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  text: string;
  required: boolean;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  minLabel?: string;
  maxLabel?: string;
  category?: string;
  weight?: number;
}

// 调查模板
export interface SurveyTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  title: string;
  instruction?: string;
  thankYouMessage: string;
  questions: SurveyQuestion[];
  trigger: SurveyTrigger;
  delaySeconds: number;
  expiresInHours: number;
  isEnabled: boolean;
  isDefault: boolean;
  applicableGroupIds: string[];
  sentCount: number;
  completedCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// 调查响应
export interface SurveyResponseItem {
  id: string;
  tenantId: string;
  templateId: string;
  template?: SurveyTemplate;
  conversationId: string;
  userId: string;
  agentId: string;
  status: SurveyResponseStatus;
  answers?: {
    questionId: string;
    questionText: string;
    type: string;
    value: any;
    category?: string;
  }[];
  overallRating?: number;
  npsScore?: number;
  categoryRatings?: {
    responseSpeed?: number;
    professionalism?: number;
    problemSolving?: number;
    attitude?: number;
  };
  selectedTags?: string[];
  comment?: string;
  sentAt: string;
  completedAt?: string;
  expiresAt: string;
  completionTimeSeconds?: number;
  createdAt: string;
}

// 调查统计
export interface SurveyStats {
  totalSent: number;
  totalCompleted: number;
  completionRate: number;
  avgOverallRating: number;
  avgNpsScore: number;
  npsBreakdown: {
    promoters: number;
    passives: number;
    detractors: number;
    nps: number;
  };
  categoryAverages: {
    responseSpeed: number;
    professionalism: number;
    problemSolving: number;
    attitude: number;
  };
  ratingDistribution: {
    rating: number;
    count: number;
    percentage: number;
  }[];
  topTags: { tag: string; count: number }[];
  trendData: { date: string; avgRating: number; responseCount: number }[];
}

// 客服调查统计
export interface AgentSurveyStats {
  agentId: string;
  agentName?: string;
  totalResponses: number;
  avgOverallRating: number;
  avgNpsScore: number;
  categoryAverages: {
    responseSpeed: number;
    professionalism: number;
    problemSolving: number;
    attitude: number;
  };
}

// 调查模板 CRUD
export const createSurveyTemplate = (data: Partial<SurveyTemplate>): Promise<SurveyTemplate> =>
  api.post<SurveyTemplate>('/livechat/survey/templates', data);

export const getSurveyTemplates = (params?: {
  isEnabled?: boolean;
  trigger?: SurveyTrigger;
  page?: number;
  pageSize?: number;
}): Promise<{ items: SurveyTemplate[]; total: number }> =>
  api.get<{ items: SurveyTemplate[]; total: number }>('/livechat/survey/templates', { params });

export const getSurveyTemplate = (id: string): Promise<SurveyTemplate> =>
  api.get<SurveyTemplate>(`/livechat/survey/templates/${id}`);

export const getDefaultSurveyTemplate = (): Promise<SurveyTemplate | null> =>
  api.get<SurveyTemplate | null>('/livechat/survey/templates/default');

export const updateSurveyTemplate = (id: string, data: Partial<SurveyTemplate>): Promise<SurveyTemplate> =>
  api.put<SurveyTemplate>(`/livechat/survey/templates/${id}`, data);

export const deleteSurveyTemplate = (id: string): Promise<void> =>
  api.delete<void>(`/livechat/survey/templates/${id}`);

// 调查发送和响应
export const sendSurvey = (conversationId: string, templateId?: string): Promise<SurveyResponseItem> =>
  api.post<SurveyResponseItem>('/livechat/survey/send', { conversationId, templateId });

export const submitSurveyResponse = (surveyResponseId: string, answers: { questionId: string; value: any }[], comment?: string): Promise<SurveyResponseItem> =>
  api.post<SurveyResponseItem>('/livechat/survey/submit', { surveyResponseId, answers, comment });

export const skipSurvey = (surveyResponseId: string): Promise<void> =>
  api.post<void>(`/livechat/survey/responses/${surveyResponseId}/skip`);

export const getSurveyResponses = (params?: {
  templateId?: string;
  agentId?: string;
  status?: SurveyResponseStatus;
  startDate?: string;
  endDate?: string;
  minRating?: number;
  maxRating?: number;
  page?: number;
  pageSize?: number;
}): Promise<{ items: SurveyResponseItem[]; total: number }> =>
  api.get<{ items: SurveyResponseItem[]; total: number }>('/livechat/survey/responses', { params });

// 调查统计
export const getSurveyStats = (startDate?: string, endDate?: string): Promise<SurveyStats> =>
  api.get<SurveyStats>('/livechat/survey/stats', { params: { startDate, endDate } });

export const getAgentSurveyStats = (agentId: string): Promise<AgentSurveyStats> =>
  api.get<AgentSurveyStats>(`/livechat/survey/stats/agent/${agentId}`);

// ==================== 访客画像 ====================

// 访客来源
export type VisitorSource = 'direct' | 'search' | 'social' | 'referral' | 'ad' | 'email' | 'app' | 'other';

// 访客事件类型
export type VisitorEventType = 'page_view' | 'click' | 'form_submit' | 'chat_start' | 'chat_end' | 'purchase' | 'sign_up' | 'login' | 'search' | 'add_to_cart' | 'custom';

// 访客画像
export interface VisitorProfile {
  id: string;
  tenantId: string;
  visitorId: string;
  displayName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  source: VisitorSource;
  sourceDetail?: string;
  initialUrl?: string;
  firstVisitAt: string;
  lastVisitAt: string;
  totalVisits: number;
  totalConversations: number;
  totalMessages: number;
  avgSatisfactionScore?: number;
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
  };
  geoInfo?: {
    country?: string;
    city?: string;
    ip?: string;
  };
  customAttributes?: Record<string, any>;
  autoTags: string[];
  manualTags: string[];
  intentLevel?: number;
  valueLevel?: 'low' | 'medium' | 'high' | 'vip';
  topCategories?: { category: string; count: number }[];
  behaviorSummary?: {
    avgSessionDuration?: number;
    avgResponseTime?: number;
    peakHours?: number[];
  };
  notes?: string;
  isBlocked: boolean;
  blockedReason?: string;
  createdAt: string;
  updatedAt: string;
}

// 访客事件
export interface VisitorEvent {
  id: string;
  tenantId: string;
  visitorProfileId: string;
  sessionId: string;
  eventType: VisitorEventType;
  eventName?: string;
  pageUrl?: string;
  pageTitle?: string;
  referrer?: string;
  eventData?: Record<string, any>;
  duration?: number;
  createdAt: string;
}

// 访客统计
export interface VisitorStats {
  totalVisitors: number;
  newVisitorsToday: number;
  returningVisitors: number;
  avgConversationsPerVisitor: number;
  avgSatisfactionScore: number;
  sourceDistribution: { source: string; count: number; percentage: number }[];
  valueLevelDistribution: { level: string; count: number }[];
  topTags: { tag: string; count: number }[];
  deviceDistribution: { device: string; count: number }[];
  geoDistribution: { country: string; count: number }[];
}

// 访客时间线
export interface VisitorTimeline {
  events: {
    id: string;
    type: string;
    eventName?: string;
    pageUrl?: string;
    pageTitle?: string;
    eventData?: any;
    duration?: number;
    createdAt: string;
  }[];
  conversations: {
    id: string;
    status: string;
    agentName?: string;
    messageCount: number;
    satisfactionScore?: number;
    createdAt: string;
    resolvedAt?: string;
  }[];
}

// 访客画像 API
export const createOrUpdateVisitorProfile = (data: {
  visitorId: string;
  displayName?: string;
  email?: string;
  phone?: string;
  source?: VisitorSource;
  deviceInfo?: Record<string, any>;
  geoInfo?: Record<string, any>;
  customAttributes?: Record<string, any>;
}): Promise<VisitorProfile> =>
  api.post<VisitorProfile>('/livechat/visitor/profiles', data);

export const getVisitorProfiles = (params?: {
  search?: string;
  source?: VisitorSource;
  valueLevel?: string;
  tags?: string[];
  isBlocked?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}): Promise<{ items: VisitorProfile[]; total: number }> =>
  api.get<{ items: VisitorProfile[]; total: number }>('/livechat/visitor/profiles', { params });

export const getVisitorProfile = (id: string): Promise<VisitorProfile> =>
  api.get<VisitorProfile>(`/livechat/visitor/profiles/${id}`);

export const getVisitorProfileByVisitorId = (visitorId: string): Promise<VisitorProfile | null> =>
  api.get<VisitorProfile | null>(`/livechat/visitor/profiles/by-visitor/${visitorId}`);

export const updateVisitorProfile = (id: string, data: {
  displayName?: string;
  email?: string;
  phone?: string;
  manualTags?: string[];
  intentLevel?: number;
  valueLevel?: 'low' | 'medium' | 'high' | 'vip';
  customAttributes?: Record<string, any>;
  notes?: string;
}): Promise<VisitorProfile> =>
  api.put<VisitorProfile>(`/livechat/visitor/profiles/${id}`, data);

export const addVisitorTags = (profileId: string, tags: string[]): Promise<VisitorProfile> =>
  api.post<VisitorProfile>(`/livechat/visitor/profiles/${profileId}/tags`, { tags });

export const removeVisitorTags = (profileId: string, tags: string[]): Promise<VisitorProfile> =>
  api.delete<VisitorProfile>(`/livechat/visitor/profiles/${profileId}/tags`, { data: { tags } });

export const getVisitorTimeline = (profileId: string): Promise<VisitorTimeline> =>
  api.get<VisitorTimeline>(`/livechat/visitor/profiles/${profileId}/timeline`);

// 访客事件 API
export const trackVisitorEvent = (data: {
  visitorId: string;
  sessionId: string;
  eventType: VisitorEventType;
  eventName?: string;
  pageUrl?: string;
  pageTitle?: string;
  eventData?: Record<string, any>;
  duration?: number;
}): Promise<VisitorEvent> =>
  api.post<VisitorEvent>('/livechat/visitor/events/track', data);

export const getVisitorEvents = (params?: {
  visitorProfileId?: string;
  sessionId?: string;
  eventType?: VisitorEventType;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: VisitorEvent[]; total: number }> =>
  api.get<{ items: VisitorEvent[]; total: number }>('/livechat/visitor/events', { params });

// 访客统计 API
export const getVisitorStats = (): Promise<VisitorStats> =>
  api.get<VisitorStats>('/livechat/visitor/stats');

// ==================== 协同会话类型定义 ====================

// 协同角色
export type CollaboratorRole = 'primary' | 'assistant' | 'observer' | 'advisor';

// 协同状态
export type CollaborationStatus = 'invited' | 'joined' | 'declined' | 'left';

// 内部消息类型
export type InternalMessageType = 'text' | 'suggestion' | 'system' | 'knowledge' | 'canned_response';

// 协同信息
export interface CollaborationInfo {
  id: string;
  conversationId: string;
  agentId: string;
  agentName: string;
  agentAvatar?: string;
  role: CollaboratorRole;
  status: CollaborationStatus;
  invitedBy?: string;
  invitedByName?: string;
  inviteReason?: string;
  joinedAt?: string;
  messageCount: number;
}

// 会话协同者列表
export interface ConversationCollaborators {
  conversationId: string;
  primaryAgent: CollaborationInfo | null;
  collaborators: CollaborationInfo[];
  pendingInvitations: CollaborationInfo[];
}

// 协同记录
export interface ConversationCollaboration {
  id: string;
  tenantId: string;
  conversationId: string;
  agentId: string;
  agent?: Agent;
  conversation?: Conversation;
  role: CollaboratorRole;
  status: CollaborationStatus;
  invitedBy?: string;
  inviteReason?: string;
  joinedAt?: string;
  leftAt?: string;
  leftReason?: string;
  messageCount: number;
  internalMessageCount: number;
  createdAt: string;
  updatedAt: string;
}

// 内部消息
export interface InternalMessage {
  id: string;
  tenantId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  recipientIds: string[];
  type: InternalMessageType;
  content: string;
  metadata?: {
    knowledgeArticleId?: string;
    cannedResponseId?: string;
    suggestedReply?: string;
    priority?: 'low' | 'normal' | 'high';
  };
  readBy: string[];
  createdAt: string;
}

// ==================== 协同会话 API ====================

// 邀请客服协同
export const inviteCollaborator = (data: {
  conversationId: string;
  agentId: string;
  role?: CollaboratorRole;
  reason?: string;
}): Promise<ConversationCollaboration> =>
  api.post<ConversationCollaboration>('/livechat/collaborations/invite', data);

// 响应协同邀请
export const respondToCollaborationInvitation = (data: {
  collaborationId: string;
  action: 'accept' | 'decline';
  reason?: string;
}): Promise<ConversationCollaboration> =>
  api.post<ConversationCollaboration>('/livechat/collaborations/respond', data);

// 退出协同
export const leaveCollaboration = (data: {
  collaborationId: string;
  reason?: string;
}): Promise<void> =>
  api.post<void>('/livechat/collaborations/leave', data);

// 更新协同角色
export const updateCollaboratorRole = (data: {
  collaborationId: string;
  role: CollaboratorRole;
}): Promise<ConversationCollaboration> =>
  api.put<ConversationCollaboration>('/livechat/collaborations/role', data);

// 获取会话协同者列表
export const getCollaborators = (conversationId: string): Promise<ConversationCollaborators> =>
  api.get<ConversationCollaborators>(`/livechat/collaborations/conversation/${conversationId}`);

// 获取我的协同列表
export const getMyCollaborations = (params?: {
  status?: CollaborationStatus;
  page?: number;
  pageSize?: number;
}): Promise<{ items: ConversationCollaboration[]; total: number }> =>
  api.get<{ items: ConversationCollaboration[]; total: number }>('/livechat/collaborations/my', { params });

// 获取待处理的邀请
export const getPendingCollaborationInvitations = (): Promise<ConversationCollaboration[]> =>
  api.get<ConversationCollaboration[]>('/livechat/collaborations/pending');

// 检查协同状态
export const checkCollaboratorStatus = (conversationId: string): Promise<{
  isCollaborator: boolean;
  canSendMessage: boolean;
}> =>
  api.get<{ isCollaborator: boolean; canSendMessage: boolean }>(`/livechat/collaborations/check/${conversationId}`);

// ==================== 内部消息 API ====================

// 发送内部消息
export const sendInternalMessage = (data: {
  conversationId: string;
  content: string;
  type?: InternalMessageType;
  recipientIds?: string[];
  metadata?: {
    knowledgeArticleId?: string;
    cannedResponseId?: string;
    suggestedReply?: string;
    priority?: 'low' | 'normal' | 'high';
  };
}): Promise<InternalMessage> =>
  api.post<InternalMessage>('/livechat/collaborations/messages', data);

// 获取内部消息
export const getInternalMessages = (params: {
  conversationId: string;
  type?: InternalMessageType;
  page?: number;
  pageSize?: number;
}): Promise<{ items: InternalMessage[]; total: number }> =>
  api.get<{ items: InternalMessage[]; total: number }>('/livechat/collaborations/messages', { params });

// 标记消息已读
export const markInternalMessagesRead = (messageIds: string[]): Promise<{ success: boolean }> =>
  api.post<{ success: boolean }>('/livechat/collaborations/messages/read', { messageIds });

// ==================== 排班管理类型定义 ====================

// 排班状态
export type ScheduleStatus = 'scheduled' | 'confirmed' | 'working' | 'completed' | 'absent' | 'leave' | 'cancelled';

// 请假类型
export type LeaveType = 'annual' | 'sick' | 'personal' | 'compensatory' | 'other';

// 周期类型
export type RecurrenceType = 'daily' | 'weekly' | 'biweekly' | 'monthly';

// 班次模板
export interface ShiftTemplate {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  startTime: string;
  endTime: string;
  crossDay: boolean;
  breakTimes: {
    startTime: string;
    endTime: string;
    name?: string;
  }[];
  workDuration: number;
  color: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// 客服排班
export interface AgentSchedule {
  id: string;
  tenantId: string;
  agentId: string;
  agent?: Agent;
  scheduleDate: string;
  shiftTemplateId?: string;
  shiftTemplate?: ShiftTemplate;
  shiftName?: string;
  startTime: string;
  endTime: string;
  crossDay: boolean;
  status: ScheduleStatus;
  actualStartTime?: string;
  actualEndTime?: string;
  leaveType?: LeaveType;
  leaveReason?: string;
  leaveApprovedBy?: string;
  leaveApprovedAt?: string;
  workStats?: {
    totalChats?: number;
    avgResponseTime?: number;
    avgSatisfaction?: number;
    totalWorkMinutes?: number;
    totalBreakMinutes?: number;
    lateMinutes?: number;
    earlyLeaveMinutes?: number;
    overtimeMinutes?: number;
  };
  notes?: string;
  color: string;
  isRecurring: boolean;
  recurringRuleId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// 周期性排班规则
export interface RecurringSchedule {
  id: string;
  tenantId: string;
  agentId: string;
  agent?: Agent;
  name: string;
  recurrenceType: RecurrenceType;
  shiftTemplateId: string;
  shiftTemplate?: ShiftTemplate;
  daysOfWeek: number[];
  daysOfMonth: number[];
  effectiveFrom: string;
  effectiveUntil?: string;
  excludeDates: string[];
  isActive: boolean;
  lastGeneratedDate?: string;
  createdBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 排班日历视图
export interface ScheduleCalendarView {
  date: string;
  schedules: {
    id: string;
    agentId: string;
    agentName: string;
    agentAvatar?: string;
    shiftName: string;
    startTime: string;
    endTime: string;
    status: ScheduleStatus;
    color: string;
  }[];
}

// 客服排班统计
export interface AgentScheduleStats {
  agentId: string;
  agentName: string;
  period: {
    startDate: string;
    endDate: string;
  };
  totalScheduledDays: number;
  totalWorkedDays: number;
  totalAbsentDays: number;
  totalLeaveDays: number;
  totalWorkMinutes: number;
  totalOvertimeMinutes: number;
  avgLateMinutes: number;
  attendance: {
    scheduled: number;
    completed: number;
    absent: number;
    leave: number;
  };
}

// 每日排班概览
export interface DailyScheduleOverview {
  date: string;
  totalAgents: number;
  scheduledAgents: number;
  workingAgents: number;
  onLeaveAgents: number;
  absentAgents: number;
  shifts: {
    shiftName: string;
    agentCount: number;
    color: string;
  }[];
}

// ==================== 班次模板 API ====================

export const createShiftTemplate = (data: {
  name: string;
  code?: string;
  startTime: string;
  endTime: string;
  crossDay?: boolean;
  breakTimes?: { startTime: string; endTime: string; name?: string }[];
  color?: string;
  description?: string;
}): Promise<ShiftTemplate> =>
  api.post<ShiftTemplate>('/livechat/scheduling/shifts', data);

export const updateShiftTemplate = (id: string, data: {
  name?: string;
  code?: string;
  startTime?: string;
  endTime?: string;
  crossDay?: boolean;
  breakTimes?: { startTime: string; endTime: string; name?: string }[];
  color?: string;
  description?: string;
  isActive?: boolean;
}): Promise<ShiftTemplate> =>
  api.put<ShiftTemplate>(`/livechat/scheduling/shifts/${id}`, data);

export const deleteShiftTemplate = (id: string): Promise<{ success: boolean }> =>
  api.delete<{ success: boolean }>(`/livechat/scheduling/shifts/${id}`);

export const getShiftTemplates = (params?: {
  isActive?: boolean;
  search?: string;
}): Promise<ShiftTemplate[]> =>
  api.get<ShiftTemplate[]>('/livechat/scheduling/shifts', { params });

export const getShiftTemplate = (id: string): Promise<ShiftTemplate> =>
  api.get<ShiftTemplate>(`/livechat/scheduling/shifts/${id}`);

// ==================== 排班 API ====================

export const createSchedule = (data: {
  agentId: string;
  scheduleDate: string;
  shiftTemplateId?: string;
  shiftName?: string;
  startTime: string;
  endTime: string;
  crossDay?: boolean;
  color?: string;
  notes?: string;
}): Promise<AgentSchedule> =>
  api.post<AgentSchedule>('/livechat/scheduling/schedules', data);

export const batchCreateSchedules = (data: {
  agentIds: string[];
  startDate: string;
  endDate: string;
  shiftTemplateId: string;
  daysOfWeek?: number[];
  notes?: string;
}): Promise<{ created: number; skipped: number }> =>
  api.post<{ created: number; skipped: number }>('/livechat/scheduling/schedules/batch', data);

export const updateSchedule = (id: string, data: {
  shiftTemplateId?: string;
  shiftName?: string;
  startTime?: string;
  endTime?: string;
  crossDay?: boolean;
  status?: ScheduleStatus;
  color?: string;
  notes?: string;
}): Promise<AgentSchedule> =>
  api.put<AgentSchedule>(`/livechat/scheduling/schedules/${id}`, data);

export const deleteSchedule = (id: string): Promise<{ success: boolean }> =>
  api.delete<{ success: boolean }>(`/livechat/scheduling/schedules/${id}`);

export const getSchedules = (params?: {
  agentId?: string;
  startDate?: string;
  endDate?: string;
  status?: ScheduleStatus;
  groupId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: AgentSchedule[]; total: number }> =>
  api.get<{ items: AgentSchedule[]; total: number }>('/livechat/scheduling/schedules', { params });

export const getScheduleCalendar = (params: {
  startDate: string;
  endDate: string;
  groupId?: string;
}): Promise<ScheduleCalendarView[]> =>
  api.get<ScheduleCalendarView[]>('/livechat/scheduling/schedules/calendar', { params });

export const requestLeave = (data: {
  scheduleId: string;
  leaveType: LeaveType;
  reason?: string;
}): Promise<AgentSchedule> =>
  api.post<AgentSchedule>('/livechat/scheduling/schedules/leave', data);

export const approveLeave = (data: {
  scheduleId: string;
  approved: boolean;
  reason?: string;
}): Promise<AgentSchedule> =>
  api.post<AgentSchedule>('/livechat/scheduling/schedules/leave/approve', data);

export const checkInOut = (data: {
  scheduleId: string;
  type: 'checkin' | 'checkout';
}): Promise<AgentSchedule> =>
  api.post<AgentSchedule>('/livechat/scheduling/schedules/check', data);

// ==================== 周期性排班 API ====================

export const createRecurringSchedule = (data: {
  agentId: string;
  name: string;
  recurrenceType: RecurrenceType;
  shiftTemplateId: string;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  effectiveFrom: string;
  effectiveUntil?: string;
  excludeDates?: string[];
  notes?: string;
}): Promise<RecurringSchedule> =>
  api.post<RecurringSchedule>('/livechat/scheduling/recurring', data);

export const updateRecurringSchedule = (id: string, data: {
  name?: string;
  shiftTemplateId?: string;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  effectiveUntil?: string;
  excludeDates?: string[];
  isActive?: boolean;
  notes?: string;
}): Promise<RecurringSchedule> =>
  api.put<RecurringSchedule>(`/livechat/scheduling/recurring/${id}`, data);

export const deleteRecurringSchedule = (id: string): Promise<{ success: boolean }> =>
  api.delete<{ success: boolean }>(`/livechat/scheduling/recurring/${id}`);

export const getRecurringSchedules = (agentId?: string): Promise<RecurringSchedule[]> =>
  api.get<RecurringSchedule[]>('/livechat/scheduling/recurring', { params: { agentId } });

// ==================== 排班统计 API ====================

export const getAgentScheduleStats = (
  agentId: string,
  startDate: string,
  endDate: string,
): Promise<AgentScheduleStats> =>
  api.get<AgentScheduleStats>(`/livechat/scheduling/stats/agent/${agentId}`, {
    params: { startDate, endDate },
  });

export const getDailyScheduleOverview = (date: string): Promise<DailyScheduleOverview> =>
  api.get<DailyScheduleOverview>('/livechat/scheduling/stats/daily', { params: { date } });

// ==================== 培训考核类型定义 ====================

// 课程类型
export type CourseType = 'onboarding' | 'skill_enhancement' | 'product_knowledge' | 'service_process' | 'communication' | 'compliance';

// 课程状态
export type CourseStatusType = 'draft' | 'published' | 'archived';

// 学习状态
export type EnrollmentStatusType = 'enrolled' | 'in_progress' | 'completed' | 'expired' | 'dropped';

// 考试状态
export type ExamStatusType = 'draft' | 'published' | 'archived';

// 题目类型
export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';

// 课时
export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'document' | 'quiz' | 'practice';
  content: string;
  duration?: number;
  order: number;
}

// 章节
export interface Chapter {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

// 培训课程
export interface TrainingCourse {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  type: CourseType;
  status: CourseStatusType;
  coverImage?: string;
  estimatedDuration: number;
  chapters: Chapter[];
  isMandatory: boolean;
  targetGroupIds: string[];
  passRequirements?: {
    minLessonsCompleted?: number;
    requireExamPass?: boolean;
    minExamScore?: number;
  };
  examId?: string;
  certificate?: {
    enabled: boolean;
    templateName?: string;
    validityDays?: number;
  };
  tags: string[];
  createdBy?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 学习报名
export interface TrainingEnrollment {
  id: string;
  tenantId: string;
  agentId: string;
  agent?: Agent;
  courseId: string;
  course?: TrainingCourse;
  status: EnrollmentStatusType;
  progress: number;
  completedLessons: {
    chapterId: string;
    lessonId: string;
    completedAt: string;
    duration?: number;
  }[];
  totalStudyTime: number;
  lastStudyAt?: string;
  currentPosition?: {
    chapterId: string;
    lessonId: string;
    progress?: number;
  };
  examScore?: number;
  examAttempts: number;
  isPassed: boolean;
  passedAt?: string;
  certificateId?: string;
  certificateIssuedAt?: string;
  certificateExpiresAt?: string;
  dueDate?: string;
  enrollmentSource: 'self' | 'assigned' | 'mandatory';
  assignedBy?: string;
  notes: {
    lessonId: string;
    content: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

// 题目选项
export interface QuestionOption {
  id: string;
  content: string;
  isCorrect?: boolean;
}

// 题目
export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  score: number;
  explanation?: string;
  order: number;
}

// 考试
export interface Exam {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  status: ExamStatusType;
  duration: number;
  totalScore: number;
  passingScore: number;
  maxAttempts: number;
  questions: Question[];
  randomizeQuestions: boolean;
  randomQuestionCount: number;
  randomizeOptions: boolean;
  showExplanation: boolean;
  explanationTiming: 'immediately' | 'after_submit' | 'after_all_attempts';
  courseId?: string;
  tags: string[];
  createdBy?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 考试记录
export interface ExamAttempt {
  id: string;
  tenantId: string;
  agentId: string;
  examId: string;
  startedAt: string;
  submittedAt?: string;
  answers: {
    questionId: string;
    answer: string | string[];
    isCorrect?: boolean;
    score?: number;
    answeredAt: string;
  }[];
  score?: number;
  isPassed: boolean;
  duration?: number;
  status: 'in_progress' | 'submitted' | 'graded' | 'expired';
  attemptNumber: number;
  questionOrder?: string[];
  createdAt: string;
  updatedAt: string;
}

// 课程统计
export interface CourseStats {
  courseId: string;
  title: string;
  totalEnrollments: number;
  completedCount: number;
  inProgressCount: number;
  passRate: number;
  avgScore: number;
  avgCompletionTime: number;
}

// 客服培训统计
export interface AgentTrainingStats {
  agentId: string;
  agentName: string;
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalStudyTime: number;
  avgExamScore: number;
  certificates: number;
}

// 排行榜条目
export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  agentAvatar?: string;
  totalScore: number;
  completedCourses: number;
  certificates: number;
}

// ==================== 培训课程 API ====================

export const createTrainingCourse = (data: {
  title: string;
  description?: string;
  type?: CourseType;
  coverImage?: string;
  estimatedDuration?: number;
  chapters?: Chapter[];
  isMandatory?: boolean;
  targetGroupIds?: string[];
  passRequirements?: TrainingCourse['passRequirements'];
  examId?: string;
  certificate?: TrainingCourse['certificate'];
  tags?: string[];
}): Promise<TrainingCourse> =>
  api.post<TrainingCourse>('/livechat/training/courses', data);

export const updateTrainingCourse = (id: string, data: {
  title?: string;
  description?: string;
  type?: CourseType;
  status?: CourseStatusType;
  coverImage?: string;
  estimatedDuration?: number;
  chapters?: Chapter[];
  isMandatory?: boolean;
  targetGroupIds?: string[];
  passRequirements?: TrainingCourse['passRequirements'];
  examId?: string;
  certificate?: TrainingCourse['certificate'];
  tags?: string[];
}): Promise<TrainingCourse> =>
  api.put<TrainingCourse>(`/livechat/training/courses/${id}`, data);

export const deleteTrainingCourse = (id: string): Promise<{ success: boolean }> =>
  api.delete<{ success: boolean }>(`/livechat/training/courses/${id}`);

export const getTrainingCourses = (params?: {
  type?: CourseType;
  status?: CourseStatusType;
  isMandatory?: boolean;
  search?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}): Promise<{ items: TrainingCourse[]; total: number }> =>
  api.get<{ items: TrainingCourse[]; total: number }>('/livechat/training/courses', { params });

export const getTrainingCourse = (id: string): Promise<TrainingCourse> =>
  api.get<TrainingCourse>(`/livechat/training/courses/${id}`);

// ==================== 学习报名 API ====================

export const enrollTrainingCourse = (data: {
  courseId: string;
  dueDate?: string;
}): Promise<TrainingEnrollment> =>
  api.post<TrainingEnrollment>('/livechat/training/enroll', data);

export const assignTrainingCourse = (data: {
  courseId: string;
  agentIds: string[];
  dueDate?: string;
}): Promise<{ enrolled: number; skipped: number }> =>
  api.post<{ enrolled: number; skipped: number }>('/livechat/training/assign', data);

export const updateLearningProgress = (data: {
  enrollmentId: string;
  chapterId: string;
  lessonId: string;
  duration?: number;
  completed?: boolean;
}): Promise<TrainingEnrollment> =>
  api.post<TrainingEnrollment>('/livechat/training/progress', data);

export const addLearningNote = (data: {
  enrollmentId: string;
  lessonId: string;
  content: string;
}): Promise<TrainingEnrollment> =>
  api.post<TrainingEnrollment>('/livechat/training/notes', data);

export const getTrainingEnrollments = (params?: {
  agentId?: string;
  courseId?: string;
  status?: EnrollmentStatusType;
  isPassed?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ items: TrainingEnrollment[]; total: number }> =>
  api.get<{ items: TrainingEnrollment[]; total: number }>('/livechat/training/enrollments', { params });

export const getMyTrainingEnrollments = (): Promise<TrainingEnrollment[]> =>
  api.get<TrainingEnrollment[]>('/livechat/training/my-enrollments');

// ==================== 考试 API ====================

export const createTrainingExam = (data: {
  title: string;
  description?: string;
  duration?: number;
  totalScore?: number;
  passingScore?: number;
  maxAttempts?: number;
  questions?: Question[];
  randomizeQuestions?: boolean;
  randomQuestionCount?: number;
  randomizeOptions?: boolean;
  showExplanation?: boolean;
  explanationTiming?: 'immediately' | 'after_submit' | 'after_all_attempts';
  courseId?: string;
  tags?: string[];
}): Promise<Exam> =>
  api.post<Exam>('/livechat/training/exams', data);

export const updateTrainingExam = (id: string, data: {
  title?: string;
  description?: string;
  status?: ExamStatusType;
  duration?: number;
  totalScore?: number;
  passingScore?: number;
  maxAttempts?: number;
  questions?: Question[];
  randomizeQuestions?: boolean;
  randomQuestionCount?: number;
  randomizeOptions?: boolean;
  showExplanation?: boolean;
  explanationTiming?: 'immediately' | 'after_submit' | 'after_all_attempts';
  tags?: string[];
}): Promise<Exam> =>
  api.put<Exam>(`/livechat/training/exams/${id}`, data);

export const deleteTrainingExam = (id: string): Promise<{ success: boolean }> =>
  api.delete<{ success: boolean }>(`/livechat/training/exams/${id}`);

export const getTrainingExams = (params?: {
  status?: ExamStatusType;
  search?: string;
  courseId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: Exam[]; total: number }> =>
  api.get<{ items: Exam[]; total: number }>('/livechat/training/exams', { params });

export const getTrainingExam = (id: string): Promise<Exam> =>
  api.get<Exam>(`/livechat/training/exams/${id}`);

export const startTrainingExam = (examId: string): Promise<ExamAttempt> =>
  api.post<ExamAttempt>('/livechat/training/exams/start', { examId });

export const submitExamAnswer = (data: {
  attemptId: string;
  questionId: string;
  answer: string | string[];
}): Promise<ExamAttempt> =>
  api.post<ExamAttempt>('/livechat/training/exams/answer', data);

export const submitTrainingExam = (attemptId: string): Promise<ExamAttempt> =>
  api.post<ExamAttempt>('/livechat/training/exams/submit', { attemptId });

export const getMyExamAttempts = (examId: string): Promise<ExamAttempt[]> =>
  api.get<ExamAttempt[]>(`/livechat/training/exams/${examId}/my-attempts`);

// ==================== 培训统计 API ====================

export const getTrainingCourseStats = (courseId: string): Promise<CourseStats> =>
  api.get<CourseStats>(`/livechat/training/stats/course/${courseId}`);

export const getAgentTrainingStats = (agentId: string): Promise<AgentTrainingStats> =>
  api.get<AgentTrainingStats>(`/livechat/training/stats/agent/${agentId}`);

export const getTrainingLeaderboard = (limit?: number): Promise<LeaderboardEntry[]> =>
  api.get<LeaderboardEntry[]>('/livechat/training/leaderboard', { params: { limit } });

// ==================== 报表导出类型定义 ====================

// 导出任务状态
export type ExportTaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

// 报表类型
export type ReportType =
  | 'conversations'
  | 'agent_performance'
  | 'satisfaction'
  | 'quality_review'
  | 'queue_stats'
  | 'training'
  | 'scheduling'
  | 'visitor_analytics'
  | 'sla'
  | 'knowledge_usage'
  | 'bot_conversations'
  | 'custom';

// 导出格式
export type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'json';

// 字段定义
export interface ReportFieldDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array';
  sortable?: boolean;
  filterable?: boolean;
  defaultSelected?: boolean;
}

// 报表类型配置
export interface ReportTypeConfig {
  type: ReportType;
  name: string;
  description: string;
  supportedFormats: ExportFormat[];
  availableFields: ReportFieldDefinition[];
  requiredParams?: string[];
  maxRecords?: number;
}

// 导出任务
export interface ExportTask {
  id: string;
  tenantId: string;
  name: string;
  reportType: ReportType;
  format: ExportFormat;
  status: ExportTaskStatus;
  queryParams: {
    startDate?: string;
    endDate?: string;
    agentIds?: string[];
    groupIds?: string[];
    status?: string[];
    tags?: string[];
    [key: string]: any;
  };
  fields: string[];
  progress: number;
  totalRecords?: number;
  processedRecords: number;
  filePath?: string;
  fileSize?: number;
  downloadUrl?: string;
  urlExpiresAt?: string;
  fileExpiresAt?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  createdBy: string;
  isScheduled: boolean;
  scheduleRule?: string;
  notificationSettings?: {
    sendEmail?: boolean;
    emailRecipients?: string[];
    sendWebSocket?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// 导出任务进度
export interface ExportTaskProgress {
  taskId: string;
  status: ExportTaskStatus;
  progress: number;
  totalRecords?: number;
  processedRecords: number;
  estimatedTimeRemaining?: number;
}

// 导出统计
export interface ExportStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  totalFileSize: number;
  tasksByType: {
    reportType: ReportType;
    count: number;
  }[];
}

// ==================== 导出任务 API ====================

export const createExportTask = (data: {
  name: string;
  reportType: ReportType;
  format?: ExportFormat;
  queryParams: {
    startDate?: string;
    endDate?: string;
    agentIds?: string[];
    groupIds?: string[];
    status?: string[];
    tags?: string[];
    [key: string]: any;
  };
  fields?: string[];
  isScheduled?: boolean;
  scheduleRule?: string;
  notificationSettings?: {
    sendEmail?: boolean;
    emailRecipients?: string[];
    sendWebSocket?: boolean;
  };
}): Promise<ExportTask> =>
  api.post<ExportTask>('/livechat/export/tasks', data);

export const getExportTasks = (params?: {
  reportType?: ReportType;
  status?: ExportTaskStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: ExportTask[]; total: number }> =>
  api.get<{ items: ExportTask[]; total: number }>('/livechat/export/tasks', { params });

export const getExportTask = (id: string): Promise<ExportTask> =>
  api.get<ExportTask>(`/livechat/export/tasks/${id}`);

export const getExportTaskProgress = (id: string): Promise<ExportTaskProgress> =>
  api.get<ExportTaskProgress>(`/livechat/export/tasks/${id}/progress`);

export const cancelExportTask = (id: string): Promise<{ success: boolean }> =>
  api.post<{ success: boolean }>(`/livechat/export/tasks/${id}/cancel`);

export const deleteExportTask = (id: string): Promise<{ success: boolean }> =>
  api.delete<{ success: boolean }>(`/livechat/export/tasks/${id}`);

export const downloadExportFile = (id: string): Promise<Blob> =>
  api.get<Blob>(`/livechat/export/download/${id}`, { responseType: 'blob' });

// ==================== 报表配置 API ====================

export const getReportTypes = (): Promise<ReportTypeConfig[]> =>
  api.get<ReportTypeConfig[]>('/livechat/export/report-types');

export const getReportTypeConfig = (type: ReportType): Promise<ReportTypeConfig> =>
  api.get<ReportTypeConfig>(`/livechat/export/report-types/${type}`);

// ==================== 导出统计 API ====================

export const getExportStats = (): Promise<ExportStats> =>
  api.get<ExportStats>('/livechat/export/stats');

// ==================== 加密管理类型 ====================

export type KeyType = 'master' | 'data' | 'session' | 'backup';
export type KeyStatus = 'active' | 'rotated' | 'expired' | 'revoked';
export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';
export type EncryptionOperation = 'encrypt' | 'decrypt' | 'key_generate' | 'key_rotate' | 'key_revoke' | 'key_export' | 'key_import' | 'session_key_exchange';
export type OperationResult = 'success' | 'failure' | 'denied';
export type EncryptedResourceType = 'message' | 'attachment' | 'conversation' | 'visitor_data' | 'agent_data' | 'export_file' | 'backup';

export interface EncryptionKey {
  id: string;
  name: string;
  keyType: KeyType;
  status: KeyStatus;
  version: number;
  algorithm: EncryptionAlgorithm;
  keyLength: number;
  fingerprint: string;
  conversationId?: string;
  validFrom: string;
  validUntil?: string;
  rotatedAt?: string;
  createdBy: string;
  createdAt: string;
  metadata?: {
    purpose?: string;
    tags?: string[];
    rotationPolicy?: {
      autoRotate: boolean;
      rotationIntervalDays: number;
    };
  };
}

export interface EncryptionAuditLog {
  id: string;
  operation: EncryptionOperation;
  result: OperationResult;
  keyId?: string;
  keyVersion?: number;
  resourceType?: EncryptedResourceType;
  resourceId?: string;
  conversationId?: string;
  performedBy: string;
  performedByType: string;
  clientIp?: string;
  dataSize?: number;
  processingTimeMs?: number;
  errorMessage?: string;
  createdAt: string;
}

export interface EncryptionResult {
  ciphertext: string;
  iv: string;
  authTag?: string;
  keyId: string;
  keyVersion: number;
  algorithm: string;
}

export interface DecryptionResult {
  plaintext: string;
  keyId: string;
  keyVersion: number;
}

export interface SessionEncryptionInfo {
  conversationId: string;
  keyId: string;
  algorithm: EncryptionAlgorithm;
  publicKey?: string;
  established: boolean;
  establishedAt?: string;
  expiresAt?: string;
}

export interface EncryptionStats {
  totalKeys: number;
  activeKeys: number;
  rotatedKeys: number;
  expiredKeys: number;
  revokedKeys: number;
  operationsByType: Record<EncryptionOperation, number>;
  operationsByResult: Record<OperationResult, number>;
  recentOperations: number;
  averageProcessingTimeMs: number;
  totalDataEncrypted: number;
  e2eSessionsActive: number;
}

export interface EncryptionConfig {
  enabled: boolean;
  supportedAlgorithms: { id: string; name: string; recommended: boolean }[];
  keyTypes: { id: string; name: string; description: string }[];
  defaultKeyLength: number;
  defaultRotationIntervalDays: number;
  sessionKeyValidityHours: number;
}

// ==================== 加密密钥管理 API ====================

export const createEncryptionKey = (data: {
  name: string;
  keyType: KeyType;
  algorithm?: EncryptionAlgorithm;
  keyLength?: number;
  conversationId?: string;
  validDays?: number;
  autoRotate?: boolean;
  rotationIntervalDays?: number;
  purpose?: string;
  tags?: string[];
}): Promise<EncryptionKey> =>
  api.post<EncryptionKey>('/livechat/encryption/keys', data);

export const getEncryptionKeys = (params?: {
  keyType?: KeyType;
  status?: KeyStatus;
  conversationId?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: EncryptionKey[]; total: number }> =>
  api.get<{ items: EncryptionKey[]; total: number }>('/livechat/encryption/keys', { params });

export const getEncryptionKey = (id: string): Promise<EncryptionKey> =>
  api.get<EncryptionKey>(`/livechat/encryption/keys/${id}`);

export const rotateEncryptionKey = (id: string, data?: {
  newKeyLength?: number;
  reason?: string;
  expireOldKeyImmediately?: boolean;
}): Promise<EncryptionKey> =>
  api.post<EncryptionKey>(`/livechat/encryption/keys/${id}/rotate`, data);

export const revokeEncryptionKey = (id: string, data: {
  reason: string;
}): Promise<{ success: boolean }> =>
  api.post<{ success: boolean }>(`/livechat/encryption/keys/${id}/revoke`, data);

// ==================== 加密操作 API ====================

export const encryptData = (data: {
  plaintext: string;
  keyId?: string;
  resourceType?: EncryptedResourceType;
  resourceId?: string;
  conversationId?: string;
}): Promise<EncryptionResult> =>
  api.post<EncryptionResult>('/livechat/encryption/encrypt', data);

export const decryptData = (data: {
  ciphertext: string;
  iv?: string;
  authTag?: string;
  keyId?: string;
  keyVersion?: number;
  resourceType?: EncryptedResourceType;
  resourceId?: string;
}): Promise<DecryptionResult> =>
  api.post<DecryptionResult>('/livechat/encryption/decrypt', data);

// ==================== 会话加密 API ====================

export const initSessionEncryption = (data: {
  conversationId: string;
  algorithm?: EncryptionAlgorithm;
}): Promise<SessionEncryptionInfo> =>
  api.post<SessionEncryptionInfo>('/livechat/encryption/session/init', data);

export const exchangeSessionKey = (data: {
  conversationId: string;
  publicKey: string;
  participantId?: string;
}): Promise<SessionEncryptionInfo> =>
  api.post<SessionEncryptionInfo>('/livechat/encryption/session/exchange', data);

export const getSessionEncryption = (conversationId: string): Promise<SessionEncryptionInfo | null> =>
  api.get<SessionEncryptionInfo | null>(`/livechat/encryption/session/${conversationId}`);

// ==================== 加密审计日志 API ====================

export const getEncryptionAuditLogs = (params?: {
  operation?: EncryptionOperation;
  result?: OperationResult;
  keyId?: string;
  resourceType?: EncryptedResourceType;
  resourceId?: string;
  conversationId?: string;
  performedBy?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: EncryptionAuditLog[]; total: number }> =>
  api.get<{ items: EncryptionAuditLog[]; total: number }>('/livechat/encryption/audit-logs', { params });

// ==================== 加密统计和配置 API ====================

export const getEncryptionStats = (): Promise<EncryptionStats> =>
  api.get<EncryptionStats>('/livechat/encryption/stats');

export const getEncryptionConfig = (): Promise<EncryptionConfig> =>
  api.get<EncryptionConfig>('/livechat/encryption/config');

// ==================== 工单深度集成类型 ====================

export type TicketLinkType = 'converted' | 'referenced' | 'follow_up' | 'related';
export type TicketLinkStatus = 'active' | 'resolved' | 'closed';
export type TicketTemplateType = 'conversion' | 'escalation' | 'follow_up' | 'feedback' | 'bug_report' | 'feature_request';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface TicketLink {
  id: string;
  conversationId: string;
  ticketId: string;
  ticketNumber?: string;
  linkType: TicketLinkType;
  status: TicketLinkStatus;
  ticketInfo?: {
    subject?: string;
    status?: string;
    priority?: string;
    category?: string;
    assigneeId?: string;
    assigneeName?: string;
    lastUpdatedAt?: string;
  };
  syncSettings?: {
    syncComments?: boolean;
    syncStatusChanges?: boolean;
    syncPriorityChanges?: boolean;
    notifyOnUpdate?: boolean;
  };
  createdBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketTemplate {
  id: string;
  name: string;
  description?: string;
  type: TicketTemplateType;
  subjectTemplate?: string;
  descriptionTemplate?: string;
  defaultPriority: string;
  defaultCategory?: string;
  defaultTags?: string[];
  includeConversationHistory: boolean;
  historyLimit: number;
  customFields?: {
    name: string;
    type: string;
    required: boolean;
    options?: string[];
    defaultValue?: string;
  }[];
  syncSettings?: {
    syncComments: boolean;
    syncStatusChanges: boolean;
    syncPriorityChanges: boolean;
    notifyOnUpdate: boolean;
  };
  autoAssignSettings?: {
    assignToCurrentAgent: boolean;
    assignToGroup?: string;
    assignToUser?: string;
  };
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ConvertedTicketResponse {
  ticketId: string;
  ticketNumber?: string;
  subject: string;
  status: string;
  priority: string;
  category?: string;
  linkId: string;
  conversationId: string;
  createdAt: string;
}

export interface TicketIntegrationStats {
  totalLinks: number;
  activeLinks: number;
  resolvedLinks: number;
  linksByType: Record<TicketLinkType, number>;
  totalTemplates: number;
  activeTemplates: number;
  conversionsToday: number;
  conversionsThisWeek: number;
  avgResponseTime?: number;
}

// ==================== 工单转换 API ====================

export const convertConversationToTicket = (data: {
  conversationId: string;
  subject?: string;
  description?: string;
  priority: TicketPriority;
  category?: string;
  tags?: string[];
  templateId?: string;
  includeHistory?: boolean;
  historyLimit?: number;
  assignToCurrentAgent?: boolean;
  syncComments?: boolean;
  syncStatusChanges?: boolean;
  customFields?: Record<string, any>;
}): Promise<ConvertedTicketResponse> =>
  api.post<ConvertedTicketResponse>('/livechat/tickets/convert', data);

export const getTicketInfo = (ticketId: string): Promise<{
  id: string;
  number?: string;
  subject: string;
  status: string;
  priority: string;
  category?: string;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
} | null> =>
  api.get(`/livechat/tickets/${ticketId}`);

export const addTicketComment = (ticketId: string, data: {
  content: string;
  internal?: boolean;
  syncToConversation?: boolean;
}): Promise<{ success: boolean }> =>
  api.post<{ success: boolean }>(`/livechat/tickets/${ticketId}/comments`, data);

export const updateTicketStatus = (ticketId: string, data: {
  status: string;
  reason?: string;
  notifyConversation?: boolean;
}): Promise<{ success: boolean }> =>
  api.put<{ success: boolean }>(`/livechat/tickets/${ticketId}/status`, data);

// ==================== 工单关联 API ====================

export const createTicketLink = (data: {
  conversationId: string;
  ticketId: string;
  linkType?: TicketLinkType;
  notes?: string;
  syncComments?: boolean;
  syncStatusChanges?: boolean;
}): Promise<TicketLink> =>
  api.post<TicketLink>('/livechat/tickets/links', data);

export const getTicketLinks = (params?: {
  conversationId?: string;
  ticketId?: string;
  linkType?: TicketLinkType;
  status?: TicketLinkStatus;
  page?: number;
  limit?: number;
}): Promise<{ items: TicketLink[]; total: number }> =>
  api.get<{ items: TicketLink[]; total: number }>('/livechat/tickets/links', { params });

export const getTicketLink = (linkId: string): Promise<TicketLink> =>
  api.get<TicketLink>(`/livechat/tickets/links/${linkId}`);

export const getConversationTicketLinks = (conversationId: string): Promise<TicketLink[]> =>
  api.get<TicketLink[]>(`/livechat/tickets/conversation/${conversationId}/links`);

export const deleteTicketLink = (linkId: string): Promise<{ success: boolean }> =>
  api.delete<{ success: boolean }>(`/livechat/tickets/links/${linkId}`);

// ==================== 工单模板 API ====================

export const createTicketTemplate = (data: {
  name: string;
  description?: string;
  type: TicketTemplateType;
  subjectTemplate?: string;
  descriptionTemplate?: string;
  defaultPriority?: string;
  defaultCategory?: string;
  defaultTags?: string[];
  includeConversationHistory?: boolean;
  historyLimit?: number;
  customFields?: {
    name: string;
    type: 'text' | 'select' | 'number' | 'date';
    required: boolean;
    options?: string[];
    defaultValue?: string;
  }[];
  syncSettings?: {
    syncComments: boolean;
    syncStatusChanges: boolean;
    syncPriorityChanges: boolean;
    notifyOnUpdate: boolean;
  };
  autoAssignSettings?: {
    assignToCurrentAgent: boolean;
    assignToGroup?: string;
    assignToUser?: string;
  };
  isDefault?: boolean;
  sortOrder?: number;
}): Promise<TicketTemplate> =>
  api.post<TicketTemplate>('/livechat/tickets/templates', data);

export const getTicketTemplates = (params?: {
  type?: TicketTemplateType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ items: TicketTemplate[]; total: number }> =>
  api.get<{ items: TicketTemplate[]; total: number }>('/livechat/tickets/templates', { params });

export const getTicketTemplate = (templateId: string): Promise<TicketTemplate> =>
  api.get<TicketTemplate>(`/livechat/tickets/templates/${templateId}`);

export const updateTicketTemplate = (templateId: string, data: Partial<TicketTemplate>): Promise<TicketTemplate> =>
  api.put<TicketTemplate>(`/livechat/tickets/templates/${templateId}`, data);

export const deleteTicketTemplate = (templateId: string): Promise<{ success: boolean }> =>
  api.delete<{ success: boolean }>(`/livechat/tickets/templates/${templateId}`);

// ==================== 工单集成统计 API ====================

export const getTicketIntegrationStats = (): Promise<TicketIntegrationStats> =>
  api.get<TicketIntegrationStats>('/livechat/tickets/stats');
