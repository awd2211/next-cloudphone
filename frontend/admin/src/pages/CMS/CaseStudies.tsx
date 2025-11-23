/**
 * 客户案例管理页面
 * 管理成功案例展示
 */
import React from 'react';
import { Card } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import CaseStudiesTab from './components/CaseStudiesTab';

const CaseStudies: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="CMS-CaseStudies">
      <Card
        title={
          <span>
            <TrophyOutlined style={{ marginRight: 8 }} />
            客户案例管理
          </span>
        }
        bordered={false}
      >
        <CaseStudiesTab />
      </Card>
    </ErrorBoundary>
  );
};

export default CaseStudies;
