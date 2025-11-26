import React from 'react';
import { Card, Space, Button, Badge } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';

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
            <p style={{ margin: '8px 0 0', color: NEUTRAL_LIGHT.text.secondary }}>
              <Badge count={total} style={{ backgroundColor: SEMANTIC.warning.main }} />
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
