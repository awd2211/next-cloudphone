/**
 * Cache React Query Hooks
 *
 * 基于 @/services/cache
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as cacheService from '@/services/cache';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import { CacheStatsSchema } from '@/schemas/api.schemas';

/**
 * Query Keys
 */
export const cacheKeys = {
  all: ['cache'] as const,
  stats: () => [...cacheKeys.all, 'stats'] as const,
  exists: (key: string) => [...cacheKeys.all, 'exists', key] as const,
};

/**
 * 获取缓存统计信息
 */
export const useCacheStats = () => {
  return useValidatedQuery({
    queryKey: cacheKeys.stats(),
    queryFn: () => cacheService.getCacheStats().then(res => res.data), // getCacheStats 返回 { data, timestamp }
    schema: CacheStatsSchema,
    staleTime: 30 * 1000, // 30秒
    refetchInterval: 60 * 1000, // 缓存统计 - 中等实时性
  });
};

/**
 * 检查缓存key是否存在
 */
export const useCacheExists = (key: string) => {
  return useQuery({
    queryKey: cacheKeys.exists(key),
    queryFn: () => cacheService.checkCacheExists(key),
    enabled: !!key,
  });
};

/**
 * 重置缓存统计 Mutation
 */
export const useResetCacheStats = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cacheService.resetCacheStats(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.stats() });
      message.success('统计信息已重置');
    },
    onError: () => {
      message.error('重置统计信息失败');
    },
  });
};

/**
 * 清空所有缓存 Mutation
 */
export const useFlushCache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cacheService.flushCache(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.stats() });
      // Clear all react-query cache as well
      queryClient.clear();
      message.success('所有缓存已清空');
    },
    onError: () => {
      message.error('清空缓存失败');
    },
  });
};

/**
 * 删除指定key的缓存 Mutation
 */
export const useDeleteCache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (key: string) => cacheService.deleteCache(key),
    onSuccess: (_, key) => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.stats() });
      queryClient.invalidateQueries({ queryKey: cacheKeys.exists(key) });
      message.success('缓存已删除');
    },
    onError: () => {
      message.error('删除缓存失败');
    },
  });
};

/**
 * 按模式删除缓存 Mutation
 */
export const useDeleteCachePattern = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pattern: string) => cacheService.deleteCachePattern(pattern),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.stats() });
      const deletedCount = response?.deletedCount || 0;
      message.success(`已删除 ${deletedCount} 个缓存`);
    },
    onError: () => {
      message.error('删除缓存失败');
    },
  });
};
