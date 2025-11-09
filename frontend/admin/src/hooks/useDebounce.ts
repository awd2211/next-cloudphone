import { useState, useEffect } from 'react';

/**
 * 防抖 Hook
 * 延迟更新值，避免频繁触发
 *
 * @param value - 原始值
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的值
 *
 * @example
 * const [searchText, setSearchText] = useState('');
 * const debouncedSearchText = useDebounce(searchText, 500);
 *
 * // debouncedSearchText 会在 searchText 停止变化 500ms 后更新
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 设置定时器，延迟更新
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 清理函数：如果 value 在 delay 时间内再次变化，则取消上一次的定时器
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
