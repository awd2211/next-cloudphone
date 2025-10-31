import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Input, Select, Button, message, Modal, Form, Empty, Tag } from 'antd';
import { SearchOutlined, DownloadOutlined, AppstoreOutlined, EyeOutlined } from '@ant-design/icons';
import { getApps, installAppToDevice } from '@/services/app';
import { getMyDevices } from '@/services/device';
import type { Application, Device } from '@/types';

const AppMarket = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState<Application[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [installModalVisible, setInstallModalVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [form] = Form.useForm();

  const categories = [
    { label: '全部', value: '' },
    { label: '社交', value: 'social' },
    { label: '娱乐', value: 'entertainment' },
    { label: '工具', value: 'tools' },
    { label: '游戏', value: 'games' },
    { label: '办公', value: 'productivity' },
    { label: '其他', value: 'others' },
  ];

  const loadApps = async () => {
    setLoading(true);
    try {
      const res = await getApps({ page, pageSize, category, search });
      setApps(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载应用列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const res = await getMyDevices({ page: 1, pageSize: 100 });
      setDevices(res.data.filter((d) => d.status === 'running'));
    } catch (error) {
      console.error('加载设备列表失败', error);
    }
  };

  useEffect(() => {
    loadApps();
  }, [page, pageSize, category]);

  useEffect(() => {
    loadDevices();
  }, []);

  const handleSearch = () => {
    setPage(1);
    loadApps();
  };

  const handleInstall = (app: Application) => {
    if (devices.length === 0) {
      message.warning('没有运行中的设备，请先启动设备');
      return;
    }
    setSelectedApp(app);
    setInstallModalVisible(true);
  };

  const handleInstallConfirm = async (values: { deviceId: string }) => {
    if (!selectedApp) return;
    try {
      await installAppToDevice(values.deviceId, selectedApp.id);
      message.success('应用安装成功');
      setInstallModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('应用安装失败');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    }
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <div>
      <h2>应用市场</h2>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col flex="auto">
            <Input.Search
              size="large"
              placeholder="搜索应用名称或包名"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSearch={handleSearch}
              prefix={<SearchOutlined />}
              enterButton="搜索"
            />
          </Col>
          <Col>
            <Select
              size="large"
              value={category}
              onChange={setCategory}
              style={{ width: 150 }}
              options={categories}
            />
          </Col>
        </Row>
      </Card>

      {apps.length === 0 && !loading ? (
        <Card>
          <Empty description="暂无应用" />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {apps.map((app) => (
              <Col key={app.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  loading={loading}
                  cover={
                    app.icon ? (
                      <img
                        alt={app.name}
                        src={app.icon}
                        style={{
                          width: '100%',
                          height: 150,
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: 150,
                          background: '#f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <AppstoreOutlined style={{ fontSize: 48, color: '#999' }} />
                      </div>
                    )
                  }
                  actions={[
                    <Button
                      key="view"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/apps/${app.id}`);
                      }}
                    >
                      详情
                    </Button>,
                    <Button
                      key="install"
                      type="primary"
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInstall(app);
                      }}
                    >
                      安装
                    </Button>,
                  ]}
                >
                  <Card.Meta
                    title={app.name}
                    description={
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <Tag color="blue">{app.category}</Tag>
                          <Tag>{formatSize(app.size)}</Tag>
                        </div>
                        <div
                          style={{
                            color: '#666',
                            fontSize: 12,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {app.description || '暂无描述'}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                          版本: {app.version}
                        </div>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {total > pageSize && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Button
                size="large"
                onClick={() => setPage(page + 1)}
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

      {/* 安装应用对话框 */}
      <Modal
        title="安装应用"
        open={installModalVisible}
        onCancel={() => {
          setInstallModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleInstallConfirm} layout="vertical">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>应用信息：</div>
            <div>名称: {selectedApp?.name}</div>
            <div>版本: {selectedApp?.version}</div>
            <div>大小: {selectedApp && formatSize(selectedApp.size)}</div>
          </div>

          <Form.Item
            label="选择设备"
            name="deviceId"
            rules={[{ required: true, message: '请选择要安装的设备' }]}
          >
            <Select
              placeholder="请选择设备"
              options={devices.map((d) => ({
                label: `${d.name} (${d.status === 'running' ? '运行中' : '已停止'})`,
                value: d.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AppMarket;
