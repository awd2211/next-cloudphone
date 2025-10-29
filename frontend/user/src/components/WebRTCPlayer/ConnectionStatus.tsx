import React from 'react';
import { Tag, Tooltip, Space } from 'antd';
import {
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { WebRTCConnectionState, WebRTCQuality } from '../../hooks/useWebRTC';

interface ConnectionStatusProps {
  state: WebRTCConnectionState;
  quality?: WebRTCQuality;
  rtt?: number;
  retryCount?: number;
}

const stateConfig = {
  [WebRTCConnectionState.IDLE]: {
    text: '未连接',
    color: 'default',
    icon: <CloseCircleOutlined />,
  },
  [WebRTCConnectionState.CONNECTING]: {
    text: '连接中',
    color: 'processing',
    icon: <LoadingOutlined />,
  },
  [WebRTCConnectionState.CONNECTED]: {
    text: '已连接',
    color: 'success',
    icon: <CheckCircleOutlined />,
  },
  [WebRTCConnectionState.DISCONNECTED]: {
    text: '已断开',
    color: 'warning',
    icon: <WarningOutlined />,
  },
  [WebRTCConnectionState.FAILED]: {
    text: '连接失败',
    color: 'error',
    icon: <CloseCircleOutlined />,
  },
  [WebRTCConnectionState.RECONNECTING]: {
    text: '重连中',
    color: 'processing',
    icon: <SyncOutlined spin />,
  },
};

const qualityConfig = {
  [WebRTCQuality.EXCELLENT]: { text: '优秀', color: 'success' },
  [WebRTCQuality.GOOD]: { text: '良好', color: 'success' },
  [WebRTCQuality.FAIR]: { text: '一般', color: 'warning' },
  [WebRTCQuality.POOR]: { text: '较差', color: 'warning' },
  [WebRTCQuality.BAD]: { text: '很差', color: 'error' },
};

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  state,
  quality,
  rtt,
  retryCount,
}) => {
  const config = stateConfig[state];

  const tooltipContent = (
    <div>
      <div>连接状态: {config.text}</div>
      {quality && <div>网络质量: {qualityConfig[quality].text}</div>}
      {rtt !== undefined && <div>延迟: {Math.round(rtt)}ms</div>}
      {retryCount !== undefined && retryCount > 0 && <div>重试次数: {retryCount}</div>}
    </div>
  );

  return (
    <Tooltip title={tooltipContent}>
      <Space size="small">
        <Tag color={config.color} icon={config.icon}>
          {config.text}
        </Tag>
        {quality && state === WebRTCConnectionState.CONNECTED && (
          <Tag color={qualityConfig[quality].color}>{qualityConfig[quality].text}</Tag>
        )}
      </Space>
    </Tooltip>
  );
};

export default ConnectionStatus;
