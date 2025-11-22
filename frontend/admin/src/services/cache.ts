/**
 * 缓存管理服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { CacheStats } from '@/types';

/**
 * 获取缓存统计信息
 */
export const getCacheStats = (): Promise<{
  data: CacheStats;
  timestamp: string;
}> =>
  api.get<{
    data: CacheStats;
    timestamp: string;
  }>('/cache/stats');

/**
 * 重置缓存统计信息
 */
export const resetCacheStats = (): Promise<void> =>
  api.delete<void>('/cache/stats');

/**
 * 清空所有缓存
 */
export const flushCache = (): Promise<void> =>
  api.delete<void>('/cache/flush');

/**
 * 删除指定key的缓存
 */
export const deleteCache = (key: string): Promise<void> =>
  api.delete<void>(`/cache?key=${encodeURIComponent(key)}`);

/**
 * 按模式删除缓存（支持通配符）
 * @param pattern 模式，如: user:*, session:123*
 */
export const deleteCachePattern = (pattern: string): Promise<{
  pattern: string;
  deletedCount: number;
}> =>
  api.delete<{
    pattern: string;
    deletedCount: number;
  }>(`/cache/pattern?pattern=${encodeURIComponent(pattern)}`);

/**
 * 检查缓存key是否存在
 */
export const checkCacheExists = (key: string): Promise<{
  key: string;
  exists: boolean;
}> =>
  api.get<{
    key: string;
    exists: boolean;
  }>(`/cache/exists?key=${encodeURIComponent(key)}`);
