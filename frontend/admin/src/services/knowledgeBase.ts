/**
 * 知识库 API 服务
 */
import request from '@/utils/request';

// ============ 类型定义 ============

export type ArticleStatus = 'draft' | 'published' | 'archived';
export type ArticleVisibility = 'public' | 'internal' | 'private';

export interface KnowledgeCategory {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  parentId?: string;
  parent?: KnowledgeCategory;
  children?: KnowledgeCategory[];
  isActive: boolean;
  articleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeArticle {
  id: string;
  tenantId: string;
  title: string;
  summary?: string;
  content: string;
  contentHtml?: string;
  categoryId?: string;
  category?: KnowledgeCategory;
  status: ArticleStatus;
  visibility: ArticleVisibility;
  tags: string[];
  keywords: string[];
  viewCount: number;
  useCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  version: number;
  sortOrder: number;
  isPinned: boolean;
  isFeatured: boolean;
  attachments?: {
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
  }[];
  relatedArticleIds?: string[];
  authorId?: string;
  authorName?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchArticlesParams {
  keyword?: string;
  categoryId?: string;
  status?: ArticleStatus;
  visibility?: ArticleVisibility;
  tag?: string;
  isPinned?: boolean;
  isFeatured?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface SearchArticlesResult {
  items: KnowledgeArticle[];
  total: number;
  page: number;
  limit: number;
}

export interface KnowledgeStats {
  categoryCount: number;
  articleStats: Record<string, number>;
  totalViews: number;
  totalUses: number;
  topArticles: Pick<KnowledgeArticle, 'id' | 'title' | 'viewCount' | 'useCount' | 'helpfulCount'>[];
}

// ============ 分类 API ============

/**
 * 获取分类列表（树形结构）
 */
export async function getCategories(includeInactive = false): Promise<KnowledgeCategory[]> {
  return request.get('/livechat/knowledge-base/categories', {
    params: { includeInactive },
  });
}

/**
 * 获取分类详情
 */
export async function getCategory(id: string): Promise<KnowledgeCategory> {
  return request.get(`/livechat/knowledge-base/categories/${id}`);
}

/**
 * 创建分类
 */
export async function createCategory(data: {
  name: string;
  description?: string;
  icon?: string;
  parentId?: string;
  sortOrder?: number;
}): Promise<KnowledgeCategory> {
  return request.post('/livechat/knowledge-base/categories', data);
}

/**
 * 更新分类
 */
export async function updateCategory(
  id: string,
  data: {
    name?: string;
    description?: string;
    icon?: string;
    parentId?: string;
    sortOrder?: number;
    isActive?: boolean;
  },
): Promise<KnowledgeCategory> {
  return request.put(`/livechat/knowledge-base/categories/${id}`, data);
}

/**
 * 删除分类
 */
export async function deleteCategory(id: string): Promise<void> {
  return request.delete(`/livechat/knowledge-base/categories/${id}`);
}

// ============ 文章 API ============

/**
 * 搜索文章
 */
export async function searchArticles(params?: SearchArticlesParams): Promise<SearchArticlesResult> {
  return request.get('/livechat/knowledge-base/articles', { params });
}

/**
 * 获取热门文章
 */
export async function getPopularArticles(limit = 10): Promise<KnowledgeArticle[]> {
  return request.get('/livechat/knowledge-base/articles/popular', {
    params: { limit },
  });
}

/**
 * 获取文章详情
 */
export async function getArticle(id: string): Promise<KnowledgeArticle> {
  return request.get(`/livechat/knowledge-base/articles/${id}`);
}

/**
 * 创建文章
 */
export async function createArticle(data: {
  title: string;
  summary?: string;
  content: string;
  contentHtml?: string;
  categoryId?: string;
  status?: ArticleStatus;
  visibility?: ArticleVisibility;
  tags?: string[];
  keywords?: string[];
  isPinned?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  relatedArticleIds?: string[];
}): Promise<KnowledgeArticle> {
  return request.post('/livechat/knowledge-base/articles', data);
}

/**
 * 更新文章
 */
export async function updateArticle(
  id: string,
  data: Partial<{
    title: string;
    summary: string;
    content: string;
    contentHtml: string;
    categoryId: string;
    status: ArticleStatus;
    visibility: ArticleVisibility;
    tags: string[];
    keywords: string[];
    isPinned: boolean;
    isFeatured: boolean;
    sortOrder: number;
    relatedArticleIds: string[];
  }>,
): Promise<KnowledgeArticle> {
  return request.put(`/livechat/knowledge-base/articles/${id}`, data);
}

/**
 * 删除文章
 */
export async function deleteArticle(id: string): Promise<void> {
  return request.delete(`/livechat/knowledge-base/articles/${id}`);
}

/**
 * 批量发布文章
 */
export async function publishArticles(ids: string[]): Promise<{ published: number }> {
  return request.post('/livechat/knowledge-base/articles/publish', { ids });
}

/**
 * 批量归档文章
 */
export async function archiveArticles(ids: string[]): Promise<{ archived: number }> {
  return request.post('/livechat/knowledge-base/articles/archive', { ids });
}

// ============ 智能推荐 API ============

/**
 * AI 智能推荐文章
 */
export async function recommendArticles(data: {
  conversationId: string;
  message?: string;
  limit?: number;
}): Promise<KnowledgeArticle[]> {
  return request.post('/livechat/knowledge-base/recommend', data);
}

// ============ 使用记录 API ============

/**
 * 记录文章使用情况
 */
export async function recordUsage(data: {
  articleId: string;
  conversationId?: string;
  type: 'view' | 'copy' | 'send' | 'helpful' | 'not_helpful';
  searchQuery?: string;
}): Promise<void> {
  return request.post('/livechat/knowledge-base/usage', data);
}

// ============ 统计 API ============

/**
 * 获取知识库统计
 */
export async function getKnowledgeStats(params?: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
}): Promise<KnowledgeStats> {
  return request.get('/livechat/knowledge-base/stats', { params });
}
