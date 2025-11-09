import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notification } from 'antd';
import { useSocketIO } from './useSocketIO';

/**
 * 配额事件类型
 */
interface QuotaEvent {
  userId: string;
  quotaId: string;
  type: 'updated' | 'alert' | 'exceeded' | 'renewed';
  limits?: Record<string, number>;
  usage?: Record<string, number>;
  usagePercent?: number;
  alertLevel?: 'warning' | 'critical';
  timestamp: string;
}

/**
 * 配额实时推送 Hook
 *
 * 订阅配额相关事件并实时更新 React Query 缓存
 *
 * 监听事件:
 * - quota.updated: 配额更新
 * - quota.alert: 配额告警
 * - quota.exceeded: 配额超额
 * - quota.renewed: 配额续费
 *
 * @param userId 用户 ID（可选，默认监听所有配额事件）
 * @param showNotifications 是否显示通知（默认 true）
 *
 * @example
 * ```tsx
 * const QuotaList = () => {
 *   useRealtimeQuota(); // 开启实时推送
 *   const { data: quotas } = useQuotas();
 *   // ... render
 * };
 * ```
 */
export const useRealtimeQuota = (userId?: string, showNotifications = true) => {
  const { socket, connected } = useSocketIO();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !connected) return;

    console.log('📊 Subscribing to quota realtime updates');

    // 配额更新事件
    const handleQuotaUpdated = (data: { type: string; data: QuotaEvent }) => {
      console.log('📊 Quota updated:', data);

      if (userId && data.data.userId !== userId) {
        return; // 过滤非当前用户的事件
      }

      // 失效相关查询缓存
      queryClient.invalidateQueries({ queryKey: ['quotas'] });
      queryClient.invalidateQueries({ queryKey: ['quota-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['quota-summary'] });

      if (showNotifications) {
        notification.info({
          message: '配额已更新',
          description: `配额 ${data.data.quotaId} 已更新`,
          placement: 'topRight',
          duration: 3,
        });
      }
    };

    // 配额告警事件
    const handleQuotaAlert = (data: { type: string; data: QuotaEvent }) => {
      console.warn('⚠️ Quota alert:', data);

      if (userId && data.data.userId !== userId) {
        return;
      }

      // 失效告警相关缓存
      queryClient.invalidateQueries({ queryKey: ['quota-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['quota-summary'] });

      if (showNotifications) {
        const isCritical =
          data.data.alertLevel === 'critical' || (data.data.usagePercent && data.data.usagePercent >= 95);

        notification[isCritical ? 'error' : 'warning']({
          message: isCritical ? '配额严重告警' : '配额告警',
          description: `配额 ${data.data.quotaId} 使用率达到 ${data.data.usagePercent?.toFixed(1)}%`,
          placement: 'topRight',
          duration: 5,
        });
      }
    };

    // 配额超额事件
    const handleQuotaExceeded = (data: { type: string; data: QuotaEvent }) => {
      console.error('🚨 Quota exceeded:', data);

      if (userId && data.data.userId !== userId) {
        return;
      }

      // 失效所有配额相关缓存
      queryClient.invalidateQueries({ queryKey: ['quotas'] });
      queryClient.invalidateQueries({ queryKey: ['quota-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['quota-summary'] });

      if (showNotifications) {
        notification.error({
          message: '配额已超额',
          description: `配额 ${data.data.quotaId} 已超过限制，请及时处理`,
          placement: 'topRight',
          duration: 0, // 不自动关闭
        });
      }
    };

    // 配额续费事件
    const handleQuotaRenewed = (data: { type: string; data: QuotaEvent }) => {
      console.log('🔄 Quota renewed:', data);

      if (userId && data.data.userId !== userId) {
        return;
      }

      // 失效配额列表缓存
      queryClient.invalidateQueries({ queryKey: ['quotas'] });
      queryClient.invalidateQueries({ queryKey: ['quota-summary'] });

      if (showNotifications) {
        notification.success({
          message: '配额已续费',
          description: `配额 ${data.data.quotaId} 续费成功`,
          placement: 'topRight',
          duration: 3,
        });
      }
    };

    // 监听通知事件
    socket.on('notification', (data) => {
      switch (data.type) {
        case 'quota.updated':
          handleQuotaUpdated(data);
          break;
        case 'quota.alert':
          handleQuotaAlert(data);
          break;
        case 'quota.exceeded':
          handleQuotaExceeded(data);
          break;
        case 'quota.renewed':
          handleQuotaRenewed(data);
          break;
      }
    });

    // 监听消息事件（admin 房间）
    socket.on('message', (data) => {
      switch (data.type) {
        case 'quota.updated':
        case 'quota.alert':
        case 'quota.exceeded':
          // 管理员房间的配额事件
          queryClient.invalidateQueries({ queryKey: ['quotas'] });
          queryClient.invalidateQueries({ queryKey: ['quota-alerts'] });
          break;
      }
    });

    return () => {
      socket.off('notification');
      socket.off('message');
      console.log('📊 Unsubscribed from quota realtime updates');
    };
  }, [socket, connected, userId, showNotifications, queryClient]);

  return { connected };
};
