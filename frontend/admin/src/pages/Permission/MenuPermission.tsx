import { useEffect } from 'react';
import { Row, Col, message, Tag } from 'antd';
import { MenuOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  PageHeaderSection,
  MenuTreeCard,
  MenuDetailCard,
  QuickActionsCard,
  CacheManagementCard,
  UserAccessTestModal,
  CacheStatsModal,
} from '@/components/MenuPermission';
import { useMenuPermission } from '@/hooks/useMenuPermission';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

/**
 * 菜单权限管理页面内容组件
 * 用于查看和管理系统菜单结构及其权限配置
 */
const MenuPermissionContent = () => {
  const {
    filteredMenus,
    loading,
    selectedMenu,
    expandedKeys,
    autoExpandParent,
    searchValue,
    cacheStats,
    cacheLoading,
    statsModalVisible,
    testModalVisible,
    testUserId,
    testUserMenus,
    testLoading,
    totalMenuCount,
    menusWithPermission,
    setSearchValue,
    setStatsModalVisible,
    handleOpenStatsModal,
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
  } = useMenuPermission();

  // 快捷键支持: Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        loadMenus();
        message.info('正在刷新菜单数据...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadMenus]);

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ marginBottom: 0 }}>
          <MenuOutlined style={{ marginRight: 8 }} />
          菜单权限管理
          <Tag
            icon={<ReloadOutlined spin={loading} />}
            color="processing"
            style={{ marginLeft: 12, cursor: 'pointer' }}
            onClick={() => {
              loadMenus();
              message.info('正在刷新菜单数据...');
            }}
          >
            Ctrl+R 刷新
          </Tag>
        </h2>
      </div>

      <LoadingState
        loading={loading && filteredMenus.length === 0}
        onRetry={loadMenus}
        errorDescription="加载菜单数据失败"
        loadingType="skeleton"
        skeletonRows={6}
      >
        {/* 页面统计和说明 */}
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
              onExpand={handleExpand}
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
              onViewStats={handleOpenStatsModal}
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
      </LoadingState>

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

/**
 * 菜单权限管理页面
 * 包含 ErrorBoundary 错误边界保护
 */
const MenuPermission = () => {
  return (
    <ErrorBoundary boundaryName="MenuPermission">
      <MenuPermissionContent />
    </ErrorBoundary>
  );
};

export default MenuPermission;
