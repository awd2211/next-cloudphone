import { useState, useEffect, useCallback } from 'react';
import { Card, Tabs, message } from 'antd';
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

// 错误边界和加载状态
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';

// React Query 相关
import { queryClient } from '@/lib/react-query';
import { proxyKeys } from '@/hooks/queries/useProxy';

/**
 * 代理IP管理主页面 - 综合管理平台
 *
 * 功能模块：
 * 1. 代理池管理 - 代理IP的查看、分配、释放、测试等
 * 2. 供应商监控 - 代理供应商健康状态、性能排名
 * 3. 成本监控 - 成本统计、趋势分析、优化建议
 * 4. 使用报告 - 使用统计、审计日志、设备组管理
 *
 * 优化：
 * - ErrorBoundary - 错误边界保护
 * - 快捷键支持 - Ctrl+R 刷新
 * - 页面标题优化
 */
const ProxyManagementContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pool');

  // 刷新所有代理相关数据
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: proxyKeys.all });
    message.info('正在刷新代理数据...');
  }, []);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+R 刷新列表
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh]);

  // 设置页面标题
  useEffect(() => {
    const originalTitle = document.title;
    document.title = '代理IP服务管理 - 云手机管理后台';
    return () => {
      document.title = originalTitle;
    };
  }, []);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GlobalOutlined style={{ marginRight: 8 }} />
            <span>代理IP服务管理</span>
            <span style={{ fontSize: 12, color: '#999', marginLeft: 16 }}>
              快捷键：Ctrl+R 刷新
            </span>
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

/**
 * 代理IP管理主页面（带 ErrorBoundary 保护）
 */
const ProxyManagement: React.FC = () => {
  return (
    <ErrorBoundary>
      <ProxyManagementContent />
    </ErrorBoundary>
  );
};

export default ProxyManagement;
