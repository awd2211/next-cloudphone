import React from 'react';
import { Card, Button, Space } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { APP_OPERATIONS_TIPS } from './constants';

interface AppOperationsTabProps {
  deviceStatus: string;
  onStart: () => void;
  onStop: () => void;
  onClearData: () => void;
}

export const AppOperationsTab: React.FC<AppOperationsTabProps> = React.memo(
  ({ deviceStatus, onStart, onStop, onClearData }) => {
    const isRunning = deviceStatus === 'running';

    return (
      <Card>
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={onStart}
            disabled={!isRunning}
          >
            启动应用
          </Button>
          <Button icon={<PauseCircleOutlined />} onClick={onStop} disabled={!isRunning}>
            停止应用
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={onClearData} disabled={!isRunning}>
            清除应用数据
          </Button>
        </Space>
        <div style={{ marginTop: 16, color: '#999' }}>
          <p>💡 提示:</p>
          <ul>
            {APP_OPERATIONS_TIPS.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      </Card>
    );
  }
);

AppOperationsTab.displayName = 'AppOperationsTab';
