import { useState } from 'react';
import { Card, Tabs } from 'antd';
import {
  PhoneOutlined,
  CloudServerOutlined,
  BarChartOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import NumberPoolTab from './components/NumberPoolTab';
import ProviderMonitorTab from './components/ProviderMonitorTab';
import StatisticsTab from './components/StatisticsTab';
import RealtimeMonitorTab from './components/RealtimeMonitorTab';

/**
 * SMS 管理主页面 - 综合管理平台
 *
 * 功能模块：
 * 1. 号码池管理 - 虚拟号码的查看、分配、取消等
 * 2. 平台监控 - SMS平台健康状态、性能对比
 * 3. 统计分析 - 历史数据统计、趋势分析
 * 4. 实时监控 - 当前活跃状态、最近活动
 */
const SMSManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('numbers');

  const tabItems = [
    {
      key: 'numbers',
      label: (
        <span>
          <PhoneOutlined />
          号码池管理
        </span>
      ),
      children: <NumberPoolTab />,
    },
    {
      key: 'providers',
      label: (
        <span>
          <CloudServerOutlined />
          平台监控
        </span>
      ),
      children: <ProviderMonitorTab />,
    },
    {
      key: 'statistics',
      label: (
        <span>
          <BarChartOutlined />
          统计分析
        </span>
      ),
      children: <StatisticsTab />,
    },
    {
      key: 'realtime',
      label: (
        <span>
          <DashboardOutlined />
          实时监控
        </span>
      ),
      children: <RealtimeMonitorTab />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <div>
            <PhoneOutlined style={{ marginRight: 8 }} />
            SMS 验证码服务管理
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

export default SMSManagement;
