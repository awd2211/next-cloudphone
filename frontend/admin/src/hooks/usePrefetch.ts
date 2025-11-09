/**
 * 数据预加载 Hooks
 *
 * 提供路由导航时的数据预加载功能，提升用户体验
 * - 鼠标悬停时预加载
 * - 路由切换前预加载
 * - 智能缓存复用
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useNavigate, NavigateOptions } from 'react-router-dom';

/**
 * 预加载配置
 */
export interface PrefetchConfig {
  /**
   * 预加载延迟（毫秒），默认 100ms
   * 避免鼠标快速划过时触发不必要的预加载
   */
  delay?: number;

  /**
   * 是否在导航前预加载（默认 true）
   */
  prefetchBeforeNavigate?: boolean;

  /**
   * 是否在鼠标悬停时预加载（默认 true）
   */
  prefetchOnHover?: boolean;
}

/**
 * 预加载函数类型
 * 返回 Promise 表示预加载操作
 */
export type PrefetchFunction = () => Promise<void>;

/**
 * 预加载导航的返回类型
 */
export interface PrefetchNavigateReturn {
  /**
   * 执行导航（会先预加载数据）
   */
  navigate: (to: string, options?: NavigateOptions) => Promise<void>;

  /**
   * 鼠标悬停处理器（用于链接的 onMouseEnter）
   */
  onMouseEnter: () => void;

  /**
   * 鼠标离开处理器（用于清理定时器）
   */
  onMouseLeave: () => void;

  /**
   * 手动触发预加载
   */
  prefetch: () => Promise<void>;
}

/**
 * 使用预加载导航
 *
 * 在导航到新路由之前预加载数据，提供更流畅的用户体验
 *
 * 使用示例：
 * ```tsx
 * const { navigate, onMouseEnter, onMouseLeave } = usePrefetchNavigate(
 *   '/devices',
 *   async () => {
 *     // 预加载设备列表数据
 *     await queryClient.prefetchQuery({
 *       queryKey: deviceKeys.list({ page: 1, pageSize: 10 }),
 *       queryFn: () => getDevices({ page: 1, pageSize: 10 }),
 *     });
 *   }
 * );
 *
 * // 使用在链接上
 * <a
 *   href="/devices"
 *   onClick={(e) => {
 *     e.preventDefault();
 *     navigate('/devices');
 *   }}
 *   onMouseEnter={onMouseEnter}
 *   onMouseLeave={onMouseLeave}
 * >
 *   设备列表
 * </a>
 * ```
 */
export function usePrefetchNavigate(
  to: string,
  prefetchFn?: PrefetchFunction,
  config: PrefetchConfig = {}
): PrefetchNavigateReturn {
  const {
    delay = 100,
    prefetchBeforeNavigate = true,
    prefetchOnHover = true,
  } = config;

  const navigate = useNavigate();
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasPrefetchedRef = useRef(false);

  // 执行预加载
  const executePrefetch = useCallback(async () => {
    if (hasPrefetchedRef.current || !prefetchFn) return;

    try {
      await prefetchFn();
      hasPrefetchedRef.current = true;
    } catch (error) {
      console.warn('[Prefetch] 预加载失败:', error);
    }
  }, [prefetchFn]);

  // 鼠标悬停处理
  const handleMouseEnter = useCallback(() => {
    if (!prefetchOnHover || !prefetchFn) return;

    // 清除之前的定时器
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }

    // 延迟执行预加载
    hoverTimerRef.current = setTimeout(() => {
      executePrefetch();
    }, delay);
  }, [prefetchOnHover, prefetchFn, delay, executePrefetch]);

  // 鼠标离开处理
  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  // 导航处理
  const handleNavigate = useCallback(
    async (path: string, options?: NavigateOptions) => {
      // 导航前预加载
      if (prefetchBeforeNavigate && prefetchFn) {
        await executePrefetch();
      }

      // 执行导航
      navigate(path, options);
    },
    [navigate, prefetchBeforeNavigate, prefetchFn, executePrefetch]
  );

  return {
    navigate: (path: string = to, options?: NavigateOptions) =>
      handleNavigate(path, options),
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    prefetch: executePrefetch,
  };
}

/**
 * 预加载链接组件的 Props
 */
export interface UsePrefetchLinkReturn {
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  href: string;
}

/**
 * 使用预加载链接
 *
 * 简化版的预加载导航，专门用于链接
 *
 * 使用示例：
 * ```tsx
 * const linkProps = usePrefetchLink('/devices', async () => {
 *   await queryClient.prefetchQuery({
 *     queryKey: deviceKeys.list(),
 *     queryFn: getDevices,
 *   });
 * });
 *
 * <a {...linkProps}>设备列表</a>
 * ```
 */
export function usePrefetchLink(
  to: string,
  prefetchFn?: PrefetchFunction,
  config?: PrefetchConfig
): UsePrefetchLinkReturn {
  const { navigate, onMouseEnter, onMouseLeave } = usePrefetchNavigate(
    to,
    prefetchFn,
    config
  );

  return {
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      navigate(to);
    },
    onMouseEnter,
    onMouseLeave,
    href: to,
  };
}

/**
 * 批量预加载 Hook
 *
 * 用于预加载多个相关的查询
 *
 * 使用示例：
 * ```tsx
 * const { prefetchAll, isPrefetching } = useBatchPrefetch();
 *
 * const handleNavigate = async () => {
 *   await prefetchAll([
 *     () => queryClient.prefetchQuery({ queryKey: ['devices'], queryFn: getDevices }),
 *     () => queryClient.prefetchQuery({ queryKey: ['users'], queryFn: getUsers }),
 *   ]);
 *   navigate('/dashboard');
 * };
 * ```
 */
export function useBatchPrefetch() {
  const queryClient = useQueryClient();
  const isPrefetchingRef = useRef(false);

  const prefetchAll = useCallback(
    async (prefetchFns: PrefetchFunction[]) => {
      if (isPrefetchingRef.current) return;

      isPrefetchingRef.current = true;

      try {
        // 并行执行所有预加载
        await Promise.all(prefetchFns.map((fn) => fn()));
      } catch (error) {
        console.warn('[BatchPrefetch] 批量预加载失败:', error);
      } finally {
        isPrefetchingRef.current = false;
      }
    },
    [queryClient]
  );

  return {
    prefetchAll,
    isPrefetching: isPrefetchingRef.current,
  };
}

/**
 * 路由级别的预加载配置
 *
 * 用于定义每个路由需要预加载的数据
 */
export interface RoutePrefetchConfig {
  /**
   * 路由路径
   */
  path: string;

  /**
   * 预加载函数
   */
  prefetch: PrefetchFunction;

  /**
   * 预加载配置
   */
  config?: PrefetchConfig;
}

/**
 * 使用路由预加载映射
 *
 * 根据路由配置自动预加载数据
 *
 * 使用示例：
 * ```tsx
 * const prefetchConfigs: RoutePrefetchConfig[] = [
 *   {
 *     path: '/devices',
 *     prefetch: async () => {
 *       await queryClient.prefetchQuery({
 *         queryKey: deviceKeys.list(),
 *         queryFn: getDevices,
 *       });
 *     },
 *   },
 *   {
 *     path: '/users',
 *     prefetch: async () => {
 *       await queryClient.prefetchQuery({
 *         queryKey: userKeys.list(),
 *         queryFn: getUsers,
 *       });
 *     },
 *   },
 * ];
 *
 * const { getPrefetchProps } = useRoutePrefetch(prefetchConfigs);
 *
 * // 在导航组件中使用
 * <a {...getPrefetchProps('/devices')}>设备列表</a>
 * <a {...getPrefetchProps('/users')}>用户列表</a>
 * ```
 */
export function useRoutePrefetch(configs: RoutePrefetchConfig[]) {
  // 创建路由到预加载函数的映射
  const configMap = useRef(
    new Map(configs.map((config) => [config.path, config]))
  );

  const getPrefetchProps = useCallback(
    (path: string) => {
      const config = configMap.current.get(path);

      if (!config) {
        // 如果没有配置，返回基本的导航 props
        return usePrefetchLink(path);
      }

      return usePrefetchLink(path, config.prefetch, config.config);
    },
    []
  );

  return {
    getPrefetchProps,
  };
}
