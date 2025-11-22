/**
 * CMS 内容管理页面
 * 管理官网的所有可编辑内容
 */
import React, { useState } from 'react';
import { Tabs, Card } from 'antd';
import {
  SettingOutlined,
  FileTextOutlined,
  TeamOutlined,
  SafetyOutlined,
  TrophyOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import SiteSettingsTab from './components/SiteSettingsTab';
import JobPositionsTab from './components/JobPositionsTab';
import LegalDocumentsTab from './components/LegalDocumentsTab';
import CaseStudiesTab from './components/CaseStudiesTab';
import PricingPlansTab from './components/PricingPlansTab';

const CmsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('settings');

  const items = [
    {
      key: 'settings',
      label: (
        <span>
          <SettingOutlined />
          网站设置
        </span>
      ),
      children: <SiteSettingsTab />,
    },
    {
      key: 'jobs',
      label: (
        <span>
          <TeamOutlined />
          招聘职位
        </span>
      ),
      children: <JobPositionsTab />,
    },
    {
      key: 'legal',
      label: (
        <span>
          <SafetyOutlined />
          法律文档
        </span>
      ),
      children: <LegalDocumentsTab />,
    },
    {
      key: 'cases',
      label: (
        <span>
          <TrophyOutlined />
          客户案例
        </span>
      ),
      children: <CaseStudiesTab />,
    },
    {
      key: 'pricing',
      label: (
        <span>
          <DollarOutlined />
          定价方案
        </span>
      ),
      children: <PricingPlansTab />,
    },
  ];

  return (
    <Card title="CMS 内容管理" bordered={false}>
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

export default CmsManagement;
