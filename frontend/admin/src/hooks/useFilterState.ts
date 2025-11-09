/**
 * 筛选器状态 URL 持久化 Hook
 *
 * 功能：
 * 1. 将筛选条件同步到 URL Query Parameters
 * 2. 支持浏览器前进/后退
 * 3. 支持刷新页面保持筛选状态
 * 4. 支持分享带筛选条件的链接
 */

import { useSearchParams } from 'react-router-dom';
import { useMemo, useCallback } from 'react';

/**
 * 筛选器状态 Hook
 *
 * @param defaultFilters 默认筛选条件
 * @returns { filters, setFilters, clearFilters }
 *
 * @example
 * ```tsx
 * const { filters, setFilters, clearFilters } = useFilterState({
 *   status: '',
 *   androidVersion: '',
 *   page: 1,
 *   pageSize: 10,
 * });
 *
 * // 更新筛选条件
 * const handleStatusChange = (status: string) => {
 *   setFilters({ status, page: 1 }); // 改变筛选条件时重置到第一页
 * };
 *
 * // 清除所有筛选条件
 * const handleReset = () => {
 *   clearFilters();
 * };
 *
 * // 使用 filters 作为查询参数
 * const { data } = useDevices(filters);
 * ```
 */
export const useFilterState = <T extends Record<string, any>>(defaultFilters: T) => {
  const [searchParams, setSearchParams] = useSearchParams();

  /**
   * 从 URL 读取筛选条件
   */
  const filters = useMemo(() => {
    const result: any = { ...defaultFilters };

    for (const key in defaultFilters) {
      const value = searchParams.get(key);

      if (value !== null) {
        const defaultValue = defaultFilters[key];

        // 类型转换
        if (typeof defaultValue === 'number') {
          const numValue = Number(value);
          result[key] = isNaN(numValue) ? defaultValue : numValue;
        } else if (typeof defaultValue === 'boolean') {
          result[key] = value === 'true';
        } else if (Array.isArray(defaultValue)) {
          // 数组类型：逗号分隔
          result[key] = value ? value.split(',').filter(Boolean) : defaultValue;
        } else {
          result[key] = value;
        }
      }
    }

    return result as T;
  }, [searchParams, defaultFilters]);

  /**
   * 更新筛选条件到 URL
   */
  const setFilters = useCallback(
    (newFilters: Partial<T>) => {
      const params = new URLSearchParams(searchParams);

      for (const key in newFilters) {
        const value = newFilters[key];

        // 删除空值
        if (
          value === undefined ||
          value === null ||
          value === '' ||
          (Array.isArray(value) && value.length === 0)
        ) {
          params.delete(key);
        } else {
          // 数组类型：逗号分隔
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      }

      setSearchParams(params, { replace: true }); // 使用 replace 避免堆积历史记录
    },
    [searchParams, setSearchParams]
  );

  /**
   * 清除所有筛选条件（恢复到默认值）
   */
  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  /**
   * 重置为默认筛选条件（保留 page 和 pageSize）
   */
  const resetFilters = useCallback(() => {
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');

    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (pageSize) params.set('pageSize', pageSize);

    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  return {
    filters,
    setFilters,
    clearFilters,
    resetFilters,
  };
};

/**
 * 筛选器状态 Hook（增强版）
 *
 * 额外提供 URL 分享功能
 */
export const useFilterStateWithShare = <T extends Record<string, any>>(
  defaultFilters: T
) => {
  const filterState = useFilterState(defaultFilters);

  /**
   * 获取当前筛选条件的 URL（可用于分享）
   */
  const getShareableUrl = useCallback(() => {
    const url = new URL(window.location.href);
    return url.toString();
  }, []);

  /**
   * 复制筛选条件 URL 到剪贴板
   */
  const copyShareableUrl = useCallback(async () => {
    const url = getShareableUrl();

    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (error) {
      console.error('Failed to copy URL:', error);
      return false;
    }
  }, [getShareableUrl]);

  return {
    ...filterState,
    getShareableUrl,
    copyShareableUrl,
  };
};
