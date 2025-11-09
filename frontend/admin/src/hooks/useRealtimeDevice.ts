import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notification } from 'antd';
import { useSocketIO } from './useSocketIO';

/**
 * 设备状态变更事件
 */
interface DeviceStatusChangedEvent {
  deviceId: string;
  deviceName: string;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
}

/**
 * 设备实时推送 Hook
 *
 * 订阅设备相关事件并实时更新 React Query 缓存
 *
 * 监听事件:
 * - device.status.changed: 设备状态变更
 * - device.created: 设备创建
 * - device.deleted: 设备删除
 *
 * @param options 配置选项
 * @param options.userId 用户 ID（可选，默认监听所有设备事件）
 * @param options.showNotifications 是否显示通知（默认 false，避免过多通知）
 * @param options.onStatusChanged 状态变更回调
 *
 * @example
 * ```tsx
 * const DeviceList = () => {
 *   useRealtimeDevice({
 *     showNotifications: false, // 不显示通知
 *     onStatusChanged: (event) => {
 *       console.log('Device status changed:', event);
 *     },
 *   });
 *
 *   const { data: devices } = useDeviceList();
 *   // ... render
 * };
 * ```
 */
export const useRealtimeDevice = (options?: {
  userId?: string;
  showNotifications?: boolean;
  onStatusChanged?: (event: DeviceStatusChangedEvent) => void;
}) => {
  const { userId, showNotifications = false, onStatusChanged } = options || {};
  const { socket, connected } = useSocketIO();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !connected) return;

    console.log('🖥️ Subscribing to device realtime updates');

    // 设备状态变更事件
    const handleDeviceStatusChanged = (data: { type: string; data: DeviceStatusChangedEvent }) => {
      console.log('🖥️ Device status changed:', data);

      // 乐观更新设备列表缓存
      queryClient.setQueriesData({ queryKey: ['devices'] }, (oldData: any) => {
        if (!oldData) return oldData;

        // 处理无限查询数据结构
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              items: page.items.map((device: any) =>
                device.id === data.data.deviceId
                  ? { ...device, status: data.data.newStatus, updatedAt: data.data.timestamp }
                  : device
              ),
            })),
          };
        }

        // 处理普通数组数据结构
        if (Array.isArray(oldData)) {
          return oldData.map((device: any) =>
            device.id === data.data.deviceId
              ? { ...device, status: data.data.newStatus, updatedAt: data.data.timestamp }
              : device
          );
        }

        return oldData;
      });

      // 失效设备详情缓存
      queryClient.invalidateQueries({ queryKey: ['device', data.data.deviceId] });

      // 调用回调
      if (onStatusChanged) {
        onStatusChanged(data.data);
      }

      // 显示通知（可选）
      if (showNotifications) {
        const statusText = {
          running: '运行中',
          stopped: '已停止',
          error: '故障',
          creating: '创建中',
        };

        notification.info({
          message: '设备状态变更',
          description: `${data.data.deviceName} 状态变为: ${statusText[data.data.newStatus] || data.data.newStatus}`,
          placement: 'bottomRight',
          duration: 2,
        });
      }
    };

    // 设备创建通知
    const handleDeviceCreated = (data: any) => {
      console.log('✨ Device created:', data);

      // 失效设备列表缓存
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device-stats'] });

      if (showNotifications) {
        notification.success({
          message: '设备创建成功',
          description: data.data?.deviceName || '新设备已创建',
          placement: 'bottomRight',
          duration: 3,
        });
      }
    };

    // 设备删除通知
    const handleDeviceDeleted = (data: any) => {
      console.log('🗑️ Device deleted:', data);

      // 失效设备列表缓存
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device-stats'] });

      // 移除设备详情缓存
      if (data.data?.deviceId) {
        queryClient.removeQueries({ queryKey: ['device', data.data.deviceId] });
      }

      if (showNotifications) {
        notification.info({
          message: '设备已删除',
          description: data.data?.deviceName || '设备已被删除',
          placement: 'bottomRight',
          duration: 2,
        });
      }
    };

    // 监听通知事件
    socket.on('notification', (data) => {
      // 过滤用户
      if (userId && data.data?.userId && data.data.userId !== userId) {
        return;
      }

      switch (data.type) {
        case 'device.status.changed':
          handleDeviceStatusChanged(data);
          break;
        case 'device.created':
          handleDeviceCreated(data);
          break;
        case 'device.deleted':
          handleDeviceDeleted(data);
          break;
      }
    });

    // 监听消息事件（admin 房间）
    socket.on('message', (data) => {
      switch (data.type) {
        case 'device.status.changed':
          handleDeviceStatusChanged(data);
          break;
        case 'device.created':
        case 'device.deleted':
          // 管理员房间的设备事件
          queryClient.invalidateQueries({ queryKey: ['devices'] });
          queryClient.invalidateQueries({ queryKey: ['device-stats'] });
          break;
      }
    });

    return () => {
      socket.off('notification');
      socket.off('message');
      console.log('🖥️ Unsubscribed from device realtime updates');
    };
  }, [socket, connected, userId, showNotifications, onStatusChanged, queryClient]);

  return { connected };
};
