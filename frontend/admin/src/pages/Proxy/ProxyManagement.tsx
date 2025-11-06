import { useState } from 'react';
import { Card, Tabs } from 'antd';
import {
  GlobalOutlined,
  CloudServerOutlined,
  DollarOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import ProxyPoolTab from './components/ProxyPoolTab';
import ProviderMonitorTab from './components/ProviderMonitorTab';
import CostMonitorTab from './components/CostMonitorTab';
import UsageReportTab from './components/UsageReportTab';

/**
 * 代理IP管理主页面 - 综合管理平台
 *
 * 功能模块：
 * 1. 代理池管理 - 代理IP的查看、分配、释放、测试等
 * 2. 供应商监控 - 代理供应商健康状态、性能排名
 * 3. 成本监控 - 成本统计、趋势分析、优化建议
 * 4. 使用报告 - 使用统计、审计日志、设备组管理
 */
const ProxyManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pool');

  const tabItems = [
    {
      key: 'pool',
      label: (
        <span>
          <GlobalOutlined />
          代理池管理
        </span>
      ),
      children: <ProxyPoolTab />,
    },
    {
      key: 'providers',
      label: (
        <span>
          <CloudServerOutlined />
          供应商监控
        </span>
      ),
      children: <ProviderMonitorTab />,
    },
    {
      key: 'cost',
      label: (
        <span>
          <DollarOutlined />
          成本监控
        </span>
      ),
      children: <CostMonitorTab />,
    },
    {
      key: 'usage',
      label: (
        <span>
          <BarChartOutlined />
          使用报告
        </span>
      ),
      children: <UsageReportTab />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <div>
            <GlobalOutlined style={{ marginRight: 8 }} />
            代理IP服务管理
          </div>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>
    </div>
  );
};

export default ProxyManagement;
