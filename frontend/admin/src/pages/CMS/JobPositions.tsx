/**
 * 招聘职位管理页面
 * 管理官网的招聘职位信息
 */
import React from 'react';
import { Card } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import JobPositionsTab from './components/JobPositionsTab';

const JobPositions: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="CMS-JobPositions">
      <Card
        title={
          <span>
            <TeamOutlined style={{ marginRight: 8 }} />
            招聘职位管理
          </span>
        }
        bordered={false}
      >
        <JobPositionsTab />
      </Card>
    </ErrorBoundary>
  );
};

export default JobPositions;
