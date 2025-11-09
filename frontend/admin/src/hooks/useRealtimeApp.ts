import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useSocketIO } from './useSocketIO';

/**
 * 应用事件类型
 */
interface AppEvent {
  userId: string;
  appId: string;
  appName: string;
  deviceId: string;
  deviceName?: string;
  version?: string;
  oldVersion?: string;
  newVersion?: string;
  reason?: string;
  installedAt?: string;
  failedAt?: string;
  updatedAt?: string;
}

interface AppRealtimeOptions {
  /**
   * 是否显示通知
   * @default true
   */
  showNotifications?: boolean;

  /**
   * 用户 ID 过滤（仅处理该用户的事件）
   */
  userId?: string;

  /**
   * 设备 ID 过滤（仅处理该设备的事件）
   */
  deviceId?: string;

  /**
   * 应用安装成功回调
   */
  onAppInstalled?: (event: AppEvent) => void;

  /**
   * 应用安装失败回调
   */
  onAppInstallFailed?: (event: AppEvent) => void;

  /**
   * 应用更新成功回调
   */
  onAppUpdated?: (event: AppEvent) => void;
}

/**
 * 应用实时推送 Hook
 *
 * 监听应用相关的 WebSocket 事件并自动刷新 React Query 缓存
 *
 * @example
 * ```tsx
 * const AppList = () => {
 *   useRealtimeApp({
 *     showNotifications: true,
 *     onAppInstalled: (event) => {
 *       console.log('应用安装成功:', event);
 *     },
 *   });
 *
 *   const { data: apps } = useApps();
 *   // ...
 * };
 * ```
 */
export function useRealtimeApp(options: AppRealtimeOptions = {}) {
  const {
    showNotifications = true,
    userId,
    deviceId,
    onAppInstalled,
    onAppInstallFailed,
    onAppUpdated,
  } = options;

  const { socket, connected } = useSocketIO();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !connected) {
      return;
    }

    // 应用安装成功事件
    const handleAppInstalled = (data: { type: string; data: AppEvent }) => {
      const event = data.data;

      // 用户过滤
      if (userId && event.userId !== userId) {
        return;
      }

      // 设备过滤
      if (deviceId && event.deviceId !== deviceId) {
        return;
      }

      console.log('[Realtime] 应用安装成功:', event);

      // 失效相关缓存
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      queryClient.invalidateQueries({ queryKey: ['app', event.appId] });
      queryClient.invalidateQueries({ queryKey: ['device-apps', event.deviceId] });
      queryClient.invalidateQueries({ queryKey: ['device', event.deviceId] });

      // 显示通知
      if (showNotifications) {
        message.success({
          content: `应用安装成功：${event.appName} ${event.version ? `v${event.version}` : ''}`,
          duration: 5,
        });
      }

      // 触发回调
      onAppInstalled?.(event);
    };

    // 应用安装失败事件
    const handleAppInstallFailed = (data: { type: string; data: AppEvent }) => {
      const event = data.data;

      // 用户过滤
      if (userId && event.userId !== userId) {
        return;
      }

      // 设备过滤
      if (deviceId && event.deviceId !== deviceId) {
        return;
      }

      console.log('[Realtime] 应用安装失败:', event);

      // 失效相关缓存
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      queryClient.invalidateQueries({ queryKey: ['device-apps', event.deviceId] });

      // 显示通知
      if (showNotifications) {
        message.error({
          content: `应用安装失败：${event.appName}${event.reason ? ` - ${event.reason}` : ''}`,
          duration: 5,
        });
      }

      // 触发回调
      onAppInstallFailed?.(event);
    };

    // 应用更新成功事件
    const handleAppUpdated = (data: { type: string; data: AppEvent }) => {
      const event = data.data;

      // 用户过滤
      if (userId && event.userId !== userId) {
        return;
      }

      // 设备过滤
      if (deviceId && event.deviceId !== deviceId) {
        return;
      }

      console.log('[Realtime] 应用更新成功:', event);

      // 失效相关缓存
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      queryClient.invalidateQueries({ queryKey: ['app', event.appId] });
      queryClient.invalidateQueries({ queryKey: ['device-apps', event.deviceId] });

      // 显示通知
      if (showNotifications) {
        const versionInfo = event.oldVersion && event.newVersion
          ? ` (${event.oldVersion} → ${event.newVersion})`
          : '';
        message.success({
          content: `应用更新成功：${event.appName}${versionInfo}`,
          duration: 5,
        });
      }

      // 触发回调
      onAppUpdated?.(event);
    };

    // 监听事件
    socket.on('app.installed', handleAppInstalled);
    socket.on('app.install_failed', handleAppInstallFailed);
    socket.on('app.updated', handleAppUpdated);

    console.log('[useRealtimeApp] 已订阅应用事件');

    // 清理
    return () => {
      socket.off('app.installed', handleAppInstalled);
      socket.off('app.install_failed', handleAppInstallFailed);
      socket.off('app.updated', handleAppUpdated);
      console.log('[useRealtimeApp] 已取消订阅应用事件');
    };
  }, [socket, connected, userId, deviceId, showNotifications, queryClient, onAppInstalled, onAppInstallFailed, onAppUpdated]);

  return {
    connected,
  };
}
