import React from 'react';
import { Card, Space, Button, Badge } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface RefundHeaderProps {
  refundCount: number;
  onRefresh: () => void;
}

export const RefundHeader: React.FC<RefundHeaderProps> = React.memo(
  ({ refundCount, onRefresh }) => {
    return (
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>退款管理</h2>
            <p style={{ margin: '8px 0 0', color: '#666' }}>
              <Badge count={refundCount} style={{ backgroundColor: '#faad14' }} />
              <span style={{ marginLeft: 8 }}>待审核的退款申请</span>
            </p>
          </div>
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
        </Space>
      </Card>
    );
  }
);

RefundHeader.displayName = 'RefundHeader';
