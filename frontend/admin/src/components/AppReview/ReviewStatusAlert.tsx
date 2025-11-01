import React, { useMemo } from 'react';
import { Alert } from 'antd';
import { getStatusConfig } from '@/utils/appReview';

interface ReviewStatusAlertProps {
  reviewStatus: string;
}

export const ReviewStatusAlert: React.FC<ReviewStatusAlertProps> = React.memo(
  ({ reviewStatus }) => {
    const statusConfig = getStatusConfig(reviewStatus);

    const { type, description } = useMemo(() => {
      let type: 'success' | 'error' | 'warning' | 'info' = 'info';
      let description: string | null = null;

      switch (reviewStatus) {
        case 'approved':
          type = 'success';
          break;
        case 'rejected':
          type = 'error';
          break;
        case 'changes_requested':
          type = 'warning';
          description = '已要求开发者修改，等待重新提交';
          break;
        case 'pending':
          description = '请仔细审核应用内容，确认是否符合平台规范';
          break;
      }

      return { type, description };
    }, [reviewStatus]);

    return (
      <Alert
        message={`当前状态: ${statusConfig.text}`}
        description={description}
        type={type}
        showIcon
        icon={statusConfig.icon}
        style={{ marginBottom: 24 }}
      />
    );
  }
);

ReviewStatusAlert.displayName = 'ReviewStatusAlert';
