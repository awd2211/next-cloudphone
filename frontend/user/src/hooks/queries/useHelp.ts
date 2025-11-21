/**
 * 帮助中心 React Query Hooks (用户端)
 *
 * 提供帮助文章、FAQ、分类等查询功能
 */

import { useQuery } from '@tanstack/react-query';
import type { HelpCategory, HelpArticle, FAQ } from '@/services/help';
import * as helpService from '@/services/help';
import { StaleTimeConfig } from '../utils/cacheConfig';

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

/**
 * 获取帮助分类
 */
export const useHelpCategories = () => {
  return useQuery<HelpCategory[]>({
    queryKey: helpKeys.categories(),
    queryFn: () => helpService.getHelpCategories(),
    staleTime: StaleTimeConfig.STATIC, // 15分钟（分类变化少）
  });
};

/**
 * 获取热门文章
 */
export const usePopularArticles = (limit: number = 6) => {
  return useQuery<HelpArticle[]>({
    queryKey: helpKeys.popularArticles(limit),
    queryFn: () => helpService.getPopularArticles(limit),
    staleTime: StaleTimeConfig.VERY_LONG, // 5分钟
  });
};

/**
 * 获取最新文章
 */
export const useLatestArticles = (limit: number = 6) => {
  return useQuery<HelpArticle[]>({
    queryKey: helpKeys.latestArticles(limit),
    queryFn: () => helpService.getLatestArticles(limit),
    staleTime: StaleTimeConfig.LONG, // 1分钟
  });
};

/**
 * 获取常见问题
 */
export const useFAQs = (params?: { page?: number; pageSize?: number }) => {
  return useQuery<{ items: FAQ[]; total: number }>({
    queryKey: helpKeys.faqs(params),
    queryFn: () => helpService.getFAQs(params),
    staleTime: StaleTimeConfig.VERY_LONG, // 5分钟
  });
};
