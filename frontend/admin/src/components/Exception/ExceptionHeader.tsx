import React from 'react';
import { Card, Space, Button, Badge } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface ExceptionHeaderProps {
  total: number;
  onRefresh: () => void;
}

export const ExceptionHeader: React.FC<ExceptionHeaderProps> = React.memo(
  ({ total, onRefresh }) => {
    return (
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>异常支付监控</h2>
            <p style={{ margin: '8px 0 0', color: '#666' }}>
              <Badge count={total} style={{ backgroundColor: '#faad14' }} />
              <span style={{ marginLeft: 8 }}>条异常支付记录</span>
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

ExceptionHeader.displayName = 'ExceptionHeader';
