/**
 * 菜单权限服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { MenuItem, MenuCacheStats } from '@/types';

/**
 * 获取所有菜单（管理员）
 */
export const getAllMenus = (): Promise<MenuItem[]> =>
  api.get<MenuItem[]>('/menu-permissions/all-menus');

/**
 * 获取当前用户的菜单树
 */
export const getMyMenus = (): Promise<MenuItem[]> =>
  api.get<MenuItem[]>('/menu-permissions/my-menus');

/**
 * 获取当前用户的所有权限
 */
export const getMyPermissions = (): Promise<string[]> =>
  api.get<string[]>('/menu-permissions/my-permissions');

/**
 * 获取指定用户的菜单
 */
export const getUserMenus = (userId: string): Promise<MenuItem[]> =>
  api.get<MenuItem[]>(`/menu-permissions/user/${userId}/menus`);

/**
 * 获取指定用户的权限列表
 */
export const getUserPermissions = (userId: string): Promise<string[]> =>
  api.get<string[]>(`/menu-permissions/user/${userId}/permissions`);

/**
 * 检查菜单访问权限
 */
export const checkMenuAccess = (path: string): Promise<{ hasAccess: boolean; reason?: string }> =>
  api.get<{ hasAccess: boolean; reason?: string }>(
    '/menu-permissions/check-menu-access',
    { params: { path } }
  );

/**
 * 获取面包屑导航
 */
export const getBreadcrumb = (path: string): Promise<Array<{ name: string; path: string }>> =>
  api.get<Array<{ name: string; path: string }>>('/menu-permissions/breadcrumb', {
    params: { path },
  });

/**
 * 获取缓存统计信息
 */
export const getCacheStats = (): Promise<MenuCacheStats> =>
  api.get<MenuCacheStats>('/menu-permissions/cache/stats');

/**
 * 刷新指定用户的权限缓存
 */
export const refreshUserCache = (userId: string): Promise<{ success: boolean; message: string }> =>
  api.get<{ success: boolean; message: string }>(
    `/menu-permissions/cache/refresh/${userId}`
  );

/**
 * 清空所有权限缓存
 */
export const clearAllCache = (): Promise<{ success: boolean; message: string; clearedCount: number }> =>
  api.get<{ success: boolean; message: string; clearedCount: number }>(
    '/menu-permissions/cache/clear-all'
  );

/**
 * 预热缓存（为活跃用户预加载权限）
 */
export const warmupCache = (limit?: number): Promise<{ success: boolean; message: string; warmedUpCount: number }> =>
  api.get<{ success: boolean; message: string; warmedUpCount: number }>(
    '/menu-permissions/cache/warmup',
    { params: limit ? { limit } : {} }
  );

/**
 * 导出缓存数据
 */
export const exportCacheData = (): Promise<Record<string, any>> =>
  api.get<Record<string, any>>('/menu-permissions/cache/export');
