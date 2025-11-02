import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Input, message } from 'antd';
import type { MenuItem, MenuCacheStats } from '@/types';
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

export const useMenuPermission = () => {
  // 菜单相关
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [filteredMenus, setFilteredMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  // 缓存管理相关
  const [cacheStats, setCacheStats] = useState<MenuCacheStats | null>(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);

  // 用户访问测试
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testUserId, setTestUserId] = useState('');
  const [testUserMenus, setTestUserMenus] = useState<MenuItem[]>([]);
  const [testLoading, setTestLoading] = useState(false);

  /**
   * 加载所有菜单
   */
  const loadMenus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllMenus();
      setMenus(data);
      setFilteredMenus(data);

      // 默认展开第一层
      const firstLevelKeys = data.map((item) => item.id);
      setExpandedKeys(firstLevelKeys);
    } catch (error: any) {
      message.error(error.message || '加载菜单失败');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 加载缓存统计
   */
  const loadCacheStats = useCallback(async () => {
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
    } catch (error: any) {
      console.error('加载缓存统计失败:', error);
    }
  }, []);

  /**
   * 初始化加载
   */
  useEffect(() => {
    loadMenus();
    loadCacheStats();
  }, [loadMenus, loadCacheStats]);

  /**
   * 搜索过滤
   */
  useEffect(() => {
    if (searchValue) {
      const filtered = filterMenusByName(menus, searchValue);
      setFilteredMenus(filtered);

      // 自动展开包含搜索结果的节点
      const keys = getAllParentKeys(filtered);
      setExpandedKeys(keys);
      setAutoExpandParent(true);
    } else {
      setFilteredMenus(menus);
    }
  }, [searchValue, menus]);

  /**
   * 菜单节点选择
   */
  const handleMenuSelect = useCallback(
    (selectedKeys: React.Key[]) => {
      if (selectedKeys.length > 0) {
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
    const allKeys = getAllParentKeys(menus);
    setExpandedKeys(allKeys);
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
  const executeRefreshCache = useCallback(
    async (userId: string) => {
      setCacheLoading(true);
      try {
        const result = await refreshUserCache(userId);
        message.success(result.message || '刷新成功');
        await loadCacheStats();
      } catch (error: any) {
        message.error(error.message || '刷新缓存失败');
      } finally {
        setCacheLoading(false);
      }
    },
    [loadCacheStats]
  );

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
          await loadCacheStats();
        } catch (error: any) {
          message.error(error.message || '清空缓存失败');
        } finally {
          setCacheLoading(false);
        }
      },
    });
  }, [loadCacheStats]);

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
          await loadCacheStats();
        } catch (error: any) {
          message.error(error.message || '预热缓存失败');
        } finally {
          setCacheLoading(false);
        }
      },
    });
  }, [loadCacheStats]);

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
    setTestUserMenus([]);
  }, []);

  const handleLoadUserMenus = useCallback(async () => {
    if (!testUserId) {
      message.warning('请输入用户ID');
      return;
    }

    setTestLoading(true);
    try {
      const data = await getUserMenus(testUserId);
      setTestUserMenus(data);
      message.success('加载成功');
    } catch (error: any) {
      message.error(error.message || '加载失败');
      setTestUserMenus([]);
    } finally {
      setTestLoading(false);
    }
  }, [testUserId]);

  /**
   * 展开/折叠处理
   */
  const handleExpand = useCallback((keys: React.Key[]) => {
    setExpandedKeys(keys as string[]);
    setAutoExpandParent(false);
  }, []);

  /**
   * 计算统计数据
   */
  const totalMenuCount = useMemo(() => countMenus(menus), [menus]);
  const menusWithPermission = useMemo(
    () =>
      menus.filter(
        (m) => m.permission || m.children?.some((c) => c.permission)
      ).length,
    [menus]
  );

  return {
    // 菜单数据
    menus,
    filteredMenus,
    loading,
    selectedMenu,
    expandedKeys,
    searchValue,
    autoExpandParent,
    // 缓存数据
    cacheStats,
    cacheLoading,
    statsModalVisible,
    // 测试数据
    testModalVisible,
    testUserId,
    testUserMenus,
    testLoading,
    // 统计数据
    totalMenuCount,
    menusWithPermission,
    // 操作方法
    setSearchValue,
    setStatsModalVisible,
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
