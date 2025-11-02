import React from 'react';
import { Alert } from 'antd';
import { PROMETHEUS_CONFIG } from '@/config/prometheus';

export const InfoAlert: React.FC = () => {
  return (
    <Alert
      message="监控系统说明"
      description={
        <div>
          <p>本系统使用Prometheus采集指标，Grafana进行可视化展示</p>
          <ul style={{ marginBottom: 0 }}>
            <li>Prometheus: {PROMETHEUS_CONFIG.prometheusUrl}</li>
            <li>Grafana: {PROMETHEUS_CONFIG.grafanaUrl} (默认账号: admin/admin)</li>
            <li>数据自动刷新周期: {PROMETHEUS_CONFIG.defaultRefreshInterval}</li>
          </ul>
        </div>
      }
      type="info"
      showIcon
      closable
    />
  );
};
