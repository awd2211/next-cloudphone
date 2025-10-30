import request from '@/utils/request';
import type { CacheStats } from '@/types';

/**
 * 获取缓存统计信息
 */
export const getCacheStats = () => {
  return request.get<{
    success: boolean;
    data: CacheStats;
    timestamp: string;
  }>('/cache/stats');
};

/**
 * 重置缓存统计信息
 */
export const resetCacheStats = () => {
  return request.delete('/cache/stats');
};

/**
 * 清空所有缓存
 */
export const flushCache = () => {
  return request.delete('/cache/flush');
};

/**
 * 删除指定key的缓存
 */
export const deleteCache = (key: string) => {
  return request.delete(`/cache?key=${encodeURIComponent(key)}`);
};

/**
 * 按模式删除缓存（支持通配符）
 * @param pattern 模式，如: user:*, session:123*
 */
export const deleteCachePattern = (pattern: string) => {
  return request.delete<{
    success: boolean;
    data: {
      pattern: string;
      deletedCount: number;
    };
  }>(`/cache/pattern?pattern=${encodeURIComponent(pattern)}`);
};

/**
 * 检查缓存key是否存在
 */
export const checkCacheExists = (key: string) => {
  return request.get<{
    success: boolean;
    data: {
      key: string;
      exists: boolean;
    };
  }>(`/cache/exists?key=${encodeURIComponent(key)}`);
};
