import { useState, useCallback } from 'react';
import { Row, Col, Card, Empty, Form, Pagination, Spin } from 'antd';
import { AppSearchBar, AppCard, InstallAppModal } from '@/components/App';
import { useApps, useInstallApp, useMyDevices } from '@/hooks/queries';
import type { Application, Device } from '@/types';
import { getListData } from '@/types';

const AppMarket = () => {
  // Form 实例
  const [form] = Form.useForm();

  // 本地状态
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [installModalVisible, setInstallModalVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // React Query hooks
  const { data: appsData, isLoading: loading } = useApps({
    page,
    pageSize,
    search,
    category
  });
  const { data: devicesData } = useMyDevices({ page: 1, pageSize: 100 });
  const installApp = useInstallApp();

  // useApps 返回 PaginatedResponse<Application> = { items/data: Application[], total, page, pageSize }
  const apps: Application[] = getListData(appsData);
  const total = appsData?.total ?? 0;
  const devices: Device[] = getListData(devicesData);

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
  const handleView = useCallback((app: Application) => {
    // 跳转到应用详情页或打开详情弹窗
    console.log('View app:', app);
  }, []);

  // 打开安装弹窗
  const handleInstall = useCallback((app: Application) => {
    setSelectedApp(app);
    setInstallModalVisible(true);
  }, []);

  // 确认安装（每个设备单独安装）
  const handleInstallConfirm = useCallback(async () => {
    if (!selectedApp) return;

    const values = await form.validateFields();
    // useInstallApp 接受单个 deviceId，需要遍历安装
    const deviceIds = values.deviceIds as string[];
    for (const deviceId of deviceIds) {
      await installApp.mutateAsync({
        appId: selectedApp.id,
        deviceId,
      });
    }

    setInstallModalVisible(false);
    form.resetFields();
  }, [selectedApp, form, installApp]);

  // 取消安装
  const handleInstallCancel = useCallback(() => {
    setInstallModalVisible(false);
    setSelectedApp(null);
    form.resetFields();
  }, [form]);

  // 分页变化
  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
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

      <Spin spinning={loading}>
        {apps.length === 0 && !loading ? (
          <Card>
            <Empty description="暂无应用" />
          </Card>
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {apps.map((app: Application) => (
                <Col key={app.id} xs={24} sm={12} md={8} lg={6}>
                  <AppCard
                    app={app}
                    loading={false}
                    onView={handleView}
                    onInstall={handleInstall}
                  />
                </Col>
              ))}
            </Row>

            {/* 分页 */}
            {total > 0 && (
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={total}
                  showSizeChanger
                  showQuickJumper
                  pageSizeOptions={['12', '24', '36', '48']}
                  showTotal={(total) => `共 ${total} 个应用`}
                  onChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </Spin>

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
