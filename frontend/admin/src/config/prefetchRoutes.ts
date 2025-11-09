/**
 * 路由预加载配置
 *
 * 定义每个路由需要预加载的数据
 * 当用户鼠标悬停在导航链接上时，自动预加载对应页面的数据
 */

import { queryClient } from '@/lib/react-query';
import type { RoutePrefetchConfig } from '@/hooks/usePrefetch';

// 导入各个 service 和 query keys
import { deviceKeys } from '@/hooks/useDevices';
import { quotaKeys } from '@/hooks/queries/useQuotas';
import { notificationKeys } from '@/hooks/queries/useNotifications';
import * as deviceService from '@/services/device';
import * as quotaService from '@/services/quota';
import * as userService from '@/services/user';
import * as notificationService from '@/services/notification';

/**
 * 路由预加载配置列表
 *
 * 每个路由可以配置：
 * - path: 路由路径
 * - prefetch: 预加载函数（通常是 prefetchQuery）
 * - config: 预加载配置（延迟、触发条件等）
 */
export const prefetchRoutes: RoutePrefetchConfig[] = [
  // ==================== 首页 Dashboard ====================
  {
    path: '/',
    prefetch: async () => {
      // 预加载仪表盘的关键数据
      await Promise.all([
        // 设备统计
        queryClient.prefetchQuery({
          queryKey: deviceKeys.stats(),
          queryFn: () => deviceService.getDeviceStats(),
          staleTime: 60 * 1000, // 1 分钟
        }),
        // 最近的设备列表
        queryClient.prefetchQuery({
          queryKey: deviceKeys.list({ page: 1, pageSize: 5 }),
          queryFn: () => deviceService.getDevices({ page: 1, pageSize: 5 }),
          staleTime: 30 * 1000,
        }),
      ]);
    },
    config: {
      delay: 200, // 延迟 200ms，避免快速划过
    },
  },

  // ==================== 设备管理 ====================
  {
    path: '/devices',
    prefetch: async () => {
      // 预加载设备列表（第一页）
      await queryClient.prefetchQuery({
        queryKey: deviceKeys.list({ page: 1, pageSize: 20 }),
        queryFn: () => deviceService.getDevices({ page: 1, pageSize: 20 }),
        staleTime: 30 * 1000,
      });
    },
    config: {
      delay: 150,
    },
  },

  // {
  //   path: '/devices/templates',
  //   prefetch: async () => {
  //     // 预加载设备模板列表
  //     // TODO: 实现 deviceService.getDeviceTemplates()
  //     await queryClient.prefetchQuery({
  //       queryKey: ['device-templates'],
  //       queryFn: () => deviceService.getDeviceTemplates(),
  //       staleTime: 5 * 60 * 1000, // 5 分钟
  //     });
  //   },
  // },

  // ==================== 配额管理 ====================
  {
    path: '/quotas',
    prefetch: async () => {
      await Promise.all([
        // 配额列表
        queryClient.prefetchQuery({
          queryKey: quotaKeys.list({ limit: 100 }),
          queryFn: () => quotaService.getAllQuotas({ limit: 100 }),
          staleTime: 30 * 1000,
        }),
        // 配额告警
        queryClient.prefetchQuery({
          queryKey: quotaKeys.alerts(80),
          queryFn: () => quotaService.getQuotaAlerts(80),
          staleTime: 30 * 1000,
        }),
      ]);
    },
  },

  // ==================== 用户管理 ====================
  {
    path: '/users',
    prefetch: async () => {
      // 预加载用户列表
      await queryClient.prefetchQuery({
        queryKey: ['users', { page: 1, pageSize: 20 }],
        queryFn: () => userService.getUsers({ page: 1, pageSize: 20 }),
        staleTime: 30 * 1000,
      });
    },
  },

  // {
  //   path: '/users/roles',
  //   prefetch: async () => {
  //     // TODO: 实现 userService.getRoles() 和 userService.getPermissions()
  //     await Promise.all([
  //       // 角色列表
  //       queryClient.prefetchQuery({
  //         queryKey: ['roles'],
  //         queryFn: () => userService.getRoles(),
  //         staleTime: 5 * 60 * 1000, // 角色变化不频繁，缓存 5 分钟
  //       }),
  //       // 权限列表
  //       queryClient.prefetchQuery({
  //         queryKey: ['permissions'],
  //         queryFn: () => userService.getPermissions(),
  //         staleTime: 5 * 60 * 1000,
  //       }),
  //     ]);
  //   },
  // },

  // ==================== 应用管理 ====================
  {
    path: '/apps',
    prefetch: async () => {
      // 预加载应用列表
      await queryClient.prefetchQuery({
        queryKey: ['apps', { page: 1, pageSize: 20 }],
        queryFn: async () => {
          // 假设有 getApps service
          return { data: [], total: 0 };
        },
        staleTime: 60 * 1000,
      });
    },
  },

  // ==================== 计费管理 ====================
  {
    path: '/billing',
    prefetch: async () => {
      await Promise.all([
        // 计费概览
        queryClient.prefetchQuery({
          queryKey: ['billing-overview'],
          queryFn: async () => {
            // 假设有 getBillingOverview service
            return {};
          },
          staleTime: 2 * 60 * 1000, // 2 分钟
        }),
      ]);
    },
  },

  {
    path: '/billing/invoices',
    prefetch: async () => {
      // 预加载发票列表
      await queryClient.prefetchQuery({
        queryKey: ['invoices', { page: 1, pageSize: 20 }],
        queryFn: async () => {
          // 假设有 getInvoices service
          return { data: [], total: 0 };
        },
        staleTime: 60 * 1000,
      });
    },
  },

  // ==================== 通知中心 ====================
  {
    path: '/notifications',
    prefetch: async () => {
      // 假设当前用户 ID（实际应该从用户上下文获取）
      const userId = localStorage.getItem('userId') || 'current-user';

      await Promise.all([
        // 通知列表
        queryClient.prefetchQuery({
          queryKey: notificationKeys.list(userId),
          queryFn: () => notificationService.getNotifications(userId),
          staleTime: 10 * 1000, // 10 秒
        }),
        // 未读数
        queryClient.prefetchQuery({
          queryKey: notificationKeys.unreadCount(userId),
          queryFn: () => notificationService.getUnreadCount(userId),
          staleTime: 10 * 1000,
        }),
      ]);
    },
    config: {
      delay: 100, // 通知中心延迟更短，用户经常访问
    },
  },

  // ==================== 审计日志 ====================
  {
    path: '/audit',
    prefetch: async () => {
      // 预加载审计日志列表
      await queryClient.prefetchQuery({
        queryKey: ['audit-logs', { page: 1, pageSize: 50 }],
        queryFn: async () => {
          // 假设有 getAuditLogs service
          return { data: [], total: 0 };
        },
        staleTime: 30 * 1000,
      });
    },
  },

  // ==================== 分析报表 ====================
  {
    path: '/analytics',
    prefetch: async () => {
      // 预加载分析数据（过去 7 天）
      await queryClient.prefetchQuery({
        queryKey: ['analytics', { days: 7 }],
        queryFn: async () => {
          // 假设有 getAnalytics service
          return {};
        },
        staleTime: 5 * 60 * 1000, // 分析数据变化慢，缓存 5 分钟
      });
    },
    config: {
      delay: 300, // 分析页面数据量大，延迟长一些
    },
  },

  // ==================== 系统设置 ====================
  {
    path: '/settings',
    prefetch: async () => {
      // 预加载系统设置
      await queryClient.prefetchQuery({
        queryKey: ['settings'],
        queryFn: async () => {
          // 假设有 getSettings service
          return {};
        },
        staleTime: 10 * 60 * 1000, // 设置不常变化，缓存 10 分钟
      });
    },
  },
];

/**
 * 根据路径获取预加载配置
 */
export function getPrefetchConfigByPath(path: string): RoutePrefetchConfig | undefined {
  return prefetchRoutes.find((config) => config.path === path);
}

/**
 * 预加载多个路由的数据
 */
export async function prefetchMultipleRoutes(paths: string[]): Promise<void> {
  const configs = paths
    .map(getPrefetchConfigByPath)
    .filter((config): config is RoutePrefetchConfig => !!config);

  await Promise.all(configs.map((config) => config.prefetch()));
}

/**
 * 智能预加载策略
 *
 * 根据用户的访问模式，预加载可能访问的页面
 *
 * 例如：
 * - 访问设备列表后，预加载设备详情页的数据结构
 * - 访问用户管理后，预加载角色权限数据
 */
export async function smartPrefetch(currentPath: string): Promise<void> {
  const smartPrefetchMap: Record<string, string[]> = {
    // TODO: 设备列表 → 设备模板（需要实现 getDeviceTemplates）
    // '/devices': ['/devices/templates'],

    // TODO: 用户管理 → 角色和权限（需要实现 getRoles 和 getPermissions）
    // '/users': ['/users/roles'],

    // 访问计费后，预加载发票列表
    '/billing': ['/billing/invoices'],
  };

  const relatedPaths = smartPrefetchMap[currentPath];
  if (relatedPaths) {
    await prefetchMultipleRoutes(relatedPaths);
  }
}
