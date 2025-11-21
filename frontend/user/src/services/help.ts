/**
 * 帮助中心服务 API
 *
 * ⚠️ 注意：后端暂未实现帮助中心相关控制器
 * 所有端点返回占位数据，待后端实现后替换
 */

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

// ==================== 占位数据 ====================

const MOCK_CATEGORIES: HelpCategory[] = [
  { id: '1', name: '快速入门', description: '新用户指南', icon: 'rocket', order: 1, articleCount: 5, color: '#1890ff' },
  { id: '2', name: '设备管理', description: '云手机设备相关', icon: 'mobile', order: 2, articleCount: 8, color: '#52c41a' },
  { id: '3', name: '账户与计费', description: '账户和付款相关', icon: 'wallet', order: 3, articleCount: 6, color: '#faad14' },
  { id: '4', name: '常见问题', description: '用户常见问题解答', icon: 'question-circle', order: 4, articleCount: 12, color: '#722ed1' },
];

const MOCK_FAQS: FAQ[] = [
  {
    id: '1',
    category: FAQCategory.GENERAL,
    question: '什么是云手机？',
    answer: '云手机是运行在云端的虚拟安卓设备，您可以通过网页或客户端远程控制它。',
    order: 1,
    views: 1250,
    helpfulCount: 89,
    tags: ['入门', '概念'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    category: FAQCategory.BILLING,
    question: '如何充值？',
    answer: '您可以在"充值中心"页面选择支付宝或微信支付进行充值。',
    order: 2,
    views: 890,
    helpfulCount: 67,
    tags: ['充值', '支付'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    category: FAQCategory.DEVICE,
    question: '设备无法启动怎么办？',
    answer: '请尝试重启设备，如问题持续请联系客服。',
    order: 3,
    views: 560,
    helpfulCount: 45,
    tags: ['故障', '设备'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ==================== API 函数（后端未实现，返回占位数据）====================

/**
 * 获取帮助分类列表
 * 后端暂未实现此端点
 */
export const getHelpCategories = (): Promise<HelpCategory[]> => {
  console.warn('getHelpCategories: 后端暂未实现此端点，返回占位数据');
  return Promise.resolve(MOCK_CATEGORIES);
};

/**
 * 获取文章列表
 * 后端暂未实现此端点
 */
export const getHelpArticles = (params?: ArticleListQuery): Promise<ArticleListResponse> => {
  console.warn('getHelpArticles: 后端暂未实现此端点，返回占位数据');
  return Promise.resolve({
    items: [],
    total: 0,
    page: params?.page || 1,
    pageSize: params?.pageSize || 10,
  });
};

/**
 * 获取文章详情
 * 后端暂未实现此端点
 */
export const getArticleDetail = (_id: string): Promise<HelpArticle> => {
  console.warn('getArticleDetail: 后端暂未实现此端点');
  return Promise.reject(new Error('帮助中心功能暂未实现'));
};

/**
 * 搜索帮助内容
 * 后端暂未实现此端点
 */
export const searchHelp = (_keyword: string): Promise<SearchResult> => {
  console.warn('searchHelp: 后端暂未实现此端点，返回空结果');
  return Promise.resolve({
    articles: [],
    faqs: MOCK_FAQS,
    tutorials: [],
  });
};

/**
 * 获取 FAQ 列表
 * 后端暂未实现此端点
 */
export const getFAQs = (params?: FAQListQuery): Promise<FAQListResponse> => {
  console.warn('getFAQs: 后端暂未实现此端点，返回占位数据');
  let items = MOCK_FAQS;
  if (params?.category) {
    items = items.filter(faq => faq.category === params.category);
  }
  return Promise.resolve({
    items,
    total: items.length,
    page: params?.page || 1,
    pageSize: params?.pageSize || 10,
  });
};

/**
 * 获取 FAQ 详情
 * 后端暂未实现此端点
 */
export const getFAQDetail = (id: string): Promise<FAQ> => {
  console.warn('getFAQDetail: 后端暂未实现此端点，返回占位数据');
  const faq = MOCK_FAQS.find(f => f.id === id);
  if (faq) {
    return Promise.resolve(faq);
  }
  return Promise.reject(new Error('FAQ 不存在'));
};

/**
 * 获取教程列表
 * 后端暂未实现此端点
 */
export const getTutorials = (params?: TutorialListQuery): Promise<TutorialListResponse> => {
  console.warn('getTutorials: 后端暂未实现此端点，返回占位数据');
  return Promise.resolve({
    items: [],
    total: 0,
    page: params?.page || 1,
    pageSize: params?.pageSize || 10,
  });
};

/**
 * 获取教程详情
 * 后端暂未实现此端点
 */
export const getTutorialDetail = (_id: string): Promise<Tutorial> => {
  console.warn('getTutorialDetail: 后端暂未实现此端点');
  return Promise.reject(new Error('教程功能暂未实现'));
};

/**
 * 标记为有帮助
 * 后端暂未实现此端点
 */
export const markHelpful = (_id: string, _type: 'article' | 'faq' | 'tutorial'): Promise<void> => {
  console.warn('markHelpful: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 点赞
 * 后端暂未实现此端点
 */
export const likeContent = (_id: string, _type: 'article' | 'tutorial'): Promise<void> => {
  console.warn('likeContent: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 提交反馈
 * 后端暂未实现此端点
 */
export const submitFeedback = (_data: FeedbackData): Promise<void> => {
  console.warn('submitFeedback: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 获取热门标签
 * 后端暂未实现此端点
 */
export const getPopularTags = (): Promise<PopularTag[]> => {
  console.warn('getPopularTags: 后端暂未实现此端点，返回占位数据');
  return Promise.resolve([
    { name: '入门指南', count: 25 },
    { name: '设备问题', count: 18 },
    { name: '充值', count: 15 },
    { name: '应用安装', count: 12 },
  ]);
};

/**
 * 记录文章浏览
 * 后端暂未实现此端点
 */
export const recordArticleView = (_id: string): Promise<void> => {
  console.warn('recordArticleView: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 记录 FAQ 浏览
 * 后端暂未实现此端点
 */
export const recordFAQView = (_id: string): Promise<void> => {
  console.warn('recordFAQView: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 记录教程浏览
 * 后端暂未实现此端点
 */
export const recordTutorialView = (_id: string): Promise<void> => {
  console.warn('recordTutorialView: 后端暂未实现此端点');
  return Promise.resolve();
};

/**
 * 获取相关文章
 * 后端暂未实现此端点
 */
export const getRelatedArticles = (_id: string): Promise<HelpArticle[]> => {
  console.warn('getRelatedArticles: 后端暂未实现此端点，返回空列表');
  return Promise.resolve([]);
};

/**
 * 获取热门文章
 * 后端暂未实现此端点
 */
export const getPopularArticles = (_limit: number = 10): Promise<HelpArticle[]> => {
  console.warn('getPopularArticles: 后端暂未实现此端点，返回空列表');
  return Promise.resolve([]);
};

/**
 * 获取最新文章
 * 后端暂未实现此端点
 */
export const getLatestArticles = (_limit: number = 10): Promise<HelpArticle[]> => {
  console.warn('getLatestArticles: 后端暂未实现此端点，返回空列表');
  return Promise.resolve([]);
};
