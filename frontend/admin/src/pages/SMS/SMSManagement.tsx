import { useState, useEffect, useCallback } from 'react';
import { Card, Tabs, Space, Tag, Tooltip, message } from 'antd';
import {
  PhoneOutlined,
  CloudServerOutlined,
  BarChartOutlined,
  DashboardOutlined,
  ReloadOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import NumberPoolTab from './components/NumberPoolTab';
import ProviderMonitorTab from './components/ProviderMonitorTab';
import StatisticsTab from './components/StatisticsTab';
import RealtimeMonitorTab from './components/RealtimeMonitorTab';
import FiveSimAdvancedTab from './components/FiveSimAdvancedTab';
import SmsActivateAdvancedTab from './components/SmsActivateAdvancedTab';

/**
 * SMS 管理主页面 - 综合管理平台
 *
 * 功能模块：
 * 1. 号码池管理 - 虚拟号码的查看、分配、取消等
 * 2. 平台监控 - SMS平台健康状态、性能对比
 * 3. 统计分析 - 历史数据统计、趋势分析
 * 4. 实时监控 - 当前活跃状态、最近活动
 *
 * 优化功能：
 * - ErrorBoundary 错误边界保护
 * - 快捷键支持 (Ctrl+R 刷新)
 * - 页面标题和快捷提示
 */
const SMSManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('numbers');
  const [refreshKey, setRefreshKey] = useState(0);

  // Tab 名称映射
  const tabNameMap: Record<string, string> = {
    numbers: '号码池',
    providers: '平台监控',
    statistics: '统计分析',
    realtime: '实时监控',
    fivesim: '5sim高级功能',
    smsactivate: 'SMS-Activate高级功能',
  };

  // 刷新当前 Tab
  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    message.info(`正在刷新${tabNameMap[activeTab]}...`);
  }, [activeTab]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+R 或 Cmd+R 刷新当前 Tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh]);

  const tabItems = [
    {
      key: 'numbers',
      label: (
        <span>
          <PhoneOutlined />
          号码池管理
        </span>
      ),
      children: <NumberPoolTab key={`numbers-${refreshKey}`} />,
    },
    {
      key: 'providers',
      label: (
        <span>
          <CloudServerOutlined />
          平台监控
        </span>
      ),
      children: <ProviderMonitorTab key={`providers-${refreshKey}`} />,
    },
    {
      key: 'statistics',
      label: (
        <span>
          <BarChartOutlined />
          统计分析
        </span>
      ),
      children: <StatisticsTab key={`statistics-${refreshKey}`} />,
    },
    {
      key: 'realtime',
      label: (
        <span>
          <DashboardOutlined />
          实时监控
        </span>
      ),
      children: <RealtimeMonitorTab key={`realtime-${refreshKey}`} />,
    },
    {
      key: 'fivesim',
      label: (
        <span>
          <ApiOutlined />
          5sim高级功能
        </span>
      ),
      children: <FiveSimAdvancedTab key={`fivesim-${refreshKey}`} />,
    },
    {
      key: 'smsactivate',
      label: (
        <span>
          <ApiOutlined />
          SMS-Activate
        </span>
      ),
      children: <SmsActivateAdvancedTab key={`smsactivate-${refreshKey}`} />,
    },
  ];

  return (
    <ErrorBoundary boundaryName="SMSManagement">
      <div style={{ padding: '24px' }}>
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <PhoneOutlined style={{ marginRight: 8 }} />
                SMS 验证码服务管理
              </span>
              <Space>
                <Tooltip title="快捷键: Ctrl+R 刷新当前页面">
                  <Tag
                    color="blue"
                    style={{ cursor: 'pointer' }}
                    onClick={handleRefresh}
                  >
                    <ReloadOutlined /> Ctrl+R 刷新
                  </Tag>
                </Tooltip>
              </Space>
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
    </ErrorBoundary>
  );
};

export default SMSManagement;
