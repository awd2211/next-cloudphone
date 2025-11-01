import React from 'react';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

interface DeviceDetailHeaderProps {
  onBack: () => void;
}

export const DeviceDetailHeader: React.FC<DeviceDetailHeaderProps> = React.memo(
  ({ onBack }) => {
    return (
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
          返回列表
        </Button>
      </div>
    );
  }
);

DeviceDetailHeader.displayName = 'DeviceDetailHeader';
