import React from 'react';
import { Card, Skeleton, Space } from 'antd';

const DeviceListSkeleton: React.FC = () => {
  return (
    <Card style={{ margin: '8px', height: '104px' }} bodyStyle={{ padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* 设备截图骨架 */}
        <Skeleton.Avatar active size={80} shape="square" />

        {/* 设备信息骨架 */}
        <div style={{ flex: 1 }}>
          <Skeleton.Input active size="small" style={{ width: 200, marginBottom: '8px' }} />
          <Space size={4}>
            <Skeleton.Button active size="small" style={{ width: 80 }} />
            <Skeleton.Button active size="small" style={{ width: 60 }} />
          </Space>
          <Skeleton.Input active size="small" style={{ width: 150, marginTop: '8px' }} />
        </div>

        {/* 操作按钮骨架 */}
        <Space>
          <Skeleton.Button active size="large" shape="circle" />
          <Skeleton.Button active size="large" shape="circle" />
        </Space>
      </div>
    </Card>
  );
};

export default DeviceListSkeleton;
