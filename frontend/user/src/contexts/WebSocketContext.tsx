import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { message as antMessage } from 'antd';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
}

interface WebSocketContextValue {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  notifications: NotificationMessage[];
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  const connect = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const wsUrl = `${import.meta.env.VITE_WS_URL}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket 连接已建立');
      setIsConnected(true);
      antMessage.success('实时通知已连接');
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('解析 WebSocket 消息失败:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket 连接已关闭');
      setIsConnected(false);

      // 自动重连（5秒后）
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('尝试重新连接 WebSocket...');
        connect();
      }, 5000);
    };
  };

  const handleMessage = (message: WebSocketMessage) => {
    console.log('收到 WebSocket 消息:', message);

    switch (message.type) {
      case 'notification':
        handleNotification(message.data);
        break;
      case 'device-status-changed':
        handleDeviceStatusChange(message.data);
        break;
      case 'order-status-changed':
        handleOrderStatusChange(message.data);
        break;
      case 'payment-success':
        handlePaymentSuccess(message.data);
        break;
      default:
        console.log('未处理的消息类型:', message.type);
    }
  };

  const handleNotification = (data: any) => {
    const notification: NotificationMessage = {
      id: Date.now().toString(),
      type: data.type || 'info',
      title: data.title || '通知',
      message: data.message || '',
      timestamp: new Date().toISOString(),
    };

    setNotifications((prev) => [notification, ...prev].slice(0, 50)); // 最多保留50条

    // 显示 Ant Design 消息
    switch (notification.type) {
      case 'success':
        antMessage.success(notification.message);
        break;
      case 'error':
        antMessage.error(notification.message);
        break;
      case 'warning':
        antMessage.warning(notification.message);
        break;
      default:
        antMessage.info(notification.message);
    }
  };

  const handleDeviceStatusChange = (data: any) => {
    const statusMap: { [key: string]: string } = {
      running: '运行中',
      stopped: '已停止',
      idle: '空闲',
      error: '错误',
    };
    const statusText = statusMap[data.status] || data.status;

    handleNotification({
      type: 'info',
      title: '设备状态变更',
      message: `设备 ${data.deviceName} 状态变更为：${statusText}`,
    });
  };

  const handleOrderStatusChange = (data: any) => {
    const statusMap: { [key: string]: string } = {
      pending: '待支付',
      paid: '已支付',
      cancelled: '已取消',
      refunded: '已退款',
      expired: '已过期',
    };
    const statusText = statusMap[data.status] || data.status;

    handleNotification({
      type: data.status === 'paid' ? 'success' : 'info',
      title: '订单状态变更',
      message: `订单 ${data.orderNo} 状态变更为：${statusText}`,
    });
  };

  const handlePaymentSuccess = (data: any) => {
    handleNotification({
      type: 'success',
      title: '支付成功',
      message: `支付 ¥${data.amount} 成功！`,
    });
  };

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket 未连接，无法发送消息');
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        sendMessage,
        notifications,
        clearNotifications,
        removeNotification,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
