import React from 'react';
import { Card, Tabs, Typography, Button } from 'antd';
import { GRAFANA_DASHBOARDS } from '@/config/prometheus';

const { TabPane } = Tabs;
const { Paragraph, Text } = Typography;

interface DashboardTabsProps {
  activeTab: string;
  onTabChange: (key: string) => void;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({ activeTab, onTabChange }) => {
  const handleOpenDashboard = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <Card title="预置仪表板">
      <Tabs activeKey={activeTab} onChange={onTabChange}>
        {GRAFANA_DASHBOARDS.map((dashboard) => (
          <TabPane tab={dashboard.title} key={dashboard.id}>
            <div>
              <Paragraph type="secondary">{dashboard.description}</Paragraph>
              <Button
                type="link"
                onClick={() => handleOpenDashboard(dashboard.url)}
                style={{ marginBottom: 16 }}
              >
                在新窗口中打开完整仪表板 →
              </Button>

              <div
                style={{
                  background: '#f5f5f5',
                  padding: 16,
                  borderRadius: 4,
                  textAlign: 'center',
                }}
              >
                <iframe
                  src={dashboard.iframeSrc}
                  width="100%"
                  height="400"
                  frameBorder="0"
                  title={dashboard.title}
                  style={{ border: 'none' }}
                  onError={() => console.error('Grafana加载失败')}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  提示: 如果仪表板未显示，请确保Grafana服务正在运行
                </Text>
              </div>
            </div>
          </TabPane>
        ))}
      </Tabs>
    </Card>
  );
};
