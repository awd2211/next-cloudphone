import React from 'react';
import { Card, Space, Button } from 'antd';
import { DashboardOutlined, LineChartOutlined, ReloadOutlined } from '@ant-design/icons';
import { PROMETHEUS_CONFIG } from '@/config/prometheus';

export const QuickAccessCard: React.FC = () => {
  const handleOpenGrafana = () => {
    window.open(PROMETHEUS_CONFIG.grafanaUrl, '_blank');
  };

  const handleOpenPrometheus = () => {
    window.open(PROMETHEUS_CONFIG.prometheusUrl, '_blank');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Card title="快速访问">
      <Space size="large" wrap>
        <Button type="primary" icon={<DashboardOutlined />} onClick={handleOpenGrafana}>
          打开 Grafana
        </Button>
        <Button icon={<LineChartOutlined />} onClick={handleOpenPrometheus}>
          打开 Prometheus
        </Button>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
          刷新页面
        </Button>
      </Space>
    </Card>
  );
};
