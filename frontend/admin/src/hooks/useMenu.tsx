import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { api } from '../utils/api';

/**
 * 菜单项接口
 */
export interface MenuItem {
  key: string;
  label: string;
  path?: string;
  icon?: string;
  permission?: string;
  children?: MenuItem[];
  meta?: {
    requiresAuth?: boolean;
    hideInMenu?: boolean;
    order?: number;
    [key: string]: any;
  };
}

/**
 * 面包屑项接口
 */
export interface BreadcrumbItem {
  key: string;
  label: string;
  path?: string;
}

/**
 * 全局菜单缓存
 */
let globalMenus: MenuItem[] | null = null;
let menusPromise: Promise<any> | null = null;

/**
 * 清除菜单缓存（独立函数，供登出时调用）
 *
 * @example
 * import { clearMenuCache } from '@/hooks/useMenu';
 *
 * // 登出时清理缓存
 * const handleLogout = () => {
 *   clearPermissionCache();
 *   clearMenuCache();
 *   localStorage.clear();
 *   navigate('/login');
 * };
 */
export const clearMenuCache = () => {
  globalMenus = null;
  menusPromise = null;
};

/**
 * useMenu Hook
 * 用于管理和查询菜单权限
 *
 * @example
 * const {
 *   menus,
 *   loading,
 *   checkMenuAccess,
 *   getBreadcrumb,
 *   findMenuByPath,
 *   refreshMenus,
 * } = useMenu();
 *
 * // 检查菜单访问权限
 * const hasAccess = await checkMenuAccess('/devices/list');
 *
 * // 获取面包屑
 * const breadcrumb = await getBreadcrumb('/devices/list');
 *
 * // 查找菜单项
 * const menuItem = findMenuByPath('/devices');
 */
export const useMenu = () => {
  const [menus, setMenus] = useState<MenuItem[]>(globalMenus || []);
  const [loading, setLoading] = useState(globalMenus === null);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 加载用户菜单
   */
  const loadMenus = useCallback(async () => {
    // 如果已经在加载中，复用 Promise
    if (menusPromise) {
      return menusPromise;
    }

    // 如果已经有缓存，直接返回
    if (globalMenus !== null) {
      return;
    }

    try {
      setLoading(true);
      menusPromise = api.get<MenuItem[]>('/menu-permissions/my-menus');
      const menuData = await menusPromise;

      globalMenus = menuData || [];
      setMenus(globalMenus);
    } catch (err: any) {
      setError(err);
      console.error('Failed to load menus:', err);
    } finally {
      setLoading(false);
      menusPromise = null;
    }
  }, []);

  /**
   * 刷新菜单缓存
   */
  const refreshMenus = useCallback(async () => {
    globalMenus = null;
    menusPromise = null;
    setLoading(true);
    await loadMenus();
  }, [loadMenus]);

  /**
   * 清除菜单缓存
   */
  const clearMenus = useCallback(() => {
    globalMenus = null;
    menusPromise = null;
    setMenus([]);
    setLoading(false);
    setError(null);
  }, []);

  /**
   * 检查菜单访问权限
   */
  const checkMenuAccess = useCallback(async (path: string): Promise<boolean> => {
    try {
      // ✅ request.ts 已自动解包响应，直接返回 data
      const response = await request.get<any>('/menu-permissions/check-menu-access', {
        params: { path },
      });
      return response?.hasAccess || false;
    } catch (err) {
      console.error('Failed to check menu access:', err);
      return false;
    }
  }, []);

  /**
   * 获取面包屑导航
   */
  const getBreadcrumb = useCallback(async (path: string): Promise<BreadcrumbItem[]> => {
    try {
      return await api.get<BreadcrumbItem[]>('/menu-permissions/breadcrumb', {
        params: { path },
      }) || [];
    } catch (err) {
      console.error('Failed to get breadcrumb:', err);
      return [];
    }
  }, []);

  /**
   * 获取所有菜单（管理员用）
   */
  const getAllMenus = useCallback(async (): Promise<MenuItem[]> => {
    try {
      return await api.get<MenuItem[]>('/menu-permissions/all-menus') || [];
    } catch (err) {
      console.error('Failed to get all menus:', err);
      return [];
    }
  }, []);

  /**
   * 根据路径查找菜单项（递归）
   */
  const findMenuByPath = useCallback(
    (path: string, menuList: MenuItem[] = menus): MenuItem | null => {
      for (const menu of menuList) {
        if (menu.path === path) {
          return menu;
        }
        if (menu.children && menu.children.length > 0) {
          const found = findMenuByPath(path, menu.children);
          if (found) return found;
        }
      }
      return null;
    },
    [menus]
  );

  /**
   * 根据 key 查找菜单项（递归）
   */
  const findMenuByKey = useCallback(
    (key: string, menuList: MenuItem[] = menus): MenuItem | null => {
      for (const menu of menuList) {
        if (menu.key === key) {
          return menu;
        }
        if (menu.children && menu.children.length > 0) {
          const found = findMenuByKey(key, menu.children);
          if (found) return found;
        }
      }
      return null;
    },
    [menus]
  );

  /**
   * 过滤菜单（根据条件函数）
   */
  const filterMenus = useCallback(
    (predicate: (menu: MenuItem) => boolean, menuList: MenuItem[] = menus): MenuItem[] => {
      return menuList
        .filter((menu) => {
          if (!predicate(menu)) return false;

          // 递归过滤子菜单
          if (menu.children && menu.children.length > 0) {
            menu.children = filterMenus(predicate, menu.children);
          }

          return true;
        })
        .map((menu) => ({ ...menu }));
    },
    [menus]
  );

  /**
   * 展平菜单树为列表
   */
  const flattenMenus = useCallback(
    (menuList: MenuItem[] = menus): MenuItem[] => {
      const result: MenuItem[] = [];

      const flatten = (items: MenuItem[]) => {
        for (const item of items) {
          result.push(item);
          if (item.children && item.children.length > 0) {
            flatten(item.children);
          }
        }
      };

      flatten(menuList);
      return result;
    },
    [menus]
  );

  /**
   * 获取所有菜单路径
   */
  const getAllPaths = useMemo(() => {
    const paths: string[] = [];

    const extract = (items: MenuItem[]) => {
      for (const item of items) {
        if (item.path) {
          paths.push(item.path);
        }
        if (item.children && item.children.length > 0) {
          extract(item.children);
        }
      }
    };

    extract(menus);
    return paths;
  }, [menus]);

  /**
   * 获取菜单层级深度
   */
  const getMenuDepth = useCallback(
    (menuList: MenuItem[] = menus): number => {
      if (!menuList || menuList.length === 0) return 0;

      let maxDepth = 1;
      for (const menu of menuList) {
        if (menu.children && menu.children.length > 0) {
          const childDepth = getMenuDepth(menu.children);
          maxDepth = Math.max(maxDepth, 1 + childDepth);
        }
      }
      return maxDepth;
    },
    [menus]
  );

  /**
   * 根据 meta.order 排序菜单
   */
  const sortMenus = useCallback((menuList: MenuItem[]): MenuItem[] => {
    return menuList
      .sort((a, b) => {
        const orderA = a.meta?.order ?? 999;
        const orderB = b.meta?.order ?? 999;
        return orderA - orderB;
      })
      .map((menu) => ({
        ...menu,
        children: menu.children ? sortMenus(menu.children) : undefined,
      }));
  }, []);

  /**
   * 构建父子关系映射
   */
  const buildMenuMap = useMemo(() => {
    const map = new Map<string, MenuItem>();
    const parentMap = new Map<string, string | null>();

    const buildMap = (items: MenuItem[], parentKey: string | null = null) => {
      for (const item of items) {
        map.set(item.key, item);
        parentMap.set(item.key, parentKey);
        if (item.children && item.children.length > 0) {
          buildMap(item.children, item.key);
        }
      }
    };

    buildMap(menus);

    return {
      getMenu: (key: string) => map.get(key),
      getParent: (key: string) => {
        const parentKey = parentMap.get(key);
        return parentKey ? map.get(parentKey) : null;
      },
      getAncestors: (key: string): MenuItem[] => {
        const ancestors: MenuItem[] = [];
        let currentKey: string | null = key;

        while (currentKey) {
          const parentKey = parentMap.get(currentKey);
          if (parentKey) {
            const parent = map.get(parentKey);
            if (parent) {
              ancestors.unshift(parent);
            }
            currentKey = parentKey;
          } else {
            break;
          }
        }

        return ancestors;
      },
    };
  }, [menus]);

  /**
   * 检查菜单是否可见
   */
  const isMenuVisible = useCallback((menu: MenuItem): boolean => {
    return !menu.meta?.hideInMenu;
  }, []);

  /**
   * 获取可见菜单
   */
  const visibleMenus = useMemo(() => {
    return filterMenus(isMenuVisible);
  }, [filterMenus, isMenuVisible]);

  /**
   * 初始化加载菜单
   */
  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  return {
    // 状态
    menus,
    visibleMenus,
    loading,
    error,

    // 加载方法
    refreshMenus,
    clearMenus,
    getAllMenus,

    // 访问检查
    checkMenuAccess,
    getBreadcrumb,

    // 查找方法
    findMenuByPath,
    findMenuByKey,
    filterMenus,
    flattenMenus,

    // 工具方法
    getAllPaths,
    getMenuDepth,
    sortMenus,
    buildMenuMap,
    isMenuVisible,
  };
};

/**
 * MenuGuard 组件
 * 根据菜单权限控制子组件的显示
 *
 * @example
 * <MenuGuard path="/devices/create">
 *   <CreateButton />
 * </MenuGuard>
 */
export interface MenuGuardProps {
  children: React.ReactNode;
  path: string;
  fallback?: React.ReactNode;
}

// ✅ 使用 memo 包装组件，避免不必要的重渲染
export const MenuGuard: React.FC<MenuGuardProps> = memo(({ children, path, fallback = null }) => {
  const { findMenuByPath, loading } = useMenu();

  if (loading) {
    return <>{fallback}</>;
  }

  const menu = findMenuByPath(path);
  return menu ? <>{children}</> : <>{fallback}</>;
});

MenuGuard.displayName = 'MenuGuard';

export default useMenu;
