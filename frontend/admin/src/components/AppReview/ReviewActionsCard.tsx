import React from 'react';
import { Card, Space, Button } from 'antd';
import { CheckCircleOutlined, FileTextOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface ReviewActionsCardProps {
  onApprove: () => void;
  onRequestChanges: () => void;
  onReject: () => void;
}

export const ReviewActionsCard: React.FC<ReviewActionsCardProps> = React.memo(
  ({ onApprove, onRequestChanges, onReject }) => {
    return (
      <Card title="审核操作" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            block
            size="large"
            onClick={onApprove}
          >
            批准应用
          </Button>
          <Button
            icon={<FileTextOutlined />}
            block
            size="large"
            onClick={onRequestChanges}
          >
            要求修改
          </Button>
          <Button
            danger
            icon={<CloseCircleOutlined />}
            block
            size="large"
            onClick={onReject}
          >
            拒绝应用
          </Button>
        </Space>
      </Card>
    );
  }
);

ReviewActionsCard.displayName = 'ReviewActionsCard';
