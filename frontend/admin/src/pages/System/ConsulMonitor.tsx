import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Button, Alert, Tag, message, Space } from 'antd';
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
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

/**
 * Consul 服务监控页面内容组件
 *
 * 优化点：
 * 1. ErrorBoundary - 包裹整个页面
 * 2. LoadingState - 统一加载状态
 * 3. 快捷键支持 - Ctrl+R 刷新
 * 4. 页面标题优化 - 添加刷新标签
 * 5. 组件拆分 - 提取 ServiceStatsCards, ServiceDetailModal, ServiceTable
 * 6. 常量提取 - constants.ts
 * 7. 类型提取 - types.ts
 * 8. 工具函数提取 - utils.tsx
 * 9. 使用 useCallback 优化事件处理
 * 10. 使用 useMemo 优化统计计算
 */
const ConsulMonitorContent: React.FC = () => {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceHealth | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 模拟数据 - 实际应该调用 Consul API
      setServices(MOCK_SERVICES);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载服务信息失败'));
      message.error('加载服务信息失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载和自动刷新
  useEffect(() => {
    loadServices();

    if (autoRefresh) {
      const interval = setInterval(loadServices, AUTO_REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh, loadServices]);

  // 快捷键支持: Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        loadServices();
        message.info('正在刷新...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadServices]);

  // 使用 useMemo 优化统计计算
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

  // 使用 useCallback 优化事件处理
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

  const handleRefresh = useCallback(() => {
    loadServices();
    message.info('正在刷新...');
  }, [loadServices]);

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ marginBottom: 0 }}>
          <ClusterOutlined style={{ marginRight: 8 }} />
          Consul 服务监控
          <Tag
            icon={<ReloadOutlined spin={loading} />}
            color="processing"
            style={{ marginLeft: 12, cursor: 'pointer' }}
            onClick={handleRefresh}
          >
            Ctrl+R 刷新
          </Tag>
        </h2>
      </div>

      <LoadingState
        loading={loading && services.length === 0}
        error={error}
        onRetry={loadServices}
        errorDescription="加载 Consul 服务信息失败"
        loadingType="skeleton"
        skeletonRows={4}
      >
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

        {/* 使用说明 */}
        <Card title="监控说明" style={{ marginTop: 24 }} bordered={false}>
          <ul>
            <li>本页面显示所有在Consul注册的微服务状态</li>
            <li>健康检查每10秒自动刷新（可手动关闭）</li>
            <li>绿色表示服务健康，黄色表示部分实例异常，红色表示服务不可用</li>
            <li>点击"查看详情"可以看到每个服务实例的详细信息</li>
            <li>快捷键: Ctrl+R 手动刷新</li>
            <li>Consul地址: {CONSUL_URL}</li>
          </ul>
        </Card>
      </LoadingState>

      {/* 服务详情模态框 */}
      <ServiceDetailModal
        visible={detailModalVisible}
        service={selectedService}
        onClose={handleCloseDetail}
      />
    </div>
  );
};

/**
 * Consul 服务监控页面（带 ErrorBoundary）
 */
const ConsulMonitor: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="ConsulMonitor">
      <ConsulMonitorContent />
    </ErrorBoundary>
  );
};

export default ConsulMonitor;
