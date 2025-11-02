import React from 'react';
import { Card } from 'antd';
import WebRTCPlayer from '@/components/WebRTCPlayer';

interface DevicePlayerCardProps {
  deviceId: string;
  isRunning: boolean;
}

/**
 * 设备画面卡片组件
 * 根据设备运行状态显示 WebRTC 播放器或提示信息
 */
export const DevicePlayerCard: React.FC<DevicePlayerCardProps> = React.memo(({
  deviceId,
  isRunning,
}) => {
  if (isRunning) {
    return <WebRTCPlayer deviceId={deviceId} />;
  }

  return (
    <Card title="设备画面">
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
        <p style={{ fontSize: 18, marginBottom: 16 }}>设备未运行</p>
        <p>请先启动设备后再查看画面</p>
      </div>
    </Card>
  );
});

DevicePlayerCard.displayName = 'DevicePlayerCard';
