import request from '@/utils/request';
import type { MenuItem, MenuCacheStats } from '@/types';

/**
 * 获取所有菜单（管理员）
 */
export const getAllMenus = () => {
  return request.get<MenuItem[]>('/menu-permissions/all-menus');
};

/**
 * 获取当前用户的菜单树
 */
export const getMyMenus = () => {
  return request.get<MenuItem[]>('/menu-permissions/my-menus');
};

/**
 * 获取当前用户的所有权限
 */
export const getMyPermissions = () => {
  return request.get<string[]>('/menu-permissions/my-permissions');
};

/**
 * 获取指定用户的菜单
 */
export const getUserMenus = (userId: string) => {
  return request.get<MenuItem[]>(`/menu-permissions/user/${userId}/menus`);
};

/**
 * 获取指定用户的权限列表
 */
export const getUserPermissions = (userId: string) => {
  return request.get<string[]>(`/menu-permissions/user/${userId}/permissions`);
};

/**
 * 检查菜单访问权限
 */
export const checkMenuAccess = (path: string) => {
  return request.get<{ hasAccess: boolean; reason?: string }>(
    '/menu-permissions/check-menu-access',
    { params: { path } }
  );
};

/**
 * 获取面包屑导航
 */
export const getBreadcrumb = (path: string) => {
  return request.get<Array<{ name: string; path: string }>>(
    '/menu-permissions/breadcrumb',
    { params: { path } }
  );
};

/**
 * 获取缓存统计信息
 */
export const getCacheStats = () => {
  return request.get<MenuCacheStats>('/menu-permissions/cache/stats');
};

/**
 * 刷新指定用户的权限缓存
 */
export const refreshUserCache = (userId: string) => {
  return request.get<{ success: boolean; message: string }>(
    `/menu-permissions/cache/refresh/${userId}`
  );
};

/**
 * 清空所有权限缓存
 */
export const clearAllCache = () => {
  return request.get<{ success: boolean; message: string; clearedCount: number }>(
    '/menu-permissions/cache/clear-all'
  );
};

/**
 * 预热缓存（为活跃用户预加载权限）
 */
export const warmupCache = (limit?: number) => {
  return request.get<{ success: boolean; message: string; warmedUpCount: number }>(
    '/menu-permissions/cache/warmup',
    { params: limit ? { limit } : {} }
  );
};

/**
 * 导出缓存数据
 */
export const exportCacheData = () => {
  return request.get<Record<string, any>>('/menu-permissions/cache/export');
};
