/**
 * 网站设置管理页面
 * 管理网站的全局配置
 */
import React from 'react';
import { Card } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import SiteSettingsTab from './components/SiteSettingsTab';

const SiteSettings: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="CMS-SiteSettings">
      <Card
        title={
          <span>
            <SettingOutlined style={{ marginRight: 8 }} />
            网站设置
          </span>
        }
        bordered={false}
      >
        <SiteSettingsTab />
      </Card>
    </ErrorBoundary>
  );
};

export default SiteSettings;
