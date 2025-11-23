/**
 * 定价方案管理页面
 * 管理产品定价和套餐信息
 */
import React from 'react';
import { Card } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import PricingPlansTab from './components/PricingPlansTab';

const PricingPlans: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="CMS-PricingPlans">
      <Card
        title={
          <span>
            <DollarOutlined style={{ marginRight: 8 }} />
            定价方案管理
          </span>
        }
        bordered={false}
      >
        <PricingPlansTab />
      </Card>
    </ErrorBoundary>
  );
};

export default PricingPlans;
