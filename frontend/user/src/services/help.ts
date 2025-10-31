import request from '@/utils/request';

// 帮助分类
export interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string; // 图标名称
  order: number;
  articleCount: number;
  color?: string; // 分类颜色
}

// 帮助文章
export interface HelpArticle {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  views: number;
  likes: number;
  helpfulCount: number; // 有帮助计数
  author?: string;
  createdAt: string;
  updatedAt: string;
}

// 文章列表查询参数
export interface ArticleListQuery {
  categoryId?: string;
  keyword?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: 'views' | 'likes' | 'createdAt' | 'helpful';
  sortOrder?: 'asc' | 'desc';
}

// 文章列表响应
export interface ArticleListResponse {
  items: HelpArticle[];
  total: number;
  page: number;
  pageSize: number;
}

// FAQ 分类
export enum FAQCategory {
  GENERAL = 'general', // 常见问题
  ACCOUNT = 'account', // 账户相关
  BILLING = 'billing', // 计费相关
  DEVICE = 'device', // 设备相关
  APP = 'app', // 应用相关
  TECHNICAL = 'technical', // 技术问题
  SECURITY = 'security', // 安全问题
}

// FAQ
export interface FAQ {
  id: string;
  category: FAQCategory;
  question: string;
  answer: string;
  order: number;
  views: number;
  helpfulCount: number;
  tags?: string[];
  relatedArticles?: string[]; // 关联文章 ID
  createdAt: string;
  updatedAt: string;
}

// FAQ 查询参数
export interface FAQListQuery {
  category?: FAQCategory;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

// FAQ 列表响应
export interface FAQListResponse {
  items: FAQ[];
  total: number;
  page: number;
  pageSize: number;
}

// 教程难度
export enum TutorialDifficulty {
  BEGINNER = 'beginner', // 入门
  INTERMEDIATE = 'intermediate', // 进阶
  ADVANCED = 'advanced', // 高级
}

// 教程步骤
export interface TutorialStep {
  order: number;
  title: string;
  description: string;
  image?: string;
  video?: string;
  code?: string;
}

// 教程
export interface Tutorial {
  id: string;
  title: string;
  description: string;
  summary: string;
  difficulty: TutorialDifficulty;
  duration: number; // 预计时长（分钟）
  steps: TutorialStep[];
  coverImage?: string;
  video?: string;
  tags: string[];
  views: number;
  likes: number;
  completedCount: number; // 完成人数
  author?: string;
  createdAt: string;
  updatedAt: string;
}

// 教程查询参数
export interface TutorialListQuery {
  difficulty?: TutorialDifficulty;
  keyword?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}

// 教程列表响应
export interface TutorialListResponse {
  items: Tutorial[];
  total: number;
  page: number;
  pageSize: number;
}

// 反馈类型
export enum FeedbackType {
  HELPFUL = 'helpful', // 有帮助
  NOT_HELPFUL = 'not_helpful', // 没有帮助
  SUGGESTION = 'suggestion', // 建议
  BUG = 'bug', // 问题反馈
}

// 反馈数据
export interface FeedbackData {
  type: FeedbackType;
  relatedId?: string; // 关联的文章/FAQ/教程 ID
  relatedType?: 'article' | 'faq' | 'tutorial';
  content?: string;
  contact?: string; // 联系方式
}

// 搜索结果
export interface SearchResult {
  articles: HelpArticle[];
  faqs: FAQ[];
  tutorials: Tutorial[];
}

// 热门标签
export interface PopularTag {
  name: string;
  count: number;
}

/**
 * 获取帮助分类列表
 */
export const getHelpCategories = (): Promise<HelpCategory[]> => {
  return request({
    url: '/help/categories',
    method: 'GET',
  });
};

/**
 * 获取文章列表
 */
export const getHelpArticles = (params?: ArticleListQuery): Promise<ArticleListResponse> => {
  return request({
    url: '/help/articles',
    method: 'GET',
    params,
  });
};

/**
 * 获取文章详情
 */
export const getArticleDetail = (id: string): Promise<HelpArticle> => {
  return request({
    url: `/help/articles/${id}`,
    method: 'GET',
  });
};

/**
 * 搜索帮助内容
 */
export const searchHelp = (keyword: string): Promise<SearchResult> => {
  return request({
    url: '/help/search',
    method: 'GET',
    params: { keyword },
  });
};

/**
 * 获取 FAQ 列表
 */
export const getFAQs = (params?: FAQListQuery): Promise<FAQListResponse> => {
  return request({
    url: '/help/faqs',
    method: 'GET',
    params,
  });
};

/**
 * 获取 FAQ 详情
 */
export const getFAQDetail = (id: string): Promise<FAQ> => {
  return request({
    url: `/help/faqs/${id}`,
    method: 'GET',
  });
};

/**
 * 获取教程列表
 */
export const getTutorials = (params?: TutorialListQuery): Promise<TutorialListResponse> => {
  return request({
    url: '/help/tutorials',
    method: 'GET',
    params,
  });
};

/**
 * 获取教程详情
 */
export const getTutorialDetail = (id: string): Promise<Tutorial> => {
  return request({
    url: `/help/tutorials/${id}`,
    method: 'GET',
  });
};

/**
 * 标记为有帮助
 */
export const markHelpful = (id: string, type: 'article' | 'faq' | 'tutorial'): Promise<void> => {
  return request({
    url: `/help/${type}s/${id}/helpful`,
    method: 'POST',
  });
};

/**
 * 点赞
 */
export const likeContent = (id: string, type: 'article' | 'tutorial'): Promise<void> => {
  return request({
    url: `/help/${type}s/${id}/like`,
    method: 'POST',
  });
};

/**
 * 提交反馈
 */
export const submitFeedback = (data: FeedbackData): Promise<void> => {
  return request({
    url: '/help/feedback',
    method: 'POST',
    data,
  });
};

/**
 * 获取热门标签
 */
export const getPopularTags = (): Promise<PopularTag[]> => {
  return request({
    url: '/help/tags/popular',
    method: 'GET',
  });
};

/**
 * 记录文章浏览
 */
export const recordArticleView = (id: string): Promise<void> => {
  return request({
    url: `/help/articles/${id}/view`,
    method: 'POST',
  });
};

/**
 * 记录 FAQ 浏览
 */
export const recordFAQView = (id: string): Promise<void> => {
  return request({
    url: `/help/faqs/${id}/view`,
    method: 'POST',
  });
};

/**
 * 记录教程浏览
 */
export const recordTutorialView = (id: string): Promise<void> => {
  return request({
    url: `/help/tutorials/${id}/view`,
    method: 'POST',
  });
};

/**
 * 获取相关文章
 */
export const getRelatedArticles = (id: string): Promise<HelpArticle[]> => {
  return request({
    url: `/help/articles/${id}/related`,
    method: 'GET',
  });
};

/**
 * 获取热门文章
 */
export const getPopularArticles = (limit: number = 10): Promise<HelpArticle[]> => {
  return request({
    url: '/help/articles/popular',
    method: 'GET',
    params: { limit },
  });
};

/**
 * 获取最新文章
 */
export const getLatestArticles = (limit: number = 10): Promise<HelpArticle[]> => {
  return request({
    url: '/help/articles/latest',
    method: 'GET',
    params: { limit },
  });
};
