import { useState, useEffect } from 'react';
import { Row, Col, Modal, Input, message } from 'antd';
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
import dayjs from 'dayjs';
import {
  PageHeaderSection,
  MenuTreeCard,
  MenuDetailCard,
  QuickActionsCard,
  CacheManagementCard,
  UserAccessTestModal,
  CacheStatsModal,
  filterMenusByName,
  getAllParentKeys,
  findMenuById,
  countMenus,
} from '@/components/MenuPermission';

/**
 * 菜单权限管理页面
 * 用于查看和管理系统菜单结构及其权限配置
 */
const MenuPermission = () => {
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
   * 初始化加载
   */
  useEffect(() => {
    loadMenus();
    loadCacheStats();
  }, []);

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
   * 加载所有菜单
   */
  const loadMenus = async () => {
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
  };

  /**
   * 加载缓存统计
   */
  const loadCacheStats = async () => {
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
    } catch (error: any) {
      console.error('加载缓存统计失败:', error);
    }
  };


  /**
   * 菜单节点选择
   */
  const handleMenuSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const menuId = selectedKeys[0] as string;
      const menu = findMenuById(menus, menuId);
      setSelectedMenu(menu);
    }
  };


  /**
   * 展开/折叠所有节点
   */
  const handleExpandAll = () => {
    const allKeys = getAllParentKeys(menus);
    setExpandedKeys(allKeys);
  };

  const handleCollapseAll = () => {
    setExpandedKeys([]);
  };

  /**
   * 刷新用户缓存
   */
  const handleRefreshCache = async (userId?: string) => {
    if (!userId) {
      Modal.confirm({
        title: '刷新缓存',
        content: (
          <div>
            <p>请输入要刷新缓存的用户ID：</p>
            <Input placeholder="用户ID" onChange={(e) => setTestUserId(e.target.value)} />
          </div>
        ),
        onOk: async () => {
          if (!testUserId) {
            message.warning('请输入用户ID');
            return;
          }
          await executeRefreshCache(testUserId);
        },
      });
      return;
    }
    await executeRefreshCache(userId);
  };

  const executeRefreshCache = async (userId: string) => {
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
  };

  /**
   * 清空所有缓存
   */
  const handleClearAllCache = () => {
    Modal.confirm({
      title: '清空所有缓存',
      content: '确定要清空所有用户的权限缓存吗？这将影响系统性能，建议在非高峰期操作。',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setCacheLoading(true);
        try {
          const result = await clearAllCache();
          message.success(`${result.message}，已清理 ${result.clearedCount} 条缓存`);
          await loadCacheStats();
        } catch (error: any) {
          message.error(error.message || '清空缓存失败');
        } finally {
          setCacheLoading(false);
        }
      },
    });
  };

  /**
   * 预热缓存
   */
  const handleWarmupCache = async () => {
    Modal.confirm({
      title: '预热缓存',
      content: '为活跃用户预加载权限数据，提升系统响应速度。默认预热最近100个活跃用户。',
      okText: '开始预热',
      cancelText: '取消',
      onOk: async () => {
        setCacheLoading(true);
        try {
          const result = await warmupCache(100);
          message.success(`${result.message}，已预热 ${result.warmedUpCount} 个用户`);
          await loadCacheStats();
        } catch (error: any) {
          message.error(error.message || '预热缓存失败');
        } finally {
          setCacheLoading(false);
        }
      },
    });
  };

  /**
   * 导出缓存数据
   */
  const handleExportCache = async () => {
    setCacheLoading(true);
    try {
      const data = await exportCacheData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
  };

  /**
   * 测试用户菜单访问
   */
  const handleTestUserAccess = () => {
    setTestModalVisible(true);
    setTestUserId('');
    setTestUserMenus([]);
  };

  const handleLoadUserMenus = async () => {
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
  };


  const totalMenuCount = countMenus(menus);
  const menusWithPermission = menus.filter(
    (m) => m.permission || m.children?.some((c) => c.permission)
  ).length;

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题和说明 */}
      <PageHeaderSection
        totalMenuCount={totalMenuCount}
        menusWithPermission={menusWithPermission}
        cacheStats={cacheStats}
      />

      {/* 主内容区 */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        {/* 左侧：菜单树 */}
        <Col span={15}>
          <MenuTreeCard
            filteredMenus={filteredMenus}
            loading={loading}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
            onRefresh={loadMenus}
            onExpand={(keys) => {
              setExpandedKeys(keys);
              setAutoExpandParent(false);
            }}
            onSelect={handleMenuSelect}
          />
        </Col>

        {/* 右侧：详情面板 */}
        <Col span={9}>
          <div style={{ marginBottom: 16 }}>
            <MenuDetailCard selectedMenu={selectedMenu} />
          </div>

          {/* 快捷操作 */}
          <QuickActionsCard
            onTestUserAccess={handleTestUserAccess}
            onViewStats={() => setStatsModalVisible(true)}
          />
        </Col>
      </Row>

      {/* 缓存管理 */}
      <div style={{ marginTop: 16 }}>
        <CacheManagementCard
          cacheStats={cacheStats}
          cacheLoading={cacheLoading}
          onRefreshCache={() => handleRefreshCache()}
          onClearAllCache={handleClearAllCache}
          onWarmupCache={handleWarmupCache}
          onExportCache={handleExportCache}
        />
      </div>

      {/* 用户访问测试弹窗 */}
      <UserAccessTestModal
        visible={testModalVisible}
        testUserId={testUserId}
        testUserMenus={testUserMenus}
        testLoading={testLoading}
        onClose={() => setTestModalVisible(false)}
        onUserIdChange={setTestUserId}
        onLoadUserMenus={handleLoadUserMenus}
      />

      {/* 缓存统计详情弹窗 */}
      <CacheStatsModal
        visible={statsModalVisible}
        cacheStats={cacheStats}
        onClose={() => setStatsModalVisible(false)}
      />
    </div>
  );
};

export default MenuPermission;
