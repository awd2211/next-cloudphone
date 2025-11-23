/**
 * 官网内容管理页面
 * 管理首页各区块的可配置内容
 */
import React from 'react';
import { Card } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import PageContentsTab from './components/PageContentsTab';

const PageContents: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="CMS-PageContents">
      <Card
        title={
          <span>
            <GlobalOutlined style={{ marginRight: 8 }} />
            官网内容管理
          </span>
        }
        bordered={false}
      >
        <PageContentsTab />
      </Card>
    </ErrorBoundary>
  );
};

export default PageContents;
