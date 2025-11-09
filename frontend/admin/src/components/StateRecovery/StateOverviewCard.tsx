import React from 'react';
import { Card, Space , theme } from 'antd';

interface StateOverviewCardProps {
  deviceStates?: {
    total?: number;
    consistent?: number;
    inconsistent?: number;
    recovering?: number;
  };
}

export const StateOverviewCard: React.FC<StateOverviewCardProps> = React.memo(
  ({ deviceStates }) => {
    const { token } = theme.useToken();
    if (!deviceStates) return null;

    return (
      <Card title="设备状态概览" style={{ marginBottom: 16 }}>
        <Space size="large">
          <div>
            <div style={{ color: '#666' }}>总设备数</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {deviceStates.total || 0}
            </div>
          </div>
          <div>
            <div style={{ color: '#666' }}>状态一致</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
              {deviceStates.consistent || 0}
            </div>
          </div>
          <div>
            <div style={{ color: '#666' }}>状态不一致</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
              {deviceStates.inconsistent || 0}
            </div>
          </div>
          <div>
            <div style={{ color: '#666' }}>恢复中</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: token.colorPrimary }}>
              {deviceStates.recovering || 0}
            </div>
          </div>
        </Space>
      </Card>
    );
  }
);

StateOverviewCard.displayName = 'StateOverviewCard';
