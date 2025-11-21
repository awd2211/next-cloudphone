/**
 * 路由预加载工具
 * 在用户hover或触发某个动作时预加载对应的路由组件
 * 减少实际导航时的等待时间
 */

type PreloadFn = () => Promise<any>;

// 预加载缓存，避免重复加载
const preloadedRoutes = new Set<string>();

/**
 * 预加载路由组件
 * @param importFn 动态导入函数
 * @param routeName 路由名称（用于去重）
 * @returns Promise<void>
 */
export const preloadRoute = async (importFn: PreloadFn, routeName: string): Promise<void> => {
  // 已经预加载过，跳过
  if (preloadedRoutes.has(routeName)) {
    console.log(`[RoutePreloader] Route "${routeName}" already preloaded, skipping`);
    return;
  }

  try {
    console.log(`[RoutePreloader] Preloading route: ${routeName}`);
    const startTime = performance.now();

    await importFn();

    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);

    preloadedRoutes.add(routeName);
    console.log(`[RoutePreloader] Route "${routeName}" preloaded in ${duration}ms`);
  } catch (_error) {
    console.error(`[RoutePreloader] Failed to preload route "${routeName}":`, error);
  }
};

/**
 * 在鼠标悬停时预加载路由
 * @param importFn 动态导入函数
 * @param routeName 路由名称
 * @returns 返回 onMouseEnter 事件处理函数
 *
 * @example
 * <Button onMouseEnter={preloadOnHover(() => import('@/pages/Dashboard'), 'Dashboard')}>
 *   进入仪表盘
 * </Button>
 */
export const preloadOnHover = (importFn: PreloadFn, routeName: string) => {
  return () => {
    preloadRoute(importFn, routeName);
  };
};

/**
 * 在空闲时预加载路由列表
 * 使用 requestIdleCallback 在浏览器空闲时预加载
 * @param routes 预加载配置列表
 *
 * @example
 * preloadOnIdle([
 *   { importFn: () => import('@/pages/Dashboard'), routeName: 'Dashboard' },
 *   { importFn: () => import('@/pages/Device/List'), routeName: 'DeviceList' },
 * ]);
 */
export const preloadOnIdle = (routes: Array<{ importFn: PreloadFn; routeName: string }>): void => {
  if (!('requestIdleCallback' in window)) {
    // 浏览器不支持 requestIdleCallback，降级为 setTimeout
    console.warn('[RoutePreloader] requestIdleCallback not supported, using setTimeout');
    routes.forEach(({ importFn, routeName }) => {
      setTimeout(() => preloadRoute(importFn, routeName), 100);
    });
    return;
  }

  let currentIndex = 0;

  const schedulePreload = () => {
    if (currentIndex >= routes.length) return;

    const route = routes[currentIndex];
    // ✅ 添加类型守卫
    if (!route) return;

    const { importFn, routeName } = route;
    currentIndex++;

    requestIdleCallback(
      () => {
        preloadRoute(importFn, routeName).finally(() => {
          // 继续预加载下一个路由
          schedulePreload();
        });
      },
      { timeout: 3000 } // 3 秒超时
    );
  };

  schedulePreload();
};

/**
 * 根据用户权限预加载常用路由
 * 通常在用户登录成功后调用
 *
 * @param userRole 用户角色
 *
 * @example
 * preloadCommonRoutes('admin');
 */
export const preloadCommonRoutes = (userRole: string): void => {
  // ✅ 显式声明类型，避免 TypeScript 推断过于具体的 import 类型
  type RouteConfig = { importFn: PreloadFn; routeName: string };

  // 所有角色都可以访问的页面
  const commonRoutes: RouteConfig[] = [
    { importFn: () => import('@/pages/Dashboard'), routeName: 'Dashboard' },
    { importFn: () => import('@/pages/Profile'), routeName: 'Profile' },
    { importFn: () => import('@/pages/Notifications'), routeName: 'Notifications' },
  ];

  // 管理员额外预加载的页面
  const adminRoutes: RouteConfig[] = [
    { importFn: () => import('@/pages/Device/List'), routeName: 'DeviceList' },
    { importFn: () => import('@/pages/User/List'), routeName: 'UserList' },
    { importFn: () => import('@/pages/Report/Analytics'), routeName: 'Analytics' },
  ];

  // 普通用户额外预加载的页面
  const userRoutes: RouteConfig[] = [
    { importFn: () => import('@/pages/Device/List'), routeName: 'DeviceList' },
    { importFn: () => import('@/pages/Billing/BalanceOverview'), routeName: 'BalanceOverview' },
  ];

  let routesToPreload = [...commonRoutes];

  if (userRole === 'admin' || userRole === 'super_admin') {
    routesToPreload = [...routesToPreload, ...adminRoutes];
  } else {
    routesToPreload = [...routesToPreload, ...userRoutes];
  }

  console.log(`[RoutePreloader] Preloading routes for role: ${userRole}`);
  preloadOnIdle(routesToPreload);
};

/**
 * 重置预加载缓存
 * 用于测试或特殊场景
 */
export const resetPreloadCache = (): void => {
  preloadedRoutes.clear();
  console.log('[RoutePreloader] Preload cache cleared');
};

export default {
  preloadRoute,
  preloadOnHover,
  preloadOnIdle,
  preloadCommonRoutes,
  resetPreloadCache,
};
