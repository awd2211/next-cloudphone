import { useState, useCallback } from 'react';
import { Row, Col, Card, Empty, Button, Form } from 'antd';
import { AppSearchBar, AppCard, InstallAppModal } from '@/components/App';
import { useApps, useInstallApp, useMyDevices } from '@/hooks/queries';
import type { App } from '@/types';

const AppMarket = () => {
  // Form 实例
  const [form] = Form.useForm();

  // 本地状态
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [installModalVisible, setInstallModalVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);

  // React Query hooks
  const { data: appsData, isLoading: loading } = useApps({
    page,
    pageSize,
    search,
    category
  });
  const { data: devicesData } = useMyDevices({ page: 1, pageSize: 100 });
  const installApp = useInstallApp();

  const apps = appsData?.items || [];
  const total = appsData?.total || 0;
  const devices = devicesData?.data || [];

  // 应用分类（可以从API获取或配置）
  const categories = [
    { label: '全部', value: '' },
    { label: '工具', value: 'tools' },
    { label: '社交', value: 'social' },
    { label: '娱乐', value: 'entertainment' },
    { label: '办公', value: 'office' },
  ];

  // 搜索处理
  const handleSearch = useCallback(() => {
    setPage(1); // 重置页码
  }, []);

  // 查看应用详情
  const handleView = useCallback((app: App) => {
    // 跳转到应用详情页或打开详情弹窗
    console.log('View app:', app);
  }, []);

  // 打开安装弹窗
  const handleInstall = useCallback((app: App) => {
    setSelectedApp(app);
    setInstallModalVisible(true);
  }, []);

  // 确认安装
  const handleInstallConfirm = useCallback(async () => {
    if (!selectedApp) return;

    const values = await form.validateFields();
    await installApp.mutateAsync({
      appId: selectedApp.id,
      deviceIds: values.deviceIds,
    });

    setInstallModalVisible(false);
    form.resetFields();
  }, [selectedApp, form, installApp]);

  // 取消安装
  const handleInstallCancel = useCallback(() => {
    setInstallModalVisible(false);
    setSelectedApp(null);
    form.resetFields();
  }, [form]);

  // 加载更多
  const handleLoadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

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
