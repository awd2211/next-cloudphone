import React, { lazy, Suspense } from 'react';
import { Card, Spin } from 'antd';
import type { DeviceProviderType } from '@/types';

// 懒加载播放器组件
const WebRTCPlayer = lazy(() => import('@/components/WebRTCPlayer'));
const AliyunCloudPhonePlayer = lazy(() => import('@/components/AliyunCloudPhonePlayer'));

interface DevicePlayerCardProps {
  deviceId: string;
  isRunning: boolean;
  providerType?: DeviceProviderType;
  providerInstanceId?: string;
  providerRegion?: string;
}

/**
 * 设备画面卡片组件
 * 根据设备提供商类型和运行状态显示对应的播放器
 *
 * 支持的提供商:
 * - redroid: 使用 WebRTC 播放器
 * - alibaba_ecp: 使用阿里云云手机 SDK
 * - huawei_cph: 华为云手机 (待实现)
 * - physical: 物理设备 (使用 WebRTC)
 */
export const DevicePlayerCard: React.FC<DevicePlayerCardProps> = React.memo(({
  deviceId,
  isRunning,
  providerType = 'redroid',
  providerInstanceId,
  providerRegion = 'cn-hangzhou',
}) => {
  // 设备未运行时显示提示
  if (!isRunning) {
    return (
      <Card title="设备画面">
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          <p style={{ fontSize: 18, marginBottom: 16 }}>设备未运行</p>
          <p>请先启动设备后再查看画面</p>
        </div>
      </Card>
    );
  }

  // 加载状态
  const loadingFallback = (
    <Card title="设备画面">
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" tip="加载播放器..." />
      </div>
    </Card>
  );

  // 根据提供商类型渲染对应的播放器
  switch (providerType) {
    case 'alibaba_ecp':
      // 阿里云云手机
      if (!providerInstanceId) {
        return (
          <Card title="设备画面">
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
              <p>阿里云云手机实例ID缺失</p>
            </div>
          </Card>
        );
      }
      return (
        <Suspense fallback={loadingFallback}>
          <AliyunCloudPhonePlayer
            deviceId={deviceId}
            instanceId={providerInstanceId}
            regionId={providerRegion}
          />
        </Suspense>
      );

    case 'huawei_cph':
      // 华为云手机 (待实现)
      return (
        <Card title="设备画面">
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
            <p>华为云手机播放器待实现</p>
          </div>
        </Card>
      );

    case 'redroid':
    case 'physical':
    default:
      // Redroid 和物理设备使用 WebRTC
      return (
        <Suspense fallback={loadingFallback}>
          <WebRTCPlayer deviceId={deviceId} />
        </Suspense>
      );
  }
});

DevicePlayerCard.displayName = 'DevicePlayerCard';
