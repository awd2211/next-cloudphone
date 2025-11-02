import React, { useState } from 'react';
import { Typography } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import {
  InfoAlert,
  QuickAccessCard,
  DashboardTabs,
  MetricsCards,
  UsageGuide,
} from '@/components/PrometheusMonitor';

const { Title } = Typography;

const PrometheusMonitor: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <BarChartOutlined /> Prometheus & Grafana 监控
      </Title>

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
  );
};

export default PrometheusMonitor;
