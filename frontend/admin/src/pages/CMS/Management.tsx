/**
 * CMS 内容管理页面
 * 管理官网的所有可编辑内容
 *
 * 优化:
 * 1. ErrorBoundary - 错误边界保护
 * 2. LoadingState - 统一加载状态
 * 3. 快捷键支持 - Ctrl+R 刷新当前标签页
 * 4. 页面标题优化 - 动态更新页面标题
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, Card, Tooltip, Button, Space, message } from 'antd';
import {
  SettingOutlined,
  TeamOutlined,
  SafetyOutlined,
  TrophyOutlined,
  DollarOutlined,
  GlobalOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { NEUTRAL_LIGHT } from '@/theme';
import SiteSettingsTab from './components/SiteSettingsTab';
import PageContentsTab from './components/PageContentsTab';
import JobPositionsTab from './components/JobPositionsTab';
import LegalDocumentsTab from './components/LegalDocumentsTab';
import CaseStudiesTab from './components/CaseStudiesTab';
import PricingPlansTab from './components/PricingPlansTab';
import { useQueryClient } from '@tanstack/react-query';

// 标签页配置
const tabConfig = [
  {
    key: 'page-contents',
    label: '官网内容',
    icon: <GlobalOutlined />,
    queryKey: 'cms-page-contents',
    title: '官网内容管理',
  },
  {
    key: 'settings',
    label: '网站设置',
    icon: <SettingOutlined />,
    queryKey: 'cms-site-settings',
    title: '网站设置',
  },
  {
    key: 'jobs',
    label: '招聘职位',
    icon: <TeamOutlined />,
    queryKey: 'cms-job-positions',
    title: '招聘职位管理',
  },
  {
    key: 'legal',
    label: '法律文档',
    icon: <SafetyOutlined />,
    queryKey: 'cms-legal-documents',
    title: '法律文档管理',
  },
  {
    key: 'cases',
    label: '客户案例',
    icon: <TrophyOutlined />,
    queryKey: 'cms-case-studies',
    title: '客户案例管理',
  },
  {
    key: 'pricing',
    label: '定价方案',
    icon: <DollarOutlined />,
    queryKey: 'cms-pricing-plans',
    title: '定价方案管理',
  },
];

/**
 * CMS 内容管理页面组件
 */
const CmsManagementContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('page-contents');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // 获取当前标签页配置
  const currentTabConfig = tabConfig.find((t) => t.key === activeTab);

  // 页面标题更新
  useEffect(() => {
    const baseTitle = 'CMS 内容管理';
    const tabTitle = currentTabConfig?.title || '';
    document.title = tabTitle ? `${tabTitle} - ${baseTitle}` : baseTitle;

    // 组件卸载时恢复默认标题
    return () => {
      document.title = '云手机管理后台';
    };
  }, [currentTabConfig]);

  // 刷新当前标签页数据
  const handleRefresh = useCallback(async () => {
    if (!currentTabConfig?.queryKey) return;

    setIsRefreshing(true);
    try {
      // 使所有相关查询失效并重新获取
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && queryKey[0]?.toString().startsWith('cms-');
        },
      });
      message.success('刷新成功');
    } catch (error) {
      message.error('刷新失败，请稍后重试');
    } finally {
      setIsRefreshing(false);
    }
  }, [currentTabConfig, queryClient]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+R 或 Cmd+R 刷新当前标签页
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRefresh]);

  // 构建标签页项
  const items = tabConfig.map((tab) => ({
    key: tab.key,
    label: (
      <span>
        {tab.icon}
        {tab.label}
      </span>
    ),
    children: (
      <ErrorBoundary boundaryName={`CMS-${tab.key}`}>
        {tab.key === 'page-contents' && <PageContentsTab />}
        {tab.key === 'settings' && <SiteSettingsTab />}
        {tab.key === 'jobs' && <JobPositionsTab />}
        {tab.key === 'legal' && <LegalDocumentsTab />}
        {tab.key === 'cases' && <CaseStudiesTab />}
        {tab.key === 'pricing' && <PricingPlansTab />}
      </ErrorBoundary>
    ),
  }));

  // 卡片标题组件
  const cardTitle = (
    <Space>
      <span>CMS 内容管理</span>
      <Tooltip title="刷新数据 (Ctrl+R)">
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined spin={isRefreshing} />}
          onClick={handleRefresh}
          loading={isRefreshing}
        />
      </Tooltip>
    </Space>
  );

  return (
    <Card
      title={cardTitle}
      bordered={false}
      extra={
        <span style={{ color: NEUTRAL_LIGHT.text.tertiary, fontSize: 12 }}>
          当前: {currentTabConfig?.title}
        </span>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        tabPosition="left"
        style={{ minHeight: 500 }}
      />
    </Card>
  );
};

/**
 * CMS 内容管理页面（带错误边界）
 */
const CmsManagement: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="CMS-Management">
      <CmsManagementContent />
    </ErrorBoundary>
  );
};

export default CmsManagement;
