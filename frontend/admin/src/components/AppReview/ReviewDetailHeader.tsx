import React from 'react';
import { Button, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface ReviewDetailHeaderProps {
  onBack: () => void;
}

export const ReviewDetailHeader: React.FC<ReviewDetailHeaderProps> = React.memo(({ onBack }) => {
  return (
    <>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={onBack}
        style={{ marginBottom: 24 }}
      >
        返回审核列表
      </Button>
      <Title level={2}>应用审核详情</Title>
    </>
  );
});

ReviewDetailHeader.displayName = 'ReviewDetailHeader';
