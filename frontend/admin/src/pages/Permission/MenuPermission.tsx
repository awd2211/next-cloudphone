import { Row, Col } from 'antd';
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

/**
 * 菜单权限管理页面
 * 用于查看和管理系统菜单结构及其权限配置
 */
const MenuPermission = () => {
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
    handleOpenStatsModal, // ✅ 新增：打开统计弹窗并懒加载数据
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
