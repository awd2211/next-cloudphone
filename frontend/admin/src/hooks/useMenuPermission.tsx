import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Modal, Input, message } from 'antd';
import { z } from 'zod';
import type { MenuItem } from '@/types';
import {
  getAllMenus,
  getUserMenus,
  getCacheStats,
  refreshUserCache,
  clearAllCache,
  warmupCache,
  exportCacheData,
} from '@/services/menu';
import {
  filterMenusByName,
  getAllParentKeys,
  findMenuById,
  countMenus,
} from '@/components/MenuPermission';
import dayjs from 'dayjs';
import { useValidatedQuery } from '@/hooks/utils';
import { MenuItemSchema, MenuCacheStatsSchema } from '@/schemas/api.schemas';

export const useMenuPermission = () => {
  // 菜单相关
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState(''); // ✅ 防抖后的搜索值
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined); // ✅ 防抖定时器

  // 缓存管理相关
  const [cacheLoading, setCacheLoading] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);

  // 用户访问测试
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testUserId, setTestUserId] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  /**
   * 加载所有菜单 - 使用 useValidatedQuery
   */
  const {
    data: menus,
    isLoading: loading,
    refetch: loadMenus,
  } = useValidatedQuery({
    queryKey: ['all-menus'],
    queryFn: getAllMenus,
    schema: z.array(MenuItemSchema),
    apiErrorMessage: '加载菜单失败',
    fallbackValue: [],
    staleTime: 60 * 1000, // 菜单配置1分钟缓存
  });

  /**
   * 加载缓存统计 - 使用 useValidatedQuery
   * ✅ 懒加载：只在打开统计弹窗时加载
   */
  const {
    data: cacheStats,
    refetch: loadCacheStats,
  } = useValidatedQuery({
    queryKey: ['menu-cache-stats'],
    queryFn: getCacheStats,
    schema: MenuCacheStatsSchema,
    apiErrorMessage: '加载缓存统计失败',
    enabled: false, // ✅ 手动触发，不自动加载
    staleTime: 10 * 1000, // 缓存统计10秒缓存
  });

  /**
   * 测试用户菜单 - 使用 useValidatedQuery
   */
  const {
    data: testUserMenus,
    isLoading: testUserMenusLoading,
    refetch: loadUserMenus,
  } = useValidatedQuery({
    queryKey: ['user-menus-test', testUserId],
    queryFn: () => getUserMenus(testUserId),
    schema: z.array(MenuItemSchema),
    apiErrorMessage: '加载用户菜单失败',
    fallbackValue: [],
    enabled: false, // 手动触发
    staleTime: 30 * 1000,
  });

  /**
   * 搜索防抖 - 输入后 300ms 才触发实际搜索
   */
  useEffect(() => {
    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 设置新的定时器
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 300);

    // 清理函数
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchValue]);

  /**
   * 搜索过滤后的菜单列表
   * ✅ 使用防抖后的搜索值
   */
  const filteredMenus = useMemo(() => {
    if (debouncedSearchValue && menus) {
      return filterMenusByName(menus, debouncedSearchValue);
    }
    return menus || [];
  }, [debouncedSearchValue, menus]);

  /**
   * 初始化加载 - 设置默认展开的键
   */
  useEffect(() => {
    if (menus && menus.length > 0) {
      const firstLevelKeys = menus.map((item) => item.id);
      setExpandedKeys(firstLevelKeys);
    }
  }, [menus]);

  /**
   * 搜索过滤 - 自动展开搜索结果
   * ✅ 使用防抖后的搜索值
   */
  useEffect(() => {
    if (debouncedSearchValue && filteredMenus) {
      const keys = getAllParentKeys(filteredMenus);
      setExpandedKeys(keys);
      setAutoExpandParent(true);
    }
  }, [debouncedSearchValue, filteredMenus]);

  /**
   * 菜单节点选择
   */
  const handleMenuSelect = useCallback(
    (selectedKeys: React.Key[]) => {
      if (selectedKeys.length > 0 && menus) {
        const menuId = selectedKeys[0] as string;
        const menu = findMenuById(menus, menuId);
        setSelectedMenu(menu);
      }
    },
    [menus]
  );

  /**
   * 展开所有节点
   */
  const handleExpandAll = useCallback(() => {
    if (menus) {
      const allKeys = getAllParentKeys(menus);
      setExpandedKeys(allKeys);
    }
  }, [menus]);

  /**
   * 折叠所有节点
   */
  const handleCollapseAll = useCallback(() => {
    setExpandedKeys([]);
  }, []);

  /**
   * 刷新用户缓存
   */
  const executeRefreshCache = useCallback(async (userId: string) => {
    setCacheLoading(true);
    try {
      const result = await refreshUserCache(userId);
      message.success(result.message || '刷新成功');
    } catch (error: any) {
      message.error(error.message || '刷新缓存失败');
    } finally {
      setCacheLoading(false);
    }
  }, []);

  const handleRefreshCache = useCallback(
    async (userId?: string) => {
      if (!userId) {
        let inputUserId = '';
        Modal.confirm({
          title: '刷新缓存',
          content: (
            <div>
              <p>请输入要刷新缓存的用户ID：</p>
              <Input
                placeholder="用户ID"
                onChange={(e) => (inputUserId = e.target.value)}
              />
            </div>
          ),
          onOk: async () => {
            if (!inputUserId) {
              message.warning('请输入用户ID');
              return;
            }
            await executeRefreshCache(inputUserId);
          },
        });
        return;
      }
      await executeRefreshCache(userId);
    },
    [executeRefreshCache]
  );

  /**
   * 清空所有缓存
   */
  const handleClearAllCache = useCallback(() => {
    Modal.confirm({
      title: '清空所有缓存',
      content:
        '确定要清空所有用户的权限缓存吗？这将影响系统性能，建议在非高峰期操作。',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setCacheLoading(true);
        try {
          const result = await clearAllCache();
          message.success(
            `${result.message}，已清理 ${result.clearedCount} 条缓存`
          );
        } catch (error: any) {
          message.error(error.message || '清空缓存失败');
        } finally {
          setCacheLoading(false);
        }
      },
    });
  }, []);

  /**
   * 预热缓存
   */
  const handleWarmupCache = useCallback(async () => {
    Modal.confirm({
      title: '预热缓存',
      content:
        '为活跃用户预加载权限数据，提升系统响应速度。默认预热最近100个活跃用户。',
      okText: '开始预热',
      cancelText: '取消',
      onOk: async () => {
        setCacheLoading(true);
        try {
          const result = await warmupCache(100);
          message.success(
            `${result.message}，已预热 ${result.warmedUpCount} 个用户`
          );
        } catch (error: any) {
          message.error(error.message || '预热缓存失败');
        } finally {
          setCacheLoading(false);
        }
      },
    });
  }, []);

  /**
   * 导出缓存数据
   */
  const handleExportCache = useCallback(async () => {
    setCacheLoading(true);
    try {
      const data = await exportCacheData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `menu-cache-${dayjs().format('YYYYMMDD-HHmmss')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error: any) {
      message.error(error.message || '导出失败');
    } finally {
      setCacheLoading(false);
    }
  }, []);

  /**
   * 测试用户菜单访问
   */
  const handleTestUserAccess = useCallback(() => {
    setTestModalVisible(true);
    setTestUserId('');
  }, []);

  const handleLoadUserMenus = useCallback(async () => {
    if (!testUserId) {
      message.warning('请输入用户ID');
      return;
    }

    setTestLoading(true);
    try {
      await loadUserMenus();
      message.success('加载成功');
    } catch (error: any) {
      message.error(error.message || '加载失败');
    } finally {
      setTestLoading(false);
    }
  }, [testUserId, loadUserMenus]);

  /**
   * 展开/折叠处理
   */
  const handleExpand = useCallback((keys: React.Key[]) => {
    setExpandedKeys(keys as string[]);
    setAutoExpandParent(false);
  }, []);

  /**
   * 重新加载菜单 - 已由 useValidatedQuery 提供 loadMenus (refetch)
   */

  /**
   * 打开缓存统计弹窗
   * ✅ 懒加载：只在打开弹窗时加载缓存统计数据
   */
  const handleOpenStatsModal = useCallback(() => {
    setStatsModalVisible(true);
    loadCacheStats();
  }, [loadCacheStats]);

  /**
   * 计算统计数据
   */
  const totalMenuCount = useMemo(() => countMenus(menus || []), [menus]);
  const menusWithPermission = useMemo(
    () =>
      (menus || []).filter(
        (m) => m.permission || m.children?.some((c: MenuItem) => c.permission)
      ).length,
    [menus]
  );

  return {
    // 菜单数据
    menus: menus || [],
    filteredMenus,
    loading,
    selectedMenu,
    expandedKeys,
    searchValue,
    autoExpandParent,
    // 缓存数据
    cacheStats: cacheStats || null,
    cacheLoading,
    statsModalVisible,
    // 测试数据
    testModalVisible,
    testUserId,
    testUserMenus: testUserMenus || [],
    testLoading: testLoading || testUserMenusLoading,
    // 统计数据
    totalMenuCount,
    menusWithPermission,
    // 操作方法
    setSearchValue,
    setStatsModalVisible,
    handleOpenStatsModal, // ✅ 新增：打开统计弹窗并加载数据
    setTestModalVisible,
    setTestUserId,
    loadMenus,
    handleMenuSelect,
    handleExpandAll,
    handleCollapseAll,
    handleRefreshCache,
    handleClearAllCache,
    handleWarmupCache,
    handleExportCache,
    handleTestUserAccess,
    handleLoadUserMenus,
    handleExpand,
  };
};
