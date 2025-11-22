/**
 * 帮助中心 React Query Hooks (用户端)
 *
 * 提供帮助文章、FAQ、分类等查询功能
 * ✅ 使用 Zod Schema 验证 API 响应
 */

import type { HelpCategory, HelpArticle, FAQ } from '@/services/help';
import * as helpService from '@/services/help';
import { StaleTimeConfig } from '../utils/cacheConfig';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import { HelpArticleSchema } from '@/schemas/api.schemas';
import { z } from 'zod';

// 帮助分类 Schema
const HelpCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  description: z.string().optional(),
  articleCount: z.number().int().optional(),
});
const HelpCategoriesSchema = z.array(HelpCategorySchema);

// FAQ Schema
const FAQSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  category: z.string().optional(),
  order: z.number().int().optional(),
});
const FAQListSchema = z.object({
  items: z.array(FAQSchema),
  total: z.number().int(),
});

// 文章列表 Schema
const HelpArticlesSchema = z.array(HelpArticleSchema);

// ==================== Query Keys ====================

export const helpKeys = {
  all: ['help'] as const,
  categories: () => [...helpKeys.all, 'categories'] as const,
  articles: () => [...helpKeys.all, 'articles'] as const,
  popularArticles: (limit?: number) => [...helpKeys.articles(), 'popular', limit] as const,
  latestArticles: (limit?: number) => [...helpKeys.articles(), 'latest', limit] as const,
  faqs: (params?: any) => [...helpKeys.all, 'faqs', params] as const,
};

// ==================== Query Hooks ====================

// FAQ 列表响应类型
export interface FAQListResponse {
  items: FAQ[];
  total: number;
}

/**
 * 获取帮助分类
 */
export const useHelpCategories = () => {
  return useValidatedQuery<HelpCategory[]>({
    queryKey: helpKeys.categories(),
    queryFn: () => helpService.getHelpCategories(),
    schema: HelpCategoriesSchema,
    staleTime: StaleTimeConfig.STATIC, // 15分钟（分类变化少）
  });
};

/**
 * 获取热门文章
 */
export const usePopularArticles = (limit: number = 6) => {
  return useValidatedQuery<HelpArticle[]>({
    queryKey: helpKeys.popularArticles(limit),
    queryFn: () => helpService.getPopularArticles(limit),
    schema: HelpArticlesSchema,
    staleTime: StaleTimeConfig.VERY_LONG, // 5分钟
  });
};

/**
 * 获取最新文章
 */
export const useLatestArticles = (limit: number = 6) => {
  return useValidatedQuery<HelpArticle[]>({
    queryKey: helpKeys.latestArticles(limit),
    queryFn: () => helpService.getLatestArticles(limit),
    schema: HelpArticlesSchema,
    staleTime: StaleTimeConfig.LONG, // 1分钟
  });
};

/**
 * 获取常见问题
 */
export const useFAQs = (params?: { page?: number; pageSize?: number }) => {
  return useValidatedQuery<FAQListResponse>({
    queryKey: helpKeys.faqs(params),
    queryFn: () => helpService.getFAQs(params),
    schema: FAQListSchema,
    staleTime: StaleTimeConfig.VERY_LONG, // 5分钟
  });
};
