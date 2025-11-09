import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useSocketIO } from './useSocketIO';

/**
 * 计费事件类型
 */
interface BillingEvent {
  userId: string;
  balance?: number;
  amount?: number;
  threshold?: number;
  daysRemaining?: number;
  orderId?: string;
  paymentId?: string;
  paymentMethod?: string;
  newBalance?: number;
  invoiceId?: string;
  month?: string;
  dueDate?: string;
  detectedAt?: string;
  paidAt?: string;
  generatedAt?: string;
}

interface BillingRealtimeOptions {
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
   * 余额不足回调
   */
  onLowBalance?: (event: BillingEvent) => void;

  /**
   * 充值成功回调
   */
  onPaymentSuccess?: (event: BillingEvent) => void;

  /**
   * 账单生成回调
   */
  onInvoiceGenerated?: (event: BillingEvent) => void;
}

/**
 * 计费实时推送 Hook
 *
 * 监听计费相关的 WebSocket 事件并自动刷新 React Query 缓存
 *
 * @example
 * ```tsx
 * const PaymentList = () => {
 *   useRealtimeBilling({
 *     showNotifications: true,
 *     onPaymentSuccess: (event) => {
 *       console.log('充值成功:', event);
 *     },
 *   });
 *
 *   const { data: payments } = usePayments();
 *   // ...
 * };
 * ```
 */
export function useRealtimeBilling(options: BillingRealtimeOptions = {}) {
  const {
    showNotifications = true,
    userId,
    onLowBalance,
    onPaymentSuccess,
    onInvoiceGenerated,
  } = options;

  const { socket, connected } = useSocketIO();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !connected) {
      return;
    }

    // 余额不足事件
    const handleLowBalance = (data: { type: string; data: BillingEvent }) => {
      const event = data.data;

      // 用户过滤
      if (userId && event.userId !== userId) {
        return;
      }

      console.log('[Realtime] 余额不足:', event);

      // 失效相关缓存
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['balance', event.userId] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });

      // 显示通知
      if (showNotifications) {
        message.warning({
          content: `余额不足警告：当前余额 ¥${event.balance?.toFixed(2) || '0.00'}，已低于阈值 ¥${event.threshold?.toFixed(2) || '0.00'}`,
          duration: 5,
        });
      }

      // 触发回调
      onLowBalance?.(event);
    };

    // 充值成功事件
    const handlePaymentSuccess = (data: { type: string; data: BillingEvent }) => {
      const event = data.data;

      // 用户过滤
      if (userId && event.userId !== userId) {
        return;
      }

      console.log('[Realtime] 充值成功:', event);

      // 失效相关缓存
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment', event.paymentId] });
      queryClient.invalidateQueries({ queryKey: ['balance', event.userId] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      // 显示通知
      if (showNotifications) {
        message.success({
          content: `充值成功！金额：¥${event.amount?.toFixed(2) || '0.00'}，新余额：¥${event.newBalance?.toFixed(2) || '0.00'}`,
          duration: 5,
        });
      }

      // 触发回调
      onPaymentSuccess?.(event);
    };

    // 账单生成事件
    const handleInvoiceGenerated = (data: { type: string; data: BillingEvent }) => {
      const event = data.data;

      // 用户过滤
      if (userId && event.userId !== userId) {
        return;
      }

      console.log('[Realtime] 账单生成:', event);

      // 失效相关缓存
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', event.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });

      // 显示通知
      if (showNotifications) {
        message.info({
          content: `新账单已生成：${event.month || '本月'}，金额 ¥${event.amount?.toFixed(2) || '0.00'}`,
          duration: 5,
        });
      }

      // 触发回调
      onInvoiceGenerated?.(event);
    };

    // 监听事件
    socket.on('billing.low_balance', handleLowBalance);
    socket.on('billing.payment_success', handlePaymentSuccess);
    socket.on('billing.invoice_generated', handleInvoiceGenerated);

    console.log('[useRealtimeBilling] 已订阅计费事件');

    // 清理
    return () => {
      socket.off('billing.low_balance', handleLowBalance);
      socket.off('billing.payment_success', handlePaymentSuccess);
      socket.off('billing.invoice_generated', handleInvoiceGenerated);
      console.log('[useRealtimeBilling] 已取消订阅计费事件');
    };
  }, [socket, connected, userId, showNotifications, queryClient, onLowBalance, onPaymentSuccess, onInvoiceGenerated]);

  return {
    connected,
  };
}
