/**
 * 路由守卫 - 基于用户菜单权限控制页面访问
 *
 * 使用方式：
 * 在 App.tsx 或路由配置中添加路由守卫逻辑
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { message } from 'antd';

export interface MenuItem {
  id: string;
  name: string;
  title: string;
  icon?: string;
  path: string;
  component?: string;
  orderNum: number;
  metadata?: Record<string, any>;
  children?: MenuItem[];
}

/**
 * 从后端获取用户菜单
 */
export async function fetchUserMenus(): Promise<MenuItem[]> {
  try {
    const response = await fetch('/api/menus', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch menus');
    }

    const menus = await response.json();
    return menus;
  } catch (error) {
    console.error('Error fetching user menus:', error);
    return [];
  }
}

/**
 * 提取所有菜单路径（包括子菜单）
 */
export function extractMenuPaths(menus: MenuItem[]): string[] {
  const paths: string[] = [];

  function traverse(items: MenuItem[]) {
    items.forEach(item => {
      if (item.path) {
        paths.push(item.path);
      }
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    });
  }

  traverse(menus);
  return paths;
}

/**
 * 检查用户是否有访问某个路径的权限
 */
export function canAccessPath(currentPath: string, allowedPaths: string[]): boolean {
  // 精确匹配
  if (allowedPaths.includes(currentPath)) {
    return true;
  }

  // 通配符匹配（父路径）
  // 例如：用户有 /devices 权限，则可以访问 /devices/list, /devices/123 等
  return allowedPaths.some(allowedPath =>
    currentPath.startsWith(allowedPath + '/')
  );
}

/**
 * 路由守卫 Hook
 * 在每个需要权限控制的页面使用
 */
export function useRouteGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      // 公开路径不需要检查权限
      const publicPaths = ['/login', '/register', '/forgot-password'];
      if (publicPaths.includes(location.pathname)) {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // 检查是否登录
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('请先登录');
        navigate('/login');
        return;
      }

      // 获取用户菜单
      const menus = await fetchUserMenus();
      const allowedPaths = extractMenuPaths(menus);

      // 检查当前路径是否在允许的路径列表中
      const canAccess = canAccessPath(location.pathname, allowedPaths);

      if (!canAccess) {
        message.error('您没有权限访问此页面');
        navigate('/403'); // 跳转到无权限页面
      } else {
        setHasAccess(true);
      }

      setLoading(false);
    }

    checkAccess();
  }, [location.pathname, navigate]);

  return { loading, hasAccess };
}

/**
 * 将平铺菜单转换为树形结构（如果需要）
 */
export function buildMenuTree(menus: MenuItem[]): MenuItem[] {
  // 如果后端已经返回了树形结构，直接返回
  if (menus.some(menu => menu.children && menu.children.length > 0)) {
    return menus;
  }

  // 否则手动构建树形结构
  const menuMap = new Map<string, MenuItem>();
  const roots: MenuItem[] = [];

  // 第一遍遍历：创建 map
  menus.forEach(menu => {
    menuMap.set(menu.id, { ...menu, children: [] });
  });

  // 第二遍遍历：构建树
  menus.forEach(menu => {
    const node = menuMap.get(menu.id)!;
    const parentId = menu.metadata?.parentId;

    if (parentId && menuMap.has(parentId)) {
      const parent = menuMap.get(parentId)!;
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/**
 * 过滤隐藏的菜单
 */
export function filterVisibleMenus(menus: MenuItem[]): MenuItem[] {
  return menus
    .filter(menu => menu.metadata?.visible !== false)
    .map(menu => ({
      ...menu,
      children: menu.children ? filterVisibleMenus(menu.children) : [],
    }));
}
