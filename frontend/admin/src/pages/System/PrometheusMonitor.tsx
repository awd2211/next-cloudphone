import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Tag, message } from 'antd';
import { BarChartOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  InfoAlert,
  QuickAccessCard,
  DashboardTabs,
  MetricsCards,
  UsageGuide,
} from '@/components/PrometheusMonitor';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

const { Title } = Typography;

const PrometheusMonitorContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // 刷新页面内容
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setRefreshKey((prev) => prev + 1);
    message.info('正在刷新...');
    // 模拟加载延迟
    setTimeout(() => {
      setLoading(false);
      message.success('刷新完成');
    }, 500);
  }, []);

  // 初始加载
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // 快捷键支持: Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh]);

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ marginBottom: 0 }}>
          <BarChartOutlined style={{ marginRight: 8 }} />
          Prometheus & Grafana 监控
          <Tag
            icon={<ReloadOutlined spin={loading} />}
            color="processing"
            style={{ marginLeft: 12, cursor: 'pointer', verticalAlign: 'middle' }}
            onClick={handleRefresh}
          >
            Ctrl+R 刷新
          </Tag>
        </Title>
      </div>

      <LoadingState
        loading={loading}
        loadingType="skeleton"
        skeletonRows={10}
      >
        <div key={refreshKey}>
          <div style={{ marginBottom: 24 }}>
            <InfoAlert />
          </div>

          <div style={{ marginBottom: 24 }}>
            <QuickAccessCard />
          </div>

          <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <MetricsCards />

          <div style={{ marginTop: 24 }}>
            <UsageGuide />
          </div>
        </div>
      </LoadingState>
    </div>
  );
};

const PrometheusMonitor: React.FC = () => {
  return (
    <ErrorBoundary>
      <PrometheusMonitorContent />
    </ErrorBoundary>
  );
};

export default PrometheusMonitor;
