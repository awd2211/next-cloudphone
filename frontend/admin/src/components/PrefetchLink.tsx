/**
 * 支持预加载的 Link 组件
 *
 * 自动在鼠标悬停时预加载目标页面的数据
 */

import { Link, LinkProps } from 'react-router-dom';
import { usePrefetchNavigate } from '@/hooks/usePrefetch';
import { getPrefetchConfigByPath } from '@/config/prefetchRoutes';
import { ReactNode } from 'react';

export interface PrefetchLinkProps extends Omit<LinkProps, 'to'> {
  /**
   * 目标路径
   */
  to: string;

  /**
   * 子元素
   */
  children: ReactNode;

  /**
   * 自定义预加载函数（可选）
   * 如果不提供，会从 prefetchRoutes 配置中查找
   */
  onPrefetch?: () => Promise<void>;

  /**
   * 是否禁用预加载（默认 false）
   */
  disablePrefetch?: boolean;

  /**
   * 预加载延迟（毫秒）
   */
  prefetchDelay?: number;
}

/**
 * 支持预加载的 Link 组件
 *
 * 特性：
 * - 鼠标悬停时自动预加载数据
 * - 点击前预加载（确保数据已就绪）
 * - 自动从配置中查找预加载函数
 * - 完全兼容 React Router Link
 *
 * 使用示例：
 * ```tsx
 * // 使用配置中的预加载
 * <PrefetchLink to="/devices">
 *   设备列表
 * </PrefetchLink>
 *
 * // 自定义预加载
 * <PrefetchLink
 *   to="/users/123"
 *   onPrefetch={async () => {
 *     await queryClient.prefetchQuery({
 *       queryKey: ['user', '123'],
 *       queryFn: () => getUser('123'),
 *     });
 *   }}
 * >
 *   用户详情
 * </PrefetchLink>
 *
 * // 禁用预加载
 * <PrefetchLink to="/settings" disablePrefetch>
 *   设置
 * </PrefetchLink>
 * ```
 */
const PrefetchLink: React.FC<PrefetchLinkProps> = ({
  to,
  children,
  onPrefetch,
  disablePrefetch = false,
  prefetchDelay,
  ...restProps
}) => {
  // 从配置中查找预加载函数
  const config = getPrefetchConfigByPath(to);
  const prefetchFn = onPrefetch || config?.prefetch;

  // 获取预加载延迟
  const delay = prefetchDelay ?? config?.config?.delay ?? 100;

  // 使用预加载导航 Hook
  const { onMouseEnter, onMouseLeave } = usePrefetchNavigate(
    to,
    disablePrefetch ? undefined : prefetchFn,
    {
      delay,
      prefetchOnHover: !disablePrefetch,
      prefetchBeforeNavigate: !disablePrefetch,
    }
  );

  return (
    <Link
      {...restProps}
      to={to}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </Link>
  );
};

export default PrefetchLink;
