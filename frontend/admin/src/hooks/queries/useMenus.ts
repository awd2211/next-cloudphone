/**
 * Menus React Query Hooks
 *
 * 基于 @/services/menu
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as menuService from '@/services/menu';
import { useValidatedQuery } from './useValidatedQuery';
import { MenuCacheStatsSchema } from '@/schemas/api.schemas';

/**
 * Query Keys
 */
export const menuKeys = {
  all: ['menu-permissions'] as const,
  allMenus: () => [...menuKeys.all, 'all-menus'] as const,
  myMenus: () => [...menuKeys.all, 'my-menus'] as const,
  myPermissions: () => [...menuKeys.all, 'my-permissions'] as const,
  userMenus: (userId: string) => [...menuKeys.all, 'user', userId, 'menus'] as const,
  userPermissions: (userId: string) => [...menuKeys.all, 'user', userId, 'permissions'] as const,
  menuAccess: (path: string) => [...menuKeys.all, 'access', path] as const,
  breadcrumb: (path: string) => [...menuKeys.all, 'breadcrumb', path] as const,
  cacheStats: () => [...menuKeys.all, 'cache', 'stats'] as const,
};

/**
 * 获取所有菜单（管理员）
 */
export const useAllMenus = () => {
  return useQuery({
    queryKey: menuKeys.allMenus(),
    queryFn: () => menuService.getAllMenus(),
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};

/**
 * 获取当前用户的菜单树
 */
export const useMyMenus = () => {
  return useQuery({
    queryKey: menuKeys.myMenus(),
    queryFn: () => menuService.getMyMenus(),
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 获取当前用户的所有权限
 */
export const useMyPermissions = () => {
  return useQuery({
    queryKey: menuKeys.myPermissions(),
    queryFn: () => menuService.getMyPermissions(),
    staleTime: 60 * 1000, // 1分钟
  });
};

/**
 * 获取指定用户的菜单
 */
export const useUserMenus = (userId: string) => {
  return useQuery({
    queryKey: menuKeys.userMenus(userId),
    queryFn: () => menuService.getUserMenus(userId),
    enabled: !!userId,
  });
};

/**
 * 获取指定用户的权限列表
 */
export const useUserPermissions = (userId: string) => {
  return useQuery({
    queryKey: menuKeys.userPermissions(userId),
    queryFn: () => menuService.getUserPermissions(userId),
    enabled: !!userId,
  });
};

/**
 * 检查菜单访问权限
 */
export const useCheckMenuAccess = (path: string) => {
  return useQuery({
    queryKey: menuKeys.menuAccess(path),
    queryFn: () => menuService.checkMenuAccess(path),
    enabled: !!path,
    staleTime: 30 * 1000, // 30秒
  });
};

/**
 * 获取面包屑导航
 */
export const useBreadcrumb = (path: string) => {
  return useQuery({
    queryKey: menuKeys.breadcrumb(path),
    queryFn: () => menuService.getBreadcrumb(path),
    enabled: !!path,
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};

/**
 * 获取缓存统计信息
 */
export const useMenuCacheStats = () => {
  return useValidatedQuery({
    queryKey: menuKeys.cacheStats(),
    queryFn: () => menuService.getCacheStats(),
    schema: MenuCacheStatsSchema,
    staleTime: 10 * 1000, // 10秒
  });
};

/**
 * 刷新指定用户的权限缓存 Mutation
 */
export const useRefreshUserCache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => menuService.refreshUserCache(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.userMenus(userId) });
      queryClient.invalidateQueries({ queryKey: menuKeys.userPermissions(userId) });
      message.success('缓存已刷新');
    },
    onError: () => {
      message.error('刷新缓存失败');
    },
  });
};

/**
 * 清空所有权限缓存 Mutation
 */
export const useClearAllCache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => menuService.clearAllCache(),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.all });
      const count = response?.clearedCount || 0;
      message.success(`已清空 ${count} 个缓存`);
    },
    onError: () => {
      message.error('清空缓存失败');
    },
  });
};

/**
 * 预热缓存 Mutation
 */
export const useWarmupCache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (limit?: number) => menuService.warmupCache(limit),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: menuKeys.cacheStats() });
      const count = response?.warmedUpCount || 0;
      message.success(`已预热 ${count} 个用户缓存`);
    },
    onError: () => {
      message.error('预热缓存失败');
    },
  });
};

/**
 * 导出缓存数据 Mutation
 */
export const useExportCacheData = () => {
  return useMutation({
    mutationFn: () => menuService.exportCacheData(),
    onSuccess: () => {
      message.success('导出成功');
    },
    onError: () => {
      message.error('导出失败');
    },
  });
};
