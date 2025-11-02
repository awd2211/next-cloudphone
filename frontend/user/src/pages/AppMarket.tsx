import { Row, Col, Card, Empty, Button } from 'antd';
import { AppSearchBar, AppCard, InstallAppModal } from '@/components/App';
import { useAppMarket } from '@/hooks/useAppMarket';

const AppMarket = () => {
  const {
    apps,
    devices,
    loading,
    total,
    page,
    pageSize,
    search,
    category,
    categories,
    installModalVisible,
    selectedApp,
    form,
    setSearch,
    setCategory,
    handleSearch,
    handleView,
    handleInstall,
    handleInstallConfirm,
    handleInstallCancel,
    handleLoadMore,
  } = useAppMarket();

  return (
    <div>
      <h2>应用市场</h2>

      <AppSearchBar
        search={search}
        category={category}
        categories={categories}
        onSearchChange={setSearch}
        onSearch={handleSearch}
        onCategoryChange={setCategory}
      />

      {apps.length === 0 && !loading ? (
        <Card>
          <Empty description="暂无应用" />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {apps.map((app) => (
              <Col key={app.id} xs={24} sm={12} md={8} lg={6}>
                <AppCard
                  app={app}
                  loading={loading}
                  onView={handleView}
                  onInstall={handleInstall}
                />
              </Col>
            ))}
          </Row>

          {total > pageSize && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Button
                size="large"
                onClick={handleLoadMore}
                disabled={page * pageSize >= total}
              >
                加载更多
              </Button>
              <div style={{ marginTop: 8, color: '#999' }}>
                已加载 {apps.length} / {total} 个应用
              </div>
            </div>
          )}
        </>
      )}

      <InstallAppModal
        visible={installModalVisible}
        app={selectedApp}
        devices={devices}
        form={form}
        onConfirm={handleInstallConfirm}
        onCancel={handleInstallCancel}
      />
    </div>
  );
};

export default AppMarket;
