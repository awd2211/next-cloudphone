import React from 'react';
import { Card, Steps } from 'antd';
import dayjs from 'dayjs';
import { BillStatus, type Bill } from '@/services/billing';
import { getStatusStep } from '@/utils/billingConfig';

const { Step } = Steps;

interface BillStatusStepsProps {
  bill: Bill;
}

/**
 * 账单状态步骤组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 使用配置函数 getStatusStep 计算当前步骤
 */
export const BillStatusSteps: React.FC<BillStatusStepsProps> = React.memo(({ bill }) => {
  return (
    <Card style={{ marginBottom: 16 }}>
      <Steps current={getStatusStep(bill.status)}>
        <Step title="待支付" description={dayjs(bill.createdAt).format('YYYY-MM-DD HH:mm')} />
        <Step
          title="已支付"
          description={bill.paidAt ? dayjs(bill.paidAt).format('YYYY-MM-DD HH:mm') : undefined}
        />
        {bill.status === BillStatus.REFUNDED && <Step title="已退款" description="退款完成" />}
      </Steps>
    </Card>
  );
});

BillStatusSteps.displayName = 'BillStatusSteps';
