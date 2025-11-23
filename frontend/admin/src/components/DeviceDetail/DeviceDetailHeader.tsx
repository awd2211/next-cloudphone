import React from 'react';
import { Button, Space, Tag, Tooltip } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';

interface DeviceDetailHeaderProps {
  onBack: () => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export const DeviceDetailHeader: React.FC<DeviceDetailHeaderProps> = React.memo(
  ({ onBack, onRefresh, loading }) => {
    return (
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回列表
          </Button>
          <Tooltip title="快捷键：Escape">
            <Tag color="default">Esc 返回</Tag>
          </Tooltip>
        </Space>
        <Space>
          {onRefresh && (
            <Tooltip title="快捷键：Ctrl+R">
              <Button
                icon={<ReloadOutlined spin={loading} />}
                onClick={onRefresh}
                loading={loading}
              >
                刷新
              </Button>
            </Tooltip>
          )}
          <Tooltip title="使用 Ctrl+1~5 切换 Tab">
            <Tag color="processing">Ctrl+1~5 切换</Tag>
          </Tooltip>
        </Space>
      </div>
    );
  }
);

DeviceDetailHeader.displayName = 'DeviceDetailHeader';
