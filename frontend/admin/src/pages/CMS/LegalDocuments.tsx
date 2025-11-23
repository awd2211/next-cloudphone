/**
 * 法律文档管理页面
 * 管理隐私政策、服务条款等法律文档
 */
import React from 'react';
import { Card } from 'antd';
import { SafetyOutlined } from '@ant-design/icons';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import LegalDocumentsTab from './components/LegalDocumentsTab';

const LegalDocuments: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="CMS-LegalDocuments">
      <Card
        title={
          <span>
            <SafetyOutlined style={{ marginRight: 8 }} />
            法律文档管理
          </span>
        }
        bordered={false}
      >
        <LegalDocumentsTab />
      </Card>
    </ErrorBoundary>
  );
};

export default LegalDocuments;
