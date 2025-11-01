import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Button, Alert, Typography, message, Space } from 'antd';
import { ReloadOutlined, ClusterOutlined } from '@ant-design/icons';
import {
  ServiceStatsCards,
  ServiceDetailModal,
  ServiceTable,
  MOCK_SERVICES,
  AUTO_REFRESH_INTERVAL,
  CONSUL_URL,
  type ServiceHealth,
} from '@/components/ConsulMonitor';

const { Title } = Typography;

/**
 * Consul 服务监控页面（优化版）
 *
 * 优化点：
 * 1. ✅ 组件拆分 - 提取 ServiceStatsCards, ServiceDetailModal, ServiceTable
 * 2. ✅ 常量提取 - constants.ts
 * 3. ✅ 类型提取 - types.ts
 * 4. ✅ 工具函数提取 - utils.tsx
 * 5. ✅ 使用 useCallback 优化事件处理
 * 6. ✅ 使用 useMemo 优化统计计算
 */
const ConsulMonitor = () => {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceHealth | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadServices();

    if (autoRefresh) {
      const interval = setInterval(loadServices, AUTO_REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      // 模拟数据 - 实际应该调用 Consul API
      setServices(MOCK_SERVICES);
    } catch (error) {
      message.error('加载服务信息失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ 使用 useMemo 优化统计计算
  const stats = useMemo(() => {
    const totalServices = services.length;
    const healthyServices = services.filter((s) => s.unhealthyCount === 0).length;
    const unhealthyServices = services.filter((s) => s.healthyCount === 0).length;
    const warningServices = services.filter(
      (s) => s.healthyCount > 0 && s.unhealthyCount > 0,
    ).length;

    return {
      totalServices,
      healthyServices,
      unhealthyServices,
      warningServices,
    };
  }, [services]);

  // ✅ 使用 useCallback 优化事件处理
  const handleViewDetail = useCallback((service: ServiceHealth) => {
    setSelectedService(service);
    setDetailModalVisible(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailModalVisible(false);
    setSelectedService(null);
  }, []);

  const handleToggleAutoRefresh = useCallback(() => {
    setAutoRefresh((prev) => !prev);
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <ClusterOutlined /> Consul 服务监控
      </Title>

      <Alert
        message="实时监控"
        description={`服务发现与健康检查监控 - ${autoRefresh ? '自动刷新中（每10秒）' : '已暂停自动刷新'}`}
        type="info"
        showIcon
        closable
        style={{ marginBottom: 24 }}
      />

      {/* 统计卡片 */}
      <ServiceStatsCards
        totalServices={stats.totalServices}
        healthyServices={stats.healthyServices}
        warningServices={stats.warningServices}
        unhealthyServices={stats.unhealthyServices}
      />

      {/* 服务列表 */}
      <Card
        title="服务列表"
        extra={
          <Space>
            <Button type={autoRefresh ? 'primary' : 'default'} onClick={handleToggleAutoRefresh}>
              {autoRefresh ? '停止自动刷新' : '开启自动刷新'}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadServices} loading={loading}>
              刷新
            </Button>
          </Space>
        }
      >
        <ServiceTable services={services} loading={loading} onViewDetail={handleViewDetail} />
      </Card>

      {/* 服务详情模态框 */}
      <ServiceDetailModal
        visible={detailModalVisible}
        service={selectedService}
        onClose={handleCloseDetail}
      />

      {/* 使用说明 */}
      <Card title="监控说明" style={{ marginTop: 24 }} bordered={false}>
        <ul>
          <li>本页面显示所有在Consul注册的微服务状态</li>
          <li>健康检查每10秒自动刷新（可手动关闭）</li>
          <li>绿色表示服务健康，黄色表示部分实例异常，红色表示服务不可用</li>
          <li>点击"查看详情"可以看到每个服务实例的详细信息</li>
          <li>Consul地址: {CONSUL_URL}</li>
        </ul>
      </Card>
    </div>
  );
};

export default ConsulMonitor;
